'use strict';

const { applyPaymentFifo, recordPaymentTransaction } = require('../finance/receivables');
const { settleInvoiceFromAllocations } = require('../finance/paymentAttempts');
const { addMonths, billingOccurrences, isIsoDate } = require('./billingSchedule');

const EVENT_SOURCE = 'planner';
const RECURRING_SOURCE = 'planner_recurring';
const BUSINESS_LINE_EVENTS = 'events';
const BUSINESS_LINE_MEAL_PREP = 'meal_prep';
const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'void']);
const QUOTED_STATUSES = new Set(['inquiry', 'tentative', 'quote', 'quoted', 'draft', 'planned']);
const COMPLETED_STATUSES = new Set(['done', 'completed', 'fulfilled']);

function metadataFor(card) {
  return card?.financialMetadata &&
    typeof card.financialMetadata === 'object' &&
    !Array.isArray(card.financialMetadata)
    ? card.financialMetadata
    : {};
}

function integerCents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function cardRevenueCents(card) {
  return card.revenueCents != null
    ? integerCents(card.revenueCents)
    : integerCents(Number(card.revenue || 0) * 100);
}

function cardCostCents(card) {
  return card.costCents != null
    ? integerCents(card.costCents)
    : integerCents(Number(card.cost || 0) * 100);
}

function dateAtNoon(value) {
  if (!isIsoDate(value)) return null;
  return new Date(`${value}T12:00:00Z`);
}

