const { prisma } = require('../_lib/prisma');
const { createChefAccess, fail, object, text, version } = require('./_chefAccess');
const { getSquareClient } = require('../_lib/squareClient');
const { startCommercialCheckout } = require('../../backend/api/finance/commercialOrders');
const { createHostedPaymentLink, hostedPaymentIdempotencyKey } = require('../../backend/api/finance/hostedPaymentLinks');
const { markPaymentAttemptSucceeded, settleInvoiceFromAllocations } = require('../../backend/api/finance/paymentAttempts');
const { assertChefDuesPaymentEvidence, claimChefDuesPaymentEvidence } = require('../../backend/api/finance/squarePaymentEvidence');
const { recoverSaleConfirmations } = require('../store/sale-confirmation-outbox');

const FLOW = 'chef-dues';
const ZONE = 'America/Chicago';
const include = { membership: { include: { application: true, policy: true } }, invoice: { include: { allocations: { include: { transaction: true } }, paymentAttempts: true } }, events: { orderBy: { version: 'desc' } } };
const email = value => typeof value === 'string' && /^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$/.test(value);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const iso = value => new Date(value).toISOString();
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
function central(value) { return `${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: ZONE }).format(new Date(value))} Central (${iso(value)})`; }
function policyDues(membership) {
  const policy = membership?.policy;
  const terms = policy?.snapshot;
  if (!policy?.adoptedAt || !membership.acceptedAt || !membership.acceptedName || !membership.admittedAt || membership.status !== 'active' || membership.application?.status === 'withdrawn') fail(409, 'Active admission and acceptance of the adopted agreement are required');
  const dues = terms?.dues;
  if (!dues || !Number.isSafeInteger(dues.amountCents) || dues.amountCents <= 0 || dues.currency !== 'USD' || ['billingText', 'refundText', 'cancellationText', 'waiverText'].some(key => typeof dues[key] !== 'string' || !dues[key].trim()) || !email(terms.replyEmail)) fail(409, 'The accepted adopted policy does not configure complete dues terms');
  return dues;
}
function monthBounds(value) {
  if (typeof value !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) fail(400, 'Choose a service month (YYYY-MM)');
  const midnight = (year, month) => {
    const utc = new Date(Date.UTC(year, month, 1));
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, timeZoneName: 'shortOffset' }).formatToParts(utc).find(part => part.type === 'timeZoneName').value;
    const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset);
    if (!match) throw new Error('Central timezone offset unavailable');
    return new Date(utc.getTime() - (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] || 0)) * 60000);
  };
  const [year, month] = value.split('-').map(Number);
  return { serviceStartAt: midnight(year, month - 1), serviceEndAt: midnight(year, month) };
}
function assessmentInput(body, membership) {
  const dues = policyDues(membership);
  const bounds = monthBounds(body.period);
  if (bounds.serviceEndAt <= new Date(membership.admittedAt)) fail(409, 'Dues cannot cover a period before admission');
  // The admission month covers only admitted service; any reduction is an explicit owner decision.
  bounds.serviceStartAt = new Date(Math.max(bounds.serviceStartAt.getTime(), new Date(membership.admittedAt).getTime()));
  const payableCents = body.payableCents;
  if (!Number.isSafeInteger(payableCents) || payableCents < 0 || payableCents > dues.amountCents) fail(400, 'Payable cents must be between zero and the adopted dues amount');
  const adjustmentReason = text(body.adjustmentReason ?? '', 2000, 'reduction or waiver reason', payableCents < dues.amountCents);
  if (typeof body.dueAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(body.dueAt) || !Number.isFinite(Date.parse(body.dueAt))) fail(400, 'A due date with an explicit timezone is required');
  return { ...bounds, period: body.period, dueAt: new Date(body.dueAt), assessedCents: dues.amountCents, payableCents, adjustmentReason };
}
function confirmationFacts(row, { ownerEmail, senderEmail }) {
  if (!email(ownerEmail) || !email(senderEmail)) fail(503, 'Verified sender and owner confirmation addresses must be configured before checkout');
  const member = row.membership;
  const application = member.application;
  const terms = row.policySnapshot;
  if (!email(application.email)) fail(409, 'A customer confirmation email is required');
  const details = {
    'Assessment reference': row.id, 'Invoice reference': row.invoiceId, 'Service month': row.period,
    'Service starts': central(row.serviceStartAt), 'Service ends (exclusive)': central(row.serviceEndAt),
    'Due': central(row.dueAt), 'Adopted assessment': money(row.assessedCents), 'Amount paid': money(row.payableCents),
    'Reduction / waiver': row.adjustmentReason || 'None', 'Agreement version': terms.version,
    'Adopted agreement': terms.agreementText, 'Acceptance statement': terms.acceptanceText, 'Policy approval reference': terms.approvalReference,
    'Agreement accepted by': member.acceptedName, 'Agreement accepted': central(member.acceptedAt),
    'Contact preference': application.contactPreference, 'Contact email': application.email, 'Contact phone': application.phone || 'Not provided',
    'Billing terms': terms.dues.billingText, 'Refund terms': terms.dues.refundText,
    'Cancellation terms': terms.dues.cancellationText, 'Waiver terms': terms.dues.waiverText,
    'Reply contact': terms.replyEmail,
  };
  const lines = Object.entries(details).map(([key, value]) => `${key}: ${value}`);
  const from = { email: senderEmail, name: 'Local Effort' };
  const make = (role, recipient, intro) => ({ role, payload: {
    sender: from, to: [{ email: recipient, name: role === 'customer' ? application.name : 'Local Effort owner' }],
    replyTo: { email: terms.replyEmail, name: 'Local Effort' },
    subject: `Local Effort chef dues — ${row.period} payment confirmation`,
    textContent: `${intro}\nPayment reference: {{paymentId}}\n${lines.join('\n')}\n\nThis payment covers only the stated cooperative service period. It is not a capital contribution, wage offset, signup charge or recurring autopay. No pickup, delivery or shipping is included. Retain this confirmation; reply to ${terms.replyEmail} with questions. Your contact preference is unchanged.`,
    htmlContent: `<p>${escape(intro)}</p><p>Payment reference: {{paymentId}}</p><dl>${Object.entries(details).map(([key, value]) => `<dt>${escape(key)}</dt><dd>${escape(value).replace(/\n/g, '<br>')}</dd>`).join('')}</dl><p>This payment covers only the stated cooperative service period. It is not a capital contribution, wage offset, signup charge or recurring autopay. No pickup, delivery or shipping is included. Retain this confirmation; reply to ${escape(terms.replyEmail)} with questions. Your contact preference is unchanged.</p>`,
  } });
  return { flow: FLOW, title: 'Chef cooperative service dues', customer: { name: application.name, email: application.email }, totalCents: row.payableCents, details,
    confirmationTemplates: [make('customer', application.email, 'Local Effort received your chef cooperative dues payment.'), make('owner', ownerEmail, `Local Effort received chef cooperative dues from ${application.name}. No admission, work allocation or ownership change follows this payment.`)] };
}
function checkoutArgs(row) {
  const facts = row.confirmationFacts;
  return { flow: FLOW, checkoutAttemptId: row.id, channel: 'chef_dues', businessLineKey: 'membership', invoiceId: row.invoiceId,
    serviceStartAt: row.serviceStartAt, serviceEndAt: row.serviceEndAt, customer: facts.customer, totalCents: row.payableCents, facts,
    lines: [{ name: `Chef cooperative dues — ${row.period}`, quantity: 1, unitPriceCents: row.payableCents, totalCents: row.payableCents }],
    basket: { assessmentId: row.id, membershipId: row.membershipId, policyId: row.policyId, invoiceId: row.invoiceId, period: row.period, payableCents: row.payableCents, serviceStartAt: iso(row.serviceStartAt), serviceEndAt: iso(row.serviceEndAt) } };
}
function paymentMatches(payment, attempt, locationId) {
  assertChefDuesPaymentEvidence(payment, attempt, locationId);
}
function canCheckout(row, currentMembershipId) {
  if (row.membershipId !== currentMembershipId || row.membership.policyId !== row.policyId || row.payableCents <= 0 || row.invoice.allocations.length || row.invoice.paymentAttempts.some(a => a.status === 'succeeded' || a.externalPaymentId)) return false;
  try { policyDues(row.membership); return true; }
  catch (error) { if (error.status === 409) return false; throw error; }
}
function dto(row, owner = false, currentMembershipId = null) {
  const allocations = row.invoice.allocations.map(a => ({ id: a.id, amountCents: a.amountCents, transactionId: a.transactionId, provider: a.transaction.provider, reference: a.transaction.externalPaymentId, type: a.transaction.transactionType, status: a.transaction.status, occurredAt: a.transaction.occurredAt, receiptUrl: a.transaction.metadata?.receiptUrl || null }));
  const paidCents = allocations.filter(a => a.type === 'payment' && a.status === 'COMPLETED').reduce((sum, a) => sum + a.amountCents, 0);
  const refundedCents = -allocations.filter(a => a.type === 'refund' && a.status === 'COMPLETED').reduce((sum, a) => sum + a.amountCents, 0);
  return { id: row.id, membershipId: row.membershipId, version: row.version, period: row.period, serviceStartAt: row.serviceStartAt, serviceEndAt: row.serviceEndAt, timezone: ZONE, dueAt: row.dueAt, assessedCents: row.assessedCents, payableCents: row.payableCents, adjustmentReason: row.adjustmentReason, reason: row.reason, frozenAt: row.frozenAt,
    canPay: canCheckout(row, currentMembershipId),
    status: row.payableCents === 0 ? 'waived' : refundedCents > 0 ? (refundedCents >= paidCents ? 'refunded' : 'partially_refunded') : paidCents >= row.payableCents ? 'paid' : paidCents > 0 ? 'partially_paid' : 'assessed',
    invoice: { id: row.invoiceId, number: row.invoice.invoiceNumber, totalCents: row.invoice.totalCents, outstandingCents: Math.max(0, row.invoice.totalCents - paidCents + refundedCents), paidCents, refundedCents, allocations },
    terms: row.policySnapshot, acceptedName: row.membership.acceptedName, acceptedAt: row.membership.acceptedAt,
    attempts: row.invoice.paymentAttempts.map(a => ({ id: a.id, status: a.status, requestedCents: a.requestedCents, paymentId: a.externalPaymentId, orderId: a.commercialOrderId, squareOrderId: a.metadata?.squareOrderId || null, startedAt: a.startedAt, completedAt: a.completedAt, ...(owner ? { failureCode: a.failureCode, failureMessage: a.failureMessage } : {}) })),
    history: row.events.map(e => ({ version: e.version, action: e.action, reason: e.reason, createdAt: e.createdAt, ...(owner ? { actorUid: e.actorUid, outcome: e.outcome } : {}) })),
    ...(owner ? { applicant: { id: row.membership.applicationId, name: row.membership.application.name, email: row.membership.application.email, contactPreference: row.membership.application.contactPreference }, confirmationFacts: row.confirmationFacts } : {}) };
}
function createChefDuesHandlers({ prismaClient = prisma, verifyToken, resolveReviewer, rateLimit, emailOutboxService, getSanityReadClient, square = getSquareClient, ownerEmail = process.env.TEAM_INBOX_EMAIL || process.env.SUPPORT_INBOX_EMAIL, senderEmail = process.env.SENDER_EMAIL, now = () => new Date() } = {}) {
  const db = prismaClient;
  const access = createChefAccess({ prismaClient: db, verifyToken, resolveReviewer, rateLimit, requiredModels: ['chefMembership', 'chefDuesAssessment', 'chefDuesEvent', 'commercialInvoice', 'commercialOrder', 'financePaymentAttempt', 'financePaymentTransaction', 'financePaymentAllocation'] });
  async function load(tx, id) { const row = await tx.chefDuesAssessment.findUnique({ where: { id }, include }); if (!row) fail(404, 'Dues assessment not found'); return row; }
  async function change(tx, row, actor, action, reason, data = {}) {
    const changed = await tx.chefDuesAssessment.updateMany({ where: { id: row.id, version: row.version }, data: { ...data, version: row.version + 1 } });
    if (changed.count !== 1) fail(409, 'Dues changed. Reload before acting');
    const event = await tx.chefDuesEvent.create({ data: { assessmentId: row.id, version: row.version + 1, action, reason, actorUid: actor.id, outcome: 'recorded' } });
    return { row: await load(tx, row.id), event };
  }
  async function evidence(row) {
    const keys = row.invoice.paymentAttempts.filter(a => a.externalPaymentId).flatMap(a => ['customer', 'owner'].map(role => `square-payment-${a.externalPaymentId}-sale-confirmation-${role}`));
    if (!keys.length) return { available: true, jobs: [] };
    try {
      const client = getSanityReadClient?.();
      if (!client) throw new Error('not configured');
      const jobs = await client.fetch('*[_type == "emailOutbox" && idempotencyKey in $keys]{_id,idempotencyKey,status,attempts,nextAttemptAt,lastError,lastErrorAt,sentAt,finishedAt,providerMessageId,deadLetterReason}', { keys });
      return { available: true, jobs, missingKeys: keys.filter(key => !jobs.some(job => job.idempotencyKey === key)), deliveryNote: 'Provider acceptance is not inbox delivery. Inspect Brevo delivery events; suppression is never overridden here.' };
    } catch { return { available: false, jobs: [], error: 'Confirmation job evidence unavailable; payment facts remain recoverable' }; }
  }
  async function requireActive(tx, row) {
    const member = await tx.chefMembership.findUnique({ where: { id: row.membershipId }, include: { policy: true, application: true } });
    policyDues(member);
    if (member.policyId !== row.policyId) fail(409, 'Accepted policy changed; contact the owner');
    return member;
  }
  async function checkout(req, body, actor, isOwner) {
    if (!emailOutboxService?.enqueue) fail(503, 'The shared confirmation outbox must be configured before checkout');
    const { client, locationId } = square();
    if (!client?.checkoutApi?.createPaymentLink || !locationId) fail(503, 'Square hosted checkout is unavailable');
    const frozen = await db.$transaction(async tx => {
      let row = await load(tx, body.id);
      if (!isOwner) {
        const own = await access.member(req, { tx });
        if (row.membership.applicationId !== own.application.id) fail(404, 'Dues assessment not found');
        if (own.membership?.status !== 'active' || own.application.status === 'withdrawn') fail(403, 'An active admitted chef membership is required');
        if (row.membershipId !== own.membership.id) fail(409, 'Only assessments for your current active membership can be paid');
      }
      await requireActive(tx, row);
      if (row.version !== body.expectedVersion) fail(409, 'Dues changed. Reload before checkout');
      if (row.payableCents <= 0 || row.invoice.allocations.length || row.invoice.paymentAttempts.some(a => a.status === 'succeeded' || a.externalPaymentId)) fail(409, 'This assessment does not permit another payment');
      if (!row.frozenAt) {
        const facts = confirmationFacts(row, { ownerEmail, senderEmail });
        row = (await change(tx, row, actor, 'freeze-checkout', 'Member-initiated one-off hosted payment', { frozenAt: now(), confirmationFacts: facts })).row;
      }
      const args = checkoutArgs(row);
      const key = hostedPaymentIdempotencyKey(FLOW, row.id, args.basket);
      const booked = await startCommercialCheckout({ prisma: tx, idempotencyKey: key, sourceSystem: FLOW, sourceId: `${FLOW}:hosted:${key}`, channel: args.channel, businessLineKey: args.businessLineKey, invoiceId: row.invoiceId, customerName: args.customer.name, customerEmail: args.customer.email, totalCents: args.totalCents, serviceStartAt: row.serviceStartAt, serviceEndAt: row.serviceEndAt, lines: args.lines, basket: args.basket, orderMetadata: { saleConfirmationFacts: args.facts }, attemptMetadata: { channel: `${FLOW}_hosted_link`, saleConfirmationFacts: args.facts } });
      if (booked.replay === 'succeeded') fail(409, 'Payment already completed; reload the invoice');
      await tx.commercialInvoice.update({ where: { id: row.invoiceId }, data: { orderId: booked.order.id } });
      return row;
    }, { isolationLevel: 'Serializable' });
    // The transaction committed the invoice, immutable facts and owned attempt before Square is called.
    const url = await createHostedPaymentLink({ prisma: db, squareClient: client, locationId, ...checkoutArgs(frozen) });
    return { url, assessment: dto(await load(db, frozen.id), isOwner, isOwner ? null : frozen.membershipId) };
  }
  const self = (req, res) => access.execute(req, res, ['GET', 'POST'], 'chef-dues-member', async () => {
    object(req.query || {}, ['cursor']);
    const own = await access.member(req);
    if (req.method === 'GET') {
      const cursor = req.query?.cursor ? text(req.query.cursor, 100, 'cursor') : null;
      if (cursor && !await db.chefDuesAssessment.findFirst({ where: { id: cursor, membership: { applicationId: own.application.id } }, select: { id: true } })) fail(404, 'Dues assessment not found');
      const rows = await db.chefDuesAssessment.findMany({ where: { membership: { applicationId: own.application.id } }, orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include });
      return res.json({ assessments: rows.slice(0, 50).map(row => dto(row, false, own.membership?.id)), nextCursor: rows.length > 50 ? rows[49].id : null, membershipStatus: own.membership?.status || null });
    }
    const body = object(req.body, ['action', 'id', 'expectedVersion']);
    if (body.action !== 'checkout') fail(400, 'Choose checkout');
    body.id = text(body.id, 100, 'assessment'); version(body.expectedVersion);
    return res.json(await checkout(req, body, own.actor, false));
  });
  const admin = (req, res) => access.execute(req, res, ['GET', 'POST', 'PATCH'], 'chef-dues-owner', async () => {
    object(req.query || {}, ['id', 'cursor', 'membershipId']);
    const auth = await access.owner(req);
    if (req.method === 'GET') {
      if (req.query?.id) { const row = await load(db, text(req.query.id, 100, 'assessment')); return res.json({ assessment: dto(row, true), confirmations: await evidence(row), canManage: auth.canManage }); }
      const cursor = req.query?.cursor ? text(req.query.cursor, 100, 'cursor') : null;
      const membershipId = req.query?.membershipId ? text(req.query.membershipId, 100, 'membership') : null;
      const rows = await db.chefDuesAssessment.findMany({ where: membershipId ? { membershipId } : {}, orderBy: { id: 'asc' }, take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include });
      const members = cursor ? [] : await db.chefMembership.findMany({ where: { ...(membershipId ? { id: membershipId } : {}), status: 'active', application: { status: { not: 'withdrawn' } } }, orderBy: { id: 'asc' }, take: 200, include: { policy: true, application: true } });
      return res.json({ assessments: rows.slice(0, 50).map(row => dto(row, true)), nextCursor: rows.length > 50 ? rows[49].id : null, canManage: auth.canManage, membershipFilter: membershipId,
        memberships: members.map(m => ({ id: m.id, name: m.application.name, email: m.application.email, version: m.version, policyId: m.policyId, terms: m.policy.snapshot, acceptedAt: m.acceptedAt, admittedAt: m.admittedAt })), membershipListLimited: members.length === 200 });
    }
    const body = object(req.body, ['action', 'id', 'expectedVersion', 'membershipId', 'membershipVersion', 'period', 'payableCents', 'adjustmentReason', 'dueAt', 'reason', 'confirmed', 'paymentId', 'refundId', 'role']);
    if (body.confirmed !== true) fail(400, 'Explicitly confirm the owner action');
    const reason = text(body.reason, 2000, 'owner action reason');
    if (body.action === 'assess' && req.method === 'POST') {
      const membershipId = text(body.membershipId, 100, 'membership'); version(body.membershipVersion);
      const row = await db.$transaction(async tx => {
        const member = await tx.chefMembership.findUnique({ where: { id: membershipId }, include: { policy: true, application: true } });
        policyDues(member);
        if (member.version !== body.membershipVersion) fail(409, 'Membership changed. Reload before assessing');
        const data = assessmentInput(body, member);
        const invoice = await tx.commercialInvoice.create({ data: { sourceSystem: FLOW, sourceId: `${membershipId}:${body.period}`, status: data.payableCents === 0 ? 'waived' : 'issued', totalCents: data.payableCents, outstandingCents: data.payableCents, currency: 'USD', issuedAt: now(), dueAt: data.dueAt, metadata: { membershipId, policyId: member.policyId, period: body.period, serviceStartAt: iso(data.serviceStartAt), serviceEndAt: iso(data.serviceEndAt) } } });
        return tx.chefDuesAssessment.create({ data: { ...data, membershipId, policyId: member.policyId, policySnapshot: member.policy.snapshot, invoiceId: invoice.id, reason, assessedByUid: auth.actor.id, events: { create: { version: 1, action: 'assess', reason, actorUid: auth.actor.id, outcome: 'recorded' } } }, include });
      }, { isolationLevel: 'Serializable' });
      return res.status(201).json({ assessment: dto(row, true) });
    }
    body.id = text(body.id, 100, 'assessment'); version(body.expectedVersion);
    if (!['revise', 'recover-link', 'recover-payment', 'repair-confirmations', 'retry-confirmation', 'verify-refund'].includes(body.action)) fail(400, 'Choose a supported dues action');
    const reserved = await db.$transaction(async tx => {
      const row = await load(tx, body.id);
      if (row.version !== body.expectedVersion) fail(409, 'Dues changed. Reload before acting');
      if (body.action === 'revise') {
        await requireActive(tx, row);
        if (row.frozenAt || row.invoice.paymentAttempts.length || row.invoice.allocations.length) fail(409, 'Amounts and service facts are immutable after checkout begins');
        if (body.period !== row.period) fail(400, 'The assessed service month cannot change');
        const data = assessmentInput(body, row.membership);
        await tx.commercialInvoice.update({ where: { id: row.invoiceId }, data: { totalCents: data.payableCents, outstandingCents: data.payableCents, dueAt: data.dueAt, status: data.payableCents === 0 ? 'waived' : 'issued' } });
        return change(tx, row, auth.actor, body.action, reason, { ...data, reason });
      }
      return change(tx, row, auth.actor, body.action, reason);
    }, { isolationLevel: 'Serializable' });
    if (body.action === 'revise') return res.json({ assessment: dto(reserved.row, true) });
    let outcome;
    try {
      let row = reserved.row;
      const attempts = row.invoice.paymentAttempts;
      if (attempts.length !== 1 || !row.frozenAt) fail(409, 'A single owned checkout attempt is required');
      let attempt = attempts[0];
      if (body.action === 'recover-link') {
        const result = await checkout(req, { id: row.id, expectedVersion: row.version }, auth.actor, true);
        outcome = { url: result.url };
      } else if (body.action === 'recover-payment') {
        const { client, locationId } = square();
        if (!client?.paymentsApi?.getPayment || !locationId) fail(503, 'Square payment verification is unavailable');
        const paymentId = text(body.paymentId, 240, 'Square payment ID');
        const response = await client.paymentsApi.getPayment(paymentId);
        const payment = response?.result?.payment;
        // A process may have died after Square created the hosted order but
        // before its ID was saved. Recover only an authenticated owned order;
        // a supplied refund/payment ID or note is never an ownership anchor.
        const providerOrderId = payment?.orderId || payment?.order_id;
        if (!attempt.metadata?.squareOrderId && providerOrderId) {
          if (!client.ordersApi?.retrieveOrder) fail(503, 'Square order verification is required to recover this hosted checkout');
          const orderResponse = await client.ordersApi.retrieveOrder(providerOrderId);
          const order = orderResponse?.result?.order;
          const total = order?.totalMoney || order?.total_money;
          if (order?.id !== providerOrderId || (order.referenceId || order.reference_id) !== attempt.commercialOrderId || (order.locationId || order.location_id) !== locationId || Number(total?.amount) !== attempt.requestedCents || total?.currency !== attempt.currency) fail(409, 'Provider order does not prove ownership of this dues checkout');
          attempt = await db.financePaymentAttempt.update({ where: { id: attempt.id }, data: { metadata: { ...attempt.metadata, squareOrderId: providerOrderId } } });
        }
        paymentMatches(payment, attempt, locationId);
        if (payment.id !== paymentId) fail(409, 'Provider payment reference mismatch');
        await claimChefDuesPaymentEvidence(db, payment, attempt, locationId);
        await markPaymentAttemptSucceeded({ prisma: db, attemptId: attempt.id, provider: 'square', payment, amountCents: attempt.requestedCents });
        attempt = await db.financePaymentAttempt.findUnique({ where: { id: attempt.id } });
        outcome = await recoverSaleConfirmations({ attempt, payment, emailOutboxService, prisma: db });
      } else if (body.action === 'repair-confirmations') {
        if (attempt.status !== 'succeeded' || !attempt.externalPaymentId) fail(409, 'Only a verified completed payment can queue confirmations');
        outcome = await recoverSaleConfirmations({ attempt, emailOutboxService, prisma: db });
      } else if (body.action === 'retry-confirmation') {
        if (!['customer', 'owner'].includes(body.role) || attempt.status !== 'succeeded' || !attempt.externalPaymentId || !emailOutboxService?.requeue) fail(409, 'Choose a role on a verified payment with the shared outbox configured');
        outcome = await emailOutboxService.requeue(`square-payment-${attempt.externalPaymentId}-sale-confirmation-${body.role}`);
      } else {
        if (attempt.status !== 'succeeded' || !attempt.externalPaymentId) fail(409, 'A verified completed payment is required before recording a refund');
        const refundId = text(body.refundId, 240, 'Square refund ID');
        const { client, locationId } = square();
        if (!client?.refundsApi?.getPaymentRefund || !locationId) fail(503, 'Square refund verification is unavailable');
        const response = await client.refundsApi.getPaymentRefund(refundId);
        const refund = response?.result?.refund;
        const amount = refund?.amountMoney || refund?.amount_money;
        const cents = Number(amount?.amount);
        if (refund?.id !== refundId || refund.status !== 'COMPLETED' || (refund.paymentId || refund.payment_id) !== attempt.externalPaymentId || (refund.locationId || refund.location_id) !== locationId || amount?.currency !== attempt.currency || !Number.isSafeInteger(cents) || cents <= 0 || cents > attempt.requestedCents) fail(409, 'Refund is not completed provider evidence for this dues payment');
        outcome = await db.$transaction(async tx => {
          row = await load(tx, body.id);
          const reference = `refund:${refund.id}`;
          const previousRefunds = row.invoice.allocations.filter(a => a.transaction.transactionType === 'refund' && a.transaction.externalPaymentId !== reference).reduce((sum, a) => sum - a.amountCents, 0);
          if (previousRefunds + cents > attempt.requestedCents) fail(409, 'Verified refunds exceed the original payment');
          const occurred = refund.updatedAt || refund.updated_at || refund.createdAt || refund.created_at;
          if (!occurred || !Number.isFinite(Date.parse(occurred))) fail(409, 'Provider refund timestamp is missing');
          const transaction = await tx.financePaymentTransaction.upsert({ where: { provider_externalPaymentId: { provider: 'square', externalPaymentId: reference } }, update: {}, create: { provider: 'square', externalPaymentId: reference, attemptId: attempt.id, transactionType: 'refund', status: 'COMPLETED', currency: attempt.currency, grossCents: -cents, occurredAt: new Date(occurred), metadata: { refundId: refund.id, paymentId: attempt.externalPaymentId, locationId, verifiedAt: iso(now()), verifiedByUid: auth.actor.id } } });
          if (transaction.attemptId !== attempt.id || transaction.grossCents !== -cents) fail(409, 'Refund evidence conflicts with existing finance records');
          await tx.financePaymentAllocation.upsert({ where: { transactionId_targetType_targetId: { transactionId: transaction.id, targetType: 'invoice', targetId: row.invoiceId } }, update: {}, create: { transactionId: transaction.id, targetType: 'invoice', targetId: row.invoiceId, invoiceId: row.invoiceId, orderId: attempt.commercialOrderId, amountCents: -cents } });
          await settleInvoiceFromAllocations(tx, row.invoiceId);
          return { verifiedRefundId: refund.id, amountCents: cents };
        }, { isolationLevel: 'Serializable' });
      }
      await db.chefDuesEvent.update({ where: { id: reserved.event.id }, data: { outcome: JSON.stringify(outcome) } });
    } catch (error) {
      await db.chefDuesEvent.update({ where: { id: reserved.event.id }, data: { outcome: `failed:${error.status ? error.message : 'Provider or outbox unavailable; retry the same action after reload'}` } });
      throw error;
    }
    const row = await load(db, body.id);
    return res.json({ assessment: dto(row, true), outcome, confirmations: await evidence(row), ...(outcome?.url ? { url: outcome.url } : {}) });
  });
  return { self, admin };
}
module.exports = { createChefDuesHandlers, policyDues, monthBounds, assessmentInput, confirmationFacts, paymentMatches, dto };
