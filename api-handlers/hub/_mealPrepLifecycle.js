const DAY_MS = 86_400_000;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const { getSquareClient } = require('../_lib/squareClient');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function eventIdentity(event) {
  const payload = event.payload || {};
  const signals = payload.identitySignals || {};
  const squareCustomerIds = new Set([
    payload.customerId,
    payload.customer_id,
    signals.orderCustomerId,
    ...(signals.paymentCustomerIds || []),
  ].filter(Boolean).map(String));
  const emailText = [
    payload.buyerEmail,
    payload.buyer_email_address,
    payload.merchantName,
    ...(signals.buyerEmails || []),
    ...(signals.recipientEmails || []),
    event.actorId,
  ].filter(Boolean).join(' ');
  return {
    squareCustomerIds,
    emails: new Set((emailText.match(EMAIL_RE) || []).map(normalizeEmail)),
  };
}

function isCompletedRevenueEvent(event) {
  if (!['square', 'square_invoice'].includes(event.source)) return false;
  const payload = event.payload || {};
  const cents = Number(payload.totalCents ?? payload.amountCents ?? 0);
  if (!(cents > 0)) return false;
  if (event.eventType === 'order.placed') return String(payload.state || '').toUpperCase() === 'COMPLETED';
  if (event.eventType === 'payment.completed') return !payload.status || String(payload.status).toUpperCase() === 'COMPLETED';
  if (event.eventType === 'invoice.paid') return ['PAID', 'PARTIALLY_REFUNDED'].includes(String(payload.status || '').toUpperCase());
  return false;
}

function eventMatchesCustomer(event, customer) {
  const identity = eventIdentity(event);
  if (customer.squareCustomerId && identity.squareCustomerIds.has(String(customer.squareCustomerId))) return true;
  const email = normalizeEmail(customer.properties?.email);
  return Boolean(email && identity.emails.has(email));
}

async function loadPaidInvoiceEvidence() {
  const { client, locationId } = getSquareClient();
  if (!client?.invoicesApi || !locationId) return [];
  const invoices = [];
  let cursor;
  do {
    const response = await client.invoicesApi.listInvoices(locationId, cursor, 200);
    invoices.push(...(response.result.invoices || []));
    cursor = response.result.cursor;
  } while (cursor && invoices.length < 2000);

  const paid = invoices.filter((invoice) => ['PAID', 'PARTIALLY_REFUNDED'].includes(invoice.status));
  return Promise.all(paid.map(async (invoice) => {
    let totalCents = Number(invoice.nextPaymentAmountMoney?.amount || 0);
    if (invoice.orderId) {
      try {
        const response = await client.ordersApi.retrieveOrder(invoice.orderId);
        totalCents = Number(response.result?.order?.totalMoney?.amount || totalCents);
      } catch (_err) {
        // Identity and paid status remain valid evidence even if order detail is unavailable.
      }
    }
    const recipient = invoice.primaryRecipient || {};
    return {
      id: `square-invoice:${invoice.id}`,
      eventType: 'invoice.paid',
      source: 'square_invoice',
      sourceId: invoice.id,
      actorId: recipient.customerId || recipient.emailAddress || null,
      occurredAt: new Date(invoice.updatedAt || invoice.createdAt),
      payload: {
        invoiceId: invoice.id,
        status: invoice.status,
        totalCents,
        customerId: recipient.customerId || null,
        buyerEmail: recipient.emailAddress || null,
      },
    };
  }));
}

async function eligibleMealPrepPromotions(prisma, { today = new Date().toISOString().slice(0, 10) } = {}) {
  const upcoming = await prisma.brainEntity.findMany({
    where: {
      entityType: 'Customer',
      tombstonedAt: null,
      properties: { path: ['mealPrepStage'], equals: 'upcoming' },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!upcoming.length) return [];

  const earliestIntake = upcoming.reduce((earliest, entity) => {
    const value = new Date(entity.properties?.latestMealPrepIntakeAt || entity.createdAt);
    return value < earliest ? value : earliest;
  }, new Date());
  const evidenceStart = new Date(earliestIntake.getTime() - 14 * DAY_MS);
  const [ledgerEvents, invoiceEvents] = await Promise.all([prisma.ledgerEvent.findMany({
    where: {
      source: 'square',
      eventType: { in: ['order.placed', 'payment.completed'] },
      occurredAt: { gte: evidenceStart },
      tombstonedAt: null,
    },
    orderBy: { occurredAt: 'desc' },
    take: 4000,
  }), loadPaidInvoiceEvidence()]);
  const events = [...ledgerEvents, ...invoiceEvents].sort((a, b) => b.occurredAt - a.occurredAt);

  return upcoming.flatMap((customer) => {
    const preferredStartDate = String(customer.properties?.preferredStartDate || '').slice(0, 10);
    if (preferredStartDate && preferredStartDate > today) return [];
    const intakeAt = new Date(customer.properties?.latestMealPrepIntakeAt || customer.createdAt);
    const customerEvidenceStart = new Date(intakeAt.getTime() - 14 * DAY_MS);
    const evidence = events.find((event) => (
      event.occurredAt >= customerEvidenceStart
      && isCompletedRevenueEvent(event)
      && eventMatchesCustomer(event, customer)
    ));
    return evidence ? [{ customer, evidence }] : [];
  });
}

async function promoteEligibleMealPrepCustomers(prisma, options = {}) {
  const eligible = await eligibleMealPrepPromotions(prisma, options);
  if (options.dryRun) return { eligible: eligible.length, promoted: 0, matches: eligible };
  const activatedAt = new Date().toISOString();
  for (const { customer, evidence } of eligible) {
    await prisma.brainEntity.update({
      where: { id: customer.id },
      data: {
        properties: {
          ...(customer.properties || {}),
          mealPrepStage: 'active',
          mealPrepActivatedAt: activatedAt,
          mealPrepActivation: {
            source: 'square_completed_revenue',
            ledgerEventId: evidence.id,
            sourceId: evidence.sourceId || null,
            occurredAt: evidence.occurredAt.toISOString(),
            amountCents: Number(evidence.payload?.totalCents ?? evidence.payload?.amountCents ?? 0),
          },
        },
      },
    });
    const sourceId = customer.id;
    const existing = await prisma.ledgerEvent.findFirst({
      where: {
        eventType: 'meal_prep.subscription.activated',
        source: 'meal_prep_lifecycle',
        sourceId,
        tombstonedAt: null,
      },
    });
    if (!existing) {
      await prisma.ledgerEvent.create({
        data: {
          eventType: 'meal_prep.subscription.activated',
          occurredAt: new Date(activatedAt),
          source: 'meal_prep_lifecycle',
          sourceId,
          actorType: 'customer',
          actorId: customer.id,
          payload: {
            customerEntityId: customer.id,
            evidenceSource: evidence.source,
            evidenceSourceId: evidence.sourceId || evidence.id,
            evidenceOccurredAt: evidence.occurredAt.toISOString(),
            amountCents: Number(evidence.payload?.totalCents ?? evidence.payload?.amountCents ?? 0),
          },
        },
      });
    }
  }
  return { eligible: eligible.length, promoted: eligible.length, matches: eligible };
}

module.exports = {
  eligibleMealPrepPromotions,
  eventIdentity,
  eventMatchesCustomer,
  isCompletedRevenueEvent,
  loadPaidInvoiceEvidence,
  promoteEligibleMealPrepCustomers,
};