function optionalDate(value) {
  if (!value) return null;
  const date = isIsoDate(value) ? dateAtNoon(value) : new Date(value);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function eventOrderStatus(card) {
  const metadata = metadataFor(card);
  const status = String(card.status || '').toLowerCase();
  const financialStatus = String(card.financialStatus || '').toLowerCase();
  const eventStatus = String(metadata.eventStatus || '').toLowerCase();
  if (
    card.enabled === false ||
    CANCELLED_STATUSES.has(status) ||
    CANCELLED_STATUSES.has(eventStatus)
  )
    return 'cancelled';
  if (COMPLETED_STATUSES.has(status)) return 'fulfilled';
  if (
    QUOTED_STATUSES.has(status) ||
    QUOTED_STATUSES.has(eventStatus) ||
    ['planned', 'quoted'].includes(financialStatus)
  )
    return 'quoted';
  return 'booked';
}

function invoiceBaseStatus(orderStatus) {
  if (orderStatus === 'cancelled') return 'void';
  if (orderStatus === 'quoted') return 'draft';
  return 'issued';
}

function reportedCash(card) {
  const metadata = metadataFor(card);
  const amountCents = integerCents(card.cashReceivedCents);
  const occurredAt = optionalDate(
    metadata.cashReceivedAt || metadata.depositPaidAt || metadata.paymentOccurredAt
  );
  return {
    amountCents,
    occurredAt,
    evidenceState: amountCents > 0 ? (occurredAt ? 'dated_report' : 'undated_report') : 'none',
    reference:
      metadata.squarePaymentId || metadata.paymentReference || metadata.depositInvoiceId || null,
  };
}

function reportedCostPayment(card) {
  const metadata = metadataFor(card);
  const amountCents = integerCents(metadata.costPaidCents);
  const occurredAt = optionalDate(metadata.costPaidAt);
  return {
    amountCents,
    occurredAt,
    reference: metadata.costPaymentId || metadata.costPaymentReference || null,
  };
}

async function explicitlyLinkedOrder(tx, card) {
  const metadata = metadataFor(card);
  if (metadata.commercialOrderId) {
    const order = await tx.commercialOrder.findUnique({
      where: { id: String(metadata.commercialOrderId) },
    });
    if (!order)
      throw new Error(`Linked commercial order ${metadata.commercialOrderId} does not exist`);
    return order;
  }
  if (metadata.smallEventEstimateId) {
    const order = await tx.commercialOrder.findUnique({
      where: {
        sourceSystem_sourceId: {
          sourceSystem: 'small_events',
          sourceId: String(metadata.smallEventEstimateId),
        },
      },
    });
    if (!order)
      throw new Error(
        `Linked small-event estimate ${metadata.smallEventEstimateId} has no commercial order`
      );
    return order;
  }
  if (metadata.commercialSourceSystem && metadata.commercialSourceId) {
    const order = await tx.commercialOrder.findUnique({
      where: {
        sourceSystem_sourceId: {
          sourceSystem: String(metadata.commercialSourceSystem),
          sourceId: String(metadata.commercialSourceId),
        },
      },
    });
    if (!order) throw new Error('Linked commercial source has no commercial order');
    return order;
  }
  return null;
}

async function projectEventCost(tx, card, commercialOrderId, orderStatus) {
  const amountCents = cardCostCents(card);
  const sourceId = `${card.id}:cost`;
  if (amountCents <= 0) {
    await tx.financeCostObligation.updateMany({
      where: { sourceSystem: EVENT_SOURCE, sourceId },
      data: { status: 'void', outstandingCents: 0 },
    });
    return null;
  }

  const metadata = metadataFor(card);
  const payment = reportedCostPayment(card);
  const explicitStatus = String(metadata.costStatus || '').toLowerCase();
  const baseStatus = ['planned', 'committed', 'incurred', 'paid', 'void'].includes(explicitStatus)
    ? explicitStatus
    : orderStatus === 'cancelled'
      ? 'void'
      : orderStatus === 'quoted'
        ? 'planned'
        : orderStatus === 'fulfilled'
          ? 'incurred'
          : 'committed';
  const serviceAt = dateAtNoon(card.date);
  const obligation = await tx.financeCostObligation.upsert({
    where: { sourceSystem_sourceId: { sourceSystem: EVENT_SOURCE, sourceId } },
    update: {
      commercialOrderId,
      plannerCardId: card.id,
      status: baseStatus,
      counterpartyName: metadata.costCounterparty || metadata.vendorName || null,
      description: metadata.costDescription || `Costs for ${card.title}`,
      amountCents,
      outstandingCents: baseStatus === 'void' ? 0 : amountCents,
      committedAt: optionalDate(metadata.costCommittedAt),
      serviceAt,
      dueAt: optionalDate(metadata.costDueDate) || serviceAt,
      metadata: {
        plannerUid: card.supabaseUid,
        source: card.financialSource || null,
        paymentEvidenceState:
          payment.amountCents > 0
            ? payment.occurredAt
              ? 'dated_report'
              : 'undated_report'
            : 'none',
        paymentReference: payment.reference,
      },
    },
    create: {
      commercialOrderId,
      plannerCardId: card.id,
      obligationType: 'event_cost',
      status: baseStatus,
      counterpartyName: metadata.costCounterparty || metadata.vendorName || null,
      description: metadata.costDescription || `Costs for ${card.title}`,
      amountCents,
      outstandingCents: baseStatus === 'void' ? 0 : amountCents,
      committedAt: optionalDate(metadata.costCommittedAt),
      serviceAt,
      dueAt: optionalDate(metadata.costDueDate) || serviceAt,
      sourceSystem: EVENT_SOURCE,
      sourceId,
      metadata: {
        plannerUid: card.supabaseUid,
        source: card.financialSource || null,
        paymentEvidenceState:
          payment.amountCents > 0
            ? payment.occurredAt
              ? 'dated_report'
              : 'undated_report'
            : 'none',
        paymentReference: payment.reference,
      },
    },
  });

  const externalPaymentId = `planner-card:${card.id}:reported-cost`;
  if (payment.amountCents > 0 && payment.occurredAt && baseStatus !== 'void') {
    await tx.financeCostPayment.upsert({
      where: { provider_externalPaymentId: { provider: 'planner_reported', externalPaymentId } },
      update: {
        obligationId: obligation.id,
        amountCents: payment.amountCents,
        occurredAt: payment.occurredAt,
        metadata: { reference: payment.reference, evidence: 'owner_reported' },
      },
      create: {
        obligationId: obligation.id,
        provider: 'planner_reported',
        externalPaymentId,
        amountCents: payment.amountCents,
        occurredAt: payment.occurredAt,
        metadata: { reference: payment.reference, evidence: 'owner_reported' },
      },
    });
  } else if (!payment.amountCents || !payment.occurredAt) {
    await tx.financeCostPayment.deleteMany({
      where: { provider: 'planner_reported', externalPaymentId },
    });
  }

  const paid = await tx.financeCostPayment.aggregate({
    where: { obligationId: obligation.id, status: 'completed' },
    _sum: { amountCents: true },
  });
  const paidCents = integerCents(paid?._sum?.amountCents);
  const outstandingCents = baseStatus === 'void' ? 0 : Math.max(0, amountCents - paidCents);
  return tx.financeCostObligation.update({
    where: { id: obligation.id },
    data: {
      outstandingCents,
      status: baseStatus !== 'void' && outstandingCents === 0 ? 'paid' : baseStatus,
    },
  });
}

async function projectEventCard({ prisma, card }) {
  return prisma.$transaction(
    async (tx) => {
      const linkedOrder = await explicitlyLinkedOrder(tx, card);
      const orderStatus = eventOrderStatus(card);
      const totalCents = cardRevenueCents(card);
      const metadata = metadataFor(card);
      const serviceAt = dateAtNoon(card.date);
      const cash = reportedCash(card);
      let order = linkedOrder;
      let invoice = null;

      if (!order) {
        order = await tx.commercialOrder.upsert({
          where: { sourceSystem_sourceId: { sourceSystem: EVENT_SOURCE, sourceId: card.id } },
          update: {
            customerName: metadata.clientName || metadata.customerName || null,
            customerEmail: metadata.clientEmail || metadata.customerEmail || null,
            status: orderStatus,
            subtotalCents: totalCents,
            totalCents,
            bookedAt: ['booked', 'fulfilled'].includes(orderStatus)
              ? optionalDate(metadata.bookedAt || metadata.confirmedAt) ||
                card.createdAt ||
                serviceAt
              : null,
            serviceStartAt: serviceAt,
            fulfilledAt:
              orderStatus === 'fulfilled' ? optionalDate(metadata.fulfilledAt) || serviceAt : null,
            metadata: {
              plannerUid: card.supabaseUid,
              plannerCardId: card.id,
              financialStatus: card.financialStatus || null,
              financialSource: card.financialSource || null,
              evidenceRefs: metadata.evidenceRefs || [],
              reportedCashCents: cash.amountCents,
              reportedCashEvidenceState: cash.evidenceState,
            },
          },
          create: {
            customerName: metadata.clientName || metadata.customerName || null,
            customerEmail: metadata.clientEmail || metadata.customerEmail || null,
            channel: 'planner_event',
            businessLineKey: BUSINESS_LINE_EVENTS,
            status: orderStatus,
            subtotalCents: totalCents,
            totalCents,
            bookedAt: ['booked', 'fulfilled'].includes(orderStatus)
              ? optionalDate(metadata.bookedAt || metadata.confirmedAt) ||
                card.createdAt ||
                serviceAt
              : null,
            serviceStartAt: serviceAt,
            fulfilledAt:
              orderStatus === 'fulfilled' ? optionalDate(metadata.fulfilledAt) || serviceAt : null,
            sourceSystem: EVENT_SOURCE,
            sourceId: card.id,
            metadata: {
              plannerUid: card.supabaseUid,
              plannerCardId: card.id,
              financialStatus: card.financialStatus || null,
              financialSource: card.financialSource || null,
              evidenceRefs: metadata.evidenceRefs || [],
              reportedCashCents: cash.amountCents,
              reportedCashEvidenceState: cash.evidenceState,
            },
          },
        });

        await tx.commercialOrderLine.deleteMany({ where: { orderId: order.id } });
        if (totalCents > 0) {
          await tx.commercialOrderLine.create({
            data: {
              orderId: order.id,
              lineType: 'service',
              name: card.title,
              description: metadata.serviceType || metadata.menuSummary || card.notes || null,
              quantity: 1,
              unitPriceCents: totalCents,
              totalCents,
              sourceSystem: EVENT_SOURCE,
              sourceId: `${card.id}:service`,
              metadata: { guestEstimate: metadata.guestEstimate ?? null },
            },
          });
        }

        const invoiceSourceId = `${card.id}:invoice`;
        if (totalCents > 0) {
          const baseStatus = invoiceBaseStatus(orderStatus);
          invoice = await tx.commercialInvoice.upsert({
            where: {
              sourceSystem_sourceId: { sourceSystem: EVENT_SOURCE, sourceId: invoiceSourceId },
            },
            update: {
              orderId: order.id,
              invoiceNumber: metadata.invoiceNumber || null,
              status: baseStatus,
              totalCents,
              outstandingCents: baseStatus === 'void' ? 0 : totalCents,
              issuedAt:
                baseStatus === 'issued'
                  ? optionalDate(metadata.invoiceIssuedAt) || card.createdAt || serviceAt
                  : null,
              dueAt: optionalDate(metadata.balanceDueDate) || serviceAt,
              paidAt: null,
              metadata: {
                kind: 'event_total',
                plannerCardId: card.id,
                reportedCashCents: cash.amountCents,
                reportedCashEvidenceState: cash.evidenceState,
                paymentReference: cash.reference,
              },
            },
            create: {
              orderId: order.id,
              invoiceNumber: metadata.invoiceNumber || null,
              status: baseStatus,
              totalCents,
              outstandingCents: baseStatus === 'void' ? 0 : totalCents,
              issuedAt:
                baseStatus === 'issued'
                  ? optionalDate(metadata.invoiceIssuedAt) || card.createdAt || serviceAt
                  : null,
              dueAt: optionalDate(metadata.balanceDueDate) || serviceAt,
              sourceSystem: EVENT_SOURCE,
              sourceId: invoiceSourceId,
              metadata: {
                kind: 'event_total',
                plannerCardId: card.id,
                reportedCashCents: cash.amountCents,
                reportedCashEvidenceState: cash.evidenceState,
                paymentReference: cash.reference,
              },
            },
          });

          const externalPaymentId = `planner-card:${card.id}:reported-cash`;
          if (baseStatus === 'void') {
            // Cancellation does not erase real cash history. The invoice remains
            // void with no receivable; existing payment provenance is retained.
          } else if (cash.amountCents > 0 && cash.occurredAt) {
            const transaction = await recordPaymentTransaction({
              client: tx,
              provider: 'planner_reported',
              externalPaymentId,
              amountCents: cash.amountCents,
              occurredAt: cash.occurredAt,
              metadata: {
                source: EVENT_SOURCE,
                plannerCardId: card.id,
                reference: cash.reference,
                evidence: 'owner_reported',
              },
            });
            await applyPaymentFifo({
              tx,
              transactionId: transaction.id,
              amountCents: cash.amountCents,
              invoices: [invoice],
            });
          } else {
            const ownedTransactions = await tx.financePaymentTransaction.findMany({
              where: { provider: 'planner_reported', externalPaymentId },
              select: { id: true },
            });
            if (ownedTransactions.length) {
              await tx.financePaymentTransaction.deleteMany({
                where: { id: { in: ownedTransactions.map((transaction) => transaction.id) } },
              });
            }
            await settleInvoiceFromAllocations(tx, invoice.id);
          }
          invoice = await tx.commercialInvoice.findUnique({ where: { id: invoice.id } });
        } else {
          await tx.commercialInvoice.updateMany({
            where: { sourceSystem: EVENT_SOURCE, sourceId: invoiceSourceId },
            data: { status: 'void', outstandingCents: 0 },
          });
        }
      }

      const cost = await projectEventCost(tx, card, order?.id || null, orderStatus);
      return { order, invoice, cost, linkedExternalOrder: Boolean(linkedOrder) };
    },
    { timeout: 30000 }
  );
}

async function retireDeletedPlannerCard({ prisma, plannerUid, cardId }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.commercialOrder.findUnique({
      where: { sourceSystem_sourceId: { sourceSystem: EVENT_SOURCE, sourceId: cardId } },
    });
    if (order?.metadata?.plannerUid && order.metadata.plannerUid !== plannerUid)
      return { retired: false };
    if (order) {
      await tx.commercialOrder.update({ where: { id: order.id }, data: { status: 'cancelled' } });
      await tx.commercialInvoice.updateMany({
        where: { orderId: order.id, sourceSystem: EVENT_SOURCE },
        data: { status: 'void', outstandingCents: 0 },
      });
    }
    await tx.financeCostObligation.updateMany({
      where: { plannerCardId: cardId, sourceSystem: EVENT_SOURCE },
      data: { status: 'void', outstandingCents: 0 },
    });
    return { retired: Boolean(order) };
  });
}

