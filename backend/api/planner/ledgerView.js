'use strict';

const { projectPlannerCommercialLedger, reportedCash } = require('./commercialLedger');

const ACTIVE_ORDER_STATUSES = new Set(['booked', 'fulfilled']);
const RECEIVABLE_STATUSES = new Set(['issued', 'partially_paid', 'overdue']);
const COMMITTED_COST_STATUSES = new Set(['committed', 'incurred', 'paid']);
const PAYABLE_STATUSES = new Set(['committed', 'incurred']);

function dateKey(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function inRange(value, from, to) {
  const key = dateKey(value);
  if (!key) return false;
  return (!from || key >= from) && (!to || key <= to);
}

function urgency(value, today) {
  const key = dateKey(value);
  if (!key) return 'date_missing';
  if (key < today) return 'overdue';
  const soon = new Date(`${today}T00:00:00Z`);
  soon.setUTCDate(soon.getUTCDate() + 14);
  return key <= soon.toISOString().slice(0, 10) ? 'due_soon' : 'scheduled';
}

function linkedOrderPredicates(cards) {
  const predicates = [];
  for (const card of cards) {
    const metadata = card.financialMetadata || {};
    if (metadata.commercialOrderId) predicates.push({ id: String(metadata.commercialOrderId) });
    if (metadata.smallEventEstimateId) {
      predicates.push({
        sourceSystem: 'small_events',
        sourceId: String(metadata.smallEventEstimateId),
      });
    }
    if (metadata.commercialSourceSystem && metadata.commercialSourceId) {
      predicates.push({
        sourceSystem: String(metadata.commercialSourceSystem),
        sourceId: String(metadata.commercialSourceId),
      });
    }
  }
  return predicates;
}

function orderBelongsToPlanner(order, plannerUid, linkedIds) {
  return linkedIds.has(order.id) || order.metadata?.plannerUid === plannerUid;
}

function monthBucket(map, value) {
  const key = dateKey(value)?.slice(0, 7);
  if (!key) return null;
  if (!map.has(key)) {
    map.set(key, {
      month: key,
      bookedRevenueCents: 0,
      recurringBillingCents: 0,
      cashInCents: 0,
      receivablesDueCents: 0,
      plannedCostsCents: 0,
      committedCostsCents: 0,
      payablesDueCents: 0,
      cashOutCents: 0,
    });
  }
  return map.get(key);
}

function sum(rows) {
  return rows.reduce((total, row) => total + Number(row.amountCents || 0), 0);
}

async function buildPlannerLedger({
  prisma,
  plannerUid,
  from = null,
  to = null,
  now = new Date(),
  refresh = true,
}) {
  if (!prisma) throw new Error('Prisma is required');
  if (!plannerUid) throw new Error('plannerUid is required');
  const projection = refresh
    ? await projectPlannerCommercialLedger({ prisma, plannerUid, horizonEnd: to, now })
    : null;
  const cards = await prisma.plannerCard.findMany({
    where: { supabaseUid: plannerUid },
    select: {
      id: true,
      title: true,
      date: true,
      objectType: true,
      templateId: true,
      cashReceivedCents: true,
      financialMetadata: true,
    },
  });
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const linkedPredicates = linkedOrderPredicates(cards);
  const linkedIds = new Set(linkedPredicates.filter((entry) => entry.id).map((entry) => entry.id));
  const orders = await prisma.commercialOrder.findMany({
    where: {
      OR: [{ sourceSystem: { in: ['planner', 'planner_recurring'] } }, ...linkedPredicates],
    },
    include: {
      invoices: {
        include: {
          allocations: { include: { transaction: true } },
        },
      },
    },
    orderBy: [{ serviceStartAt: 'asc' }, { createdAt: 'asc' }],
  });
  const resolvedLinkedIds = new Set([
    ...linkedIds,
    ...orders
      .filter((order) =>
        linkedPredicates.some(
          (predicate) =>
            (predicate.id && predicate.id === order.id) ||
            (predicate.sourceSystem === order.sourceSystem && predicate.sourceId === order.sourceId)
        )
      )
      .map((order) => order.id),
  ]);
  const plannerOrders = orders.filter((order) =>
    orderBelongsToPlanner(order, plannerUid, resolvedLinkedIds)
  );
  const obligations = (
    await prisma.financeCostObligation.findMany({
      where: { sourceSystem: { in: ['planner', 'planner_cogs'] } },
      include: { payments: true },
      orderBy: [{ dueAt: 'asc' }, { serviceAt: 'asc' }, { createdAt: 'asc' }],
    })
  ).filter((obligation) => obligation.metadata?.plannerUid === plannerUid);

  const today = now.toISOString().slice(0, 10);
  const bookedRevenue = [];
  const receivables = [];
  const recurringBilling = [];
  const cashByTransaction = new Map();

  for (const order of plannerOrders) {
    const plannerCardId = order.metadata?.plannerCardId || null;
    const card = plannerCardId ? cardsById.get(plannerCardId) : null;
    const occurrenceDate = order.serviceStartAt;
    if (ACTIVE_ORDER_STATUSES.has(order.status) && inRange(occurrenceDate, from, to)) {
      bookedRevenue.push({
        id: order.id,
        plannerCardId,
        title: card?.title || order.customerName || order.sourceId,
        customerName: order.customerName,
        date: dateKey(occurrenceDate),
        amountCents: order.totalCents,
        recurring: order.sourceSystem === 'planner_recurring',
        status: order.status,
        sourceSystem: order.sourceSystem,
        sourceId: order.sourceId,
      });
    }

    for (const invoice of order.invoices || []) {
      if (
        RECEIVABLE_STATUSES.has(invoice.status) &&
        invoice.outstandingCents > 0 &&
        inRange(invoice.dueAt, from, to)
      ) {
        receivables.push({
          id: invoice.id,
          orderId: order.id,
          plannerCardId,
          title: card?.title || order.customerName || order.sourceId,
          customerName: order.customerName,
          dueDate: dateKey(invoice.dueAt),
          amountCents: invoice.outstandingCents,
          totalCents: invoice.totalCents,
          status: invoice.status,
          urgency: urgency(invoice.dueAt, today),
          sourceSystem: invoice.sourceSystem,
          sourceId: invoice.sourceId,
          evidenceState: invoice.metadata?.reportedCashEvidenceState || null,
        });
      }
      if (
        order.sourceSystem === 'planner_recurring' &&
        invoice.status !== 'void' &&
        inRange(invoice.dueAt, from, to)
      ) {
        recurringBilling.push({
          id: invoice.id,
          orderId: order.id,
          title: order.customerName || order.sourceId,
          date: dateKey(invoice.dueAt),
          amountCents: invoice.totalCents,
          outstandingCents: invoice.outstandingCents,
          status: invoice.status,
          sourceId: invoice.sourceId,
        });
      }
      for (const allocation of invoice.allocations || []) {
        const transaction = allocation.transaction;
        if (!transaction || !inRange(transaction.occurredAt, from, to)) continue;
        const current = cashByTransaction.get(transaction.id) || {
          id: transaction.id,
          date: dateKey(transaction.occurredAt),
          amountCents: 0,
          grossCents: transaction.grossCents,
          provider: transaction.provider,
          externalPaymentId: transaction.externalPaymentId,
          status: transaction.status,
          title: card?.title || order.customerName || order.sourceId,
          plannerCardId,
          sourceSystem: order.sourceSystem,
        };
        current.amountCents += allocation.amountCents;
        if (transaction.metadata?.plannerCardId) current.amountCents = transaction.grossCents;
        cashByTransaction.set(transaction.id, current);
      }
    }
  }

  const plannerReportedTransactions = await prisma.financePaymentTransaction.findMany({
    where: { provider: 'planner_reported' },
    orderBy: { occurredAt: 'asc' },
  });
  for (const transaction of plannerReportedTransactions) {
    const card = cardsById.get(transaction.metadata?.plannerCardId);
    if (!card || !inRange(transaction.occurredAt, from, to)) continue;
    cashByTransaction.set(transaction.id, {
      id: transaction.id,
      date: dateKey(transaction.occurredAt),
      amountCents: transaction.grossCents,
      grossCents: transaction.grossCents,
      provider: transaction.provider,
      externalPaymentId: transaction.externalPaymentId,
      status: transaction.status,
      title: card.title,
      plannerCardId: card.id,
      sourceSystem: 'planner',
    });
  }
  const cashIn = [...cashByTransaction.values()].sort((a, b) => a.date.localeCompare(b.date));

  const reportedUndatedCash = cards
    .filter((card) => card.objectType === 'event')
    .map((card) => ({ card, cash: reportedCash(card) }))
    .filter(({ cash }) => cash.amountCents > 0 && !cash.occurredAt)
    .map(({ card, cash }) => ({
      id: card.id,
      plannerCardId: card.id,
      title: card.title,
      serviceDate: card.date,
      amountCents: cash.amountCents,
      evidenceState: cash.evidenceState,
      reference: cash.reference,
      action: 'add_payment_date_or_source',
    }));

  const plannedCosts = [];
  const committedCosts = [];
  const payables = [];
  const cashOut = [];
  const reportedUndatedCostPayments = [];
  for (const obligation of obligations) {
    const row = {
      id: obligation.id,
      plannerCardId: obligation.plannerCardId,
      orderId: obligation.commercialOrderId,
      title: obligation.description,
      counterpartyName: obligation.counterpartyName,
      date: dateKey(obligation.serviceAt || obligation.committedAt),
      dueDate: dateKey(obligation.dueAt),
      amountCents: obligation.amountCents,
      outstandingCents: obligation.outstandingCents,
      status: obligation.status,
      sourceSystem: obligation.sourceSystem,
      sourceId: obligation.sourceId,
      evidenceState: obligation.metadata?.paymentEvidenceState || null,
    };
    if (
      obligation.status === 'planned' &&
      inRange(obligation.serviceAt || obligation.dueAt, from, to)
    )
      plannedCosts.push(row);
    if (
      COMMITTED_COST_STATUSES.has(obligation.status) &&
      inRange(obligation.serviceAt || obligation.committedAt || obligation.dueAt, from, to)
    )
      committedCosts.push(row);
    if (
      PAYABLE_STATUSES.has(obligation.status) &&
      obligation.outstandingCents > 0 &&
      inRange(obligation.dueAt, from, to)
    ) {
      payables.push({ ...row, urgency: urgency(obligation.dueAt, today) });
    }
    if (
      obligation.status === 'paid' &&
      !(obligation.payments || []).length &&
      obligation.metadata?.paymentEvidenceState === 'undated_report'
    ) {
      reportedUndatedCostPayments.push({ ...row, action: 'add_payment_date_or_source' });
    }
    for (const payment of obligation.payments || []) {
      if (!inRange(payment.occurredAt, from, to)) continue;
      cashOut.push({
        id: payment.id,
        obligationId: obligation.id,
        title: obligation.description,
        counterpartyName: obligation.counterpartyName,
        date: dateKey(payment.occurredAt),
        amountCents: payment.amountCents,
        provider: payment.provider,
        externalPaymentId: payment.externalPaymentId,
        status: payment.status,
      });
    }
  }

  const months = new Map();
  for (const row of bookedRevenue) {
    const bucket = monthBucket(months, row.date);
    if (bucket) {
      bucket.bookedRevenueCents += row.amountCents;
      if (row.recurring) bucket.recurringBillingCents += row.amountCents;
    }
  }
  for (const row of cashIn) {
    const bucket = monthBucket(months, row.date);
    if (bucket) bucket.cashInCents += row.amountCents;
  }
  for (const row of receivables) {
    const bucket = monthBucket(months, row.dueDate);
    if (bucket) bucket.receivablesDueCents += row.amountCents;
  }
  for (const row of plannedCosts) {
    const bucket = monthBucket(months, row.date || row.dueDate);
    if (bucket) bucket.plannedCostsCents += row.amountCents;
  }
  for (const row of committedCosts) {
    const bucket = monthBucket(months, row.date || row.dueDate);
    if (bucket) bucket.committedCostsCents += row.amountCents;
  }
  for (const row of payables) {
    const bucket = monthBucket(months, row.dueDate);
    if (bucket) bucket.payablesDueCents += row.outstandingCents;
  }
  for (const row of cashOut) {
    const bucket = monthBucket(months, row.date);
    if (bucket) bucket.cashOutCents += row.amountCents;
  }

  return {
    ok: projection?.ok !== false,
    generatedAt: new Date().toISOString(),
    currency: 'USD',
    range: { from, to },
    projection,
    totals: {
      bookedRevenueCents: sum(bookedRevenue),
      recurringBillingCents: sum(recurringBilling),
      receivablesCents: sum(receivables),
      cashInCents: sum(cashIn),
      reportedUndatedCashCents: sum(reportedUndatedCash),
      plannedCostsCents: sum(plannedCosts),
      committedCostsCents: sum(committedCosts),
      payablesCents: payables.reduce((total, row) => total + row.outstandingCents, 0),
      cashOutCents: sum(cashOut),
    },
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    bookedRevenue,
    receivables,
    cashIn,
    reportedUndatedCash,
    recurringBilling,
    plannedCosts,
    committedCosts,
    payables,
    cashOut,
    reportedUndatedCostPayments,
  };
}

module.exports = {
  buildPlannerLedger,
};