function recurringSeriesFromCards(cards) {
  const series = new Map();
  for (const card of cards) {
    const metadata = metadataFor(card);
    if (!metadata.cashflowBillingOverride || !card.templateId) continue;
    const current = series.get(card.templateId);
    const currentUpdated = current?.updatedAt ? new Date(current.updatedAt).getTime() : 0;
    const candidateUpdated = card.updatedAt ? new Date(card.updatedAt).getTime() : 0;
    if (!current || candidateUpdated >= currentUpdated) series.set(card.templateId, card);
  }
  return [...series.values()];
}

async function projectRecurringSeries({ prisma, card, horizonEnd = null, now = new Date() }) {
  const metadata = metadataFor(card);
  const templateId = String(card.templateId);
  const amountCents = integerCents(metadata.billingAmountCents);
  const cadence = String(metadata.billingCadence || '');
  const nextBillingDate = String(metadata.nextBillingDate || '');
  const requestedStatus = String(metadata.billingStatus || 'active').toLowerCase();
  const active =
    card.enabled !== false &&
    requestedStatus === 'active' &&
    amountCents > 0 &&
    isIsoDate(nextBillingDate);
  const customerName =
    metadata.billingCustomerName || card.title.replace(/^Meal prep\s*[—-]\s*/i, '') || card.title;
  const customerEmail =
    String(metadata.squareRecipient || metadata.billingCustomerEmail || '')
      .trim()
      .toLowerCase() || null;
  const through =
    horizonEnd && isIsoDate(horizonEnd)
      ? horizonEnd
      : isIsoDate(nextBillingDate)
        ? addMonths(nextBillingDate, 12)
        : null;

  return prisma.$transaction(
    async (tx) => {
      const agreement = await tx.commercialAgreement.upsert({
        where: {
          sourceSystem_sourceId: {
            sourceSystem: RECURRING_SOURCE,
            sourceId: `${templateId}:agreement`,
          },
        },
        update: {
          status: active ? 'active' : requestedStatus,
          title: `${customerName} meal prep`,
          counterpartyName: customerName,
          counterpartyEmail: customerEmail,
          effectiveAt: dateAtNoon(nextBillingDate),
          terms: {
            plannerUid: card.supabaseUid,
            plannerTemplateId: templateId,
            billingCadence: cadence,
            billingAmountCents: amountCents,
            evidence: metadata.billingEvidence || null,
            evidenceAsOf: metadata.evidenceAsOf || null,
          },
        },
        create: {
          agreementType: 'meal_prep_recurring',
          status: active ? 'active' : requestedStatus,
          title: `${customerName} meal prep`,
          counterpartyName: customerName,
          counterpartyEmail: customerEmail,
          businessLineKey: BUSINESS_LINE_MEAL_PREP,
          effectiveAt: dateAtNoon(nextBillingDate),
          sourceSystem: RECURRING_SOURCE,
          sourceId: `${templateId}:agreement`,
          terms: {
            plannerUid: card.supabaseUid,
            plannerTemplateId: templateId,
            billingCadence: cadence,
            billingAmountCents: amountCents,
            evidence: metadata.billingEvidence || null,
            evidenceAsOf: metadata.evidenceAsOf || null,
          },
        },
      });

      const subscription = await tx.commercialSubscription.upsert({
        where: { sourceSystem_sourceId: { sourceSystem: RECURRING_SOURCE, sourceId: templateId } },
        update: {
          agreementId: agreement.id,
          status: active ? 'active' : requestedStatus,
          billingCadence: cadence || 'pending',
          recurringBaseCents: amountCents,
          startAt: dateAtNoon(nextBillingDate) || card.createdAt || now,
          metadata: {
            plannerUid: card.supabaseUid,
            plannerTemplateId: templateId,
            nextBillingDate: isIsoDate(nextBillingDate) ? nextBillingDate : null,
            squareRecipient: customerEmail,
            evidence: metadata.billingEvidence || null,
          },
        },
        create: {
          agreementId: agreement.id,
          status: active ? 'active' : requestedStatus,
          billingCadence: cadence || 'pending',
          recurringBaseCents: amountCents,
          startAt: dateAtNoon(nextBillingDate) || card.createdAt || now,
          sourceSystem: RECURRING_SOURCE,
          sourceId: templateId,
          metadata: {
            plannerUid: card.supabaseUid,
            plannerTemplateId: templateId,
            nextBillingDate: isIsoDate(nextBillingDate) ? nextBillingDate : null,
            squareRecipient: customerEmail,
            evidence: metadata.billingEvidence || null,
          },
        },
      });

      const occurrenceDates =
        active && through ? billingOccurrences(nextBillingDate, cadence, through) : [];
      const occurrenceSourceIds = new Set(occurrenceDates.map((date) => `${templateId}:${date}`));
      const staleFrom = dateAtNoon(
        isIsoDate(nextBillingDate) ? nextBillingDate : now.toISOString().slice(0, 10)
      );
      const existing = await tx.commercialOrder.findMany({
        where: {
          sourceSystem: RECURRING_SOURCE,
          sourceId: { startsWith: `${templateId}:` },
          serviceStartAt: { gte: staleFrom },
          ...(through ? { AND: [{ serviceStartAt: { lte: dateAtNoon(through) } }] } : {}),
        },
        select: { id: true, sourceId: true },
      });
      const stale = existing.filter((order) => !occurrenceSourceIds.has(order.sourceId));
      if (stale.length) {
        const staleIds = stale.map((order) => order.id);
        await tx.commercialOrder.updateMany({
          where: { id: { in: staleIds } },
          data: { status: 'void' },
        });
        await tx.commercialInvoice.updateMany({
          where: { orderId: { in: staleIds }, sourceSystem: RECURRING_SOURCE },
          data: { status: 'void', outstandingCents: 0 },
        });
      }

      const occurrences = [];
      const today = now.toISOString().slice(0, 10);
      for (const date of occurrenceDates) {
        const sourceId = `${templateId}:${date}`;
        const serviceAt = dateAtNoon(date);
        const order = await tx.commercialOrder.upsert({
          where: { sourceSystem_sourceId: { sourceSystem: RECURRING_SOURCE, sourceId } },
          update: {
            agreementId: agreement.id,
            subscriptionId: subscription.id,
            customerName,
            customerEmail,
            status: 'booked',
            subtotalCents: amountCents,
            totalCents: amountCents,
            serviceStartAt: serviceAt,
            metadata: {
              plannerUid: card.supabaseUid,
              plannerTemplateId: templateId,
              occurrenceDate: date,
            },
          },
          create: {
            agreementId: agreement.id,
            subscriptionId: subscription.id,
            customerName,
            customerEmail,
            channel: 'planner_recurring',
            businessLineKey: BUSINESS_LINE_MEAL_PREP,
            status: 'booked',
            subtotalCents: amountCents,
            totalCents: amountCents,
            bookedAt: agreement.effectiveAt || card.createdAt || now,
            serviceStartAt: serviceAt,
            sourceSystem: RECURRING_SOURCE,
            sourceId,
            metadata: {
              plannerUid: card.supabaseUid,
              plannerTemplateId: templateId,
              occurrenceDate: date,
            },
          },
        });
        await tx.commercialOrderLine.deleteMany({ where: { orderId: order.id } });
        await tx.commercialOrderLine.create({
          data: {
            orderId: order.id,
            lineType: 'recurring_service',
            name: `${customerName} meal prep`,
            quantity: 1,
            unitPriceCents: amountCents,
            totalCents: amountCents,
            sourceSystem: RECURRING_SOURCE,
            sourceId: `${sourceId}:service`,
            metadata: { billingCadence: cadence },
          },
        });
        const baseStatus = date <= today ? 'issued' : 'scheduled';
        let invoice = await tx.commercialInvoice.upsert({
          where: { sourceSystem_sourceId: { sourceSystem: RECURRING_SOURCE, sourceId } },
          update: {
            agreementId: agreement.id,
            orderId: order.id,
            status: baseStatus,
            totalCents: amountCents,
            outstandingCents: amountCents,
            issuedAt: date <= today ? serviceAt : null,
            dueAt: serviceAt,
            paidAt: null,
            metadata: {
              kind: 'recurring_occurrence',
              plannerTemplateId: templateId,
              occurrenceDate: date,
            },
          },
          create: {
            agreementId: agreement.id,
            orderId: order.id,
            status: baseStatus,
            totalCents: amountCents,
            outstandingCents: amountCents,
            issuedAt: date <= today ? serviceAt : null,
            dueAt: serviceAt,
            sourceSystem: RECURRING_SOURCE,
            sourceId,
            metadata: {
              kind: 'recurring_occurrence',
              plannerTemplateId: templateId,
              occurrenceDate: date,
            },
          },
        });
        invoice = await settleInvoiceFromAllocations(tx, invoice.id);
        occurrences.push({ order, invoice });
      }

      return { agreement, subscription, occurrences, active };
    },
    { timeout: 30000 }
  );
}

function plannerCogsStatus(value) {
  const status = String(value || 'projected').toLowerCase();
  if (['cancelled', 'canceled', 'void'].includes(status)) return 'void';
  if (status === 'paid') return 'paid';
  if (['incurred', 'received'].includes(status)) return 'incurred';
  if (['committed', 'ordered', 'approved'].includes(status)) return 'committed';
  return 'planned';
}

async function projectPlannerCogs({ prisma, plannerUid, items = null, reconcileStale = false }) {
  const cogs =
    items ||
    (await prisma.plannerCOGS.findMany({
      where: { supabaseUid: plannerUid },
      orderBy: [{ weekStart: 'asc' }, { id: 'asc' }],
    }));
  const currentIds = new Set(cogs.map((item) => item.id));
  let staleVoided = 0;

  if (reconcileStale) {
    const projected = await prisma.financeCostObligation.findMany({
      where: { sourceSystem: 'planner_cogs' },
      select: { id: true, sourceId: true, metadata: true },
    });
    const staleIds = projected
      .filter(
        (obligation) =>
          obligation.metadata?.plannerUid === plannerUid && !currentIds.has(obligation.sourceId)
      )
      .map((obligation) => obligation.id);
    if (staleIds.length) {
      const result = await prisma.financeCostObligation.updateMany({
        where: { id: { in: staleIds } },
        data: { status: 'void', outstandingCents: 0 },
      });
      staleVoided = result.count;
    }
  }

  let projected = 0;
  for (const item of cogs) {
    const amountCents =
      item.amountCents != null
        ? integerCents(item.amountCents)
        : integerCents(Number(item.amount || 0) * 100);
    const status = amountCents > 0 ? plannerCogsStatus(item.status) : 'void';
    const weekAt = dateAtNoon(item.weekStart);
    await prisma.financeCostObligation.upsert({
      where: {
        sourceSystem_sourceId: {
          sourceSystem: 'planner_cogs',
          sourceId: item.id,
        },
      },
      update: {
        status,
        description: item.name || 'Planner cost',
        amountCents,
        outstandingCents: ['paid', 'void'].includes(status) ? 0 : amountCents,
        committedAt: ['committed', 'incurred', 'paid'].includes(status)
          ? item.updatedAt || item.createdAt
          : null,
        serviceAt: weekAt,
        dueAt: weekAt,
        metadata: {
          plannerUid,
          source: item.source || null,
          notes: item.notes || null,
          paymentEvidenceState: status === 'paid' ? 'undated_report' : 'none',
        },
      },
      create: {
        obligationType: 'planner_cogs',
        status,
        description: item.name || 'Planner cost',
        amountCents,
        outstandingCents: ['paid', 'void'].includes(status) ? 0 : amountCents,
        committedAt: ['committed', 'incurred', 'paid'].includes(status)
          ? item.updatedAt || item.createdAt
          : null,
        serviceAt: weekAt,
        dueAt: weekAt,
        sourceSystem: 'planner_cogs',
        sourceId: item.id,
        metadata: {
          plannerUid,
          source: item.source || null,
          notes: item.notes || null,
          paymentEvidenceState: status === 'paid' ? 'undated_report' : 'none',
        },
      },
    });
    projected += 1;
  }
  return { ok: true, projected, staleVoided };
}

async function projectPlannerCommercialLedger({
  prisma,
  plannerUid,
  cardIds = null,
  horizonEnd = null,
  now = new Date(),
}) {
  if (!prisma) throw new Error('Prisma is required');
  if (!plannerUid) throw new Error('plannerUid is required');
  const requestedIds = cardIds ? [...new Set(cardIds.filter(Boolean).map(String))] : null;
  const cards = await prisma.plannerCard.findMany({
    where: {
      supabaseUid: plannerUid,
      ...(requestedIds ? { id: { in: requestedIds } } : {}),
    },
    orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
  });
  const foundIds = new Set(cards.map((card) => card.id));
  const summary = {
    ok: true,
    cards: cards.length,
    eventOrders: 0,
    recurringSeries: 0,
    recurringOccurrences: 0,
    cogsObligations: 0,
    staleCogsVoided: 0,
    retired: 0,
    errors: [],
  };

  if (requestedIds) {
    for (const cardId of requestedIds.filter((id) => !foundIds.has(id))) {
      try {
        const result = await retireDeletedPlannerCard({ prisma, plannerUid, cardId });
        if (result.retired) summary.retired += 1;
      } catch (error) {
        summary.errors.push({ plannerCardId: cardId, error: String(error?.message || error) });
      }
    }
  }

  for (const card of cards.filter((item) => item.objectType === 'event')) {
    try {
      await projectEventCard({ prisma, card });
      summary.eventOrders += 1;
    } catch (error) {
      summary.errors.push({ plannerCardId: card.id, error: String(error?.message || error) });
    }
  }

  for (const card of recurringSeriesFromCards(cards)) {
    try {
      const projected = await projectRecurringSeries({ prisma, card, horizonEnd, now });
      summary.recurringSeries += 1;
      summary.recurringOccurrences += projected.occurrences.length;
    } catch (error) {
      summary.errors.push({
        plannerCardId: card.id,
        templateId: card.templateId,
        error: String(error?.message || error),
      });
    }
  }
  if (!requestedIds) {
    try {
      const cogs = await projectPlannerCogs({
        prisma,
        plannerUid,
        reconcileStale: true,
      });
      summary.cogsObligations = cogs.projected;
      summary.staleCogsVoided = cogs.staleVoided;
    } catch (error) {
      summary.errors.push({ source: 'planner_cogs', error: String(error?.message || error) });
    }
  }

  summary.ok = summary.errors.length === 0;
  return summary;
}

module.exports = {
  EVENT_SOURCE,
  RECURRING_SOURCE,
  cardCostCents,
  cardRevenueCents,
  eventOrderStatus,
  projectEventCard,
  projectPlannerCommercialLedger,
  projectPlannerCogs,
  projectRecurringSeries,
  recurringSeriesFromCards,
  reportedCash,
};
