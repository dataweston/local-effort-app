/**
 * Sales-layer read views.
 *
 * Step 6 of the staged plan: pipeline stage, expected 7/30/90-day value,
 * collections, and reorder outcomes — read-only, derived entirely from Finance
 * Core records, never writing.
 *
 * Two rules keep these views honest:
 *
 *   1. Observed and modeled numbers never share a total. Money that has been
 *      billed is `observed`; money implied by a booking or a subscription's
 *      terms is `modeled`, and is labeled as such in the response.
 *   2. Margin is not computed here. This repo owns the commercial identity —
 *      order, line, business line — and Local Budget owns cost and margin. The
 *      channel view returns the join keys and says where margin comes from
 *      rather than inventing a number nobody can reconcile.
 *
 * Admin-only: this is the revenue book.
 */

const express = require('express');
const crypto = require('crypto');

const { prisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { BUSINESS_LINES } = require('../finance/businessLines');
const { getPizzaDrop, pizzaDropStatus } = require('../../../api-handlers/store/_pizzaDrop');
const { buildPizzaReadyNotice, methodOf, REPLY_EMAIL } = require('../../../api-handlers/store/_pizzaReadyNotice');
const { buildDirectSaleConfirmations } = require('../../../api-handlers/store/sale-confirmation-outbox');

const verifyAdminRequest = createAdminVerifier();

function hasAdminKeyHeader(req) {
  const provided = String(req.headers['x-brain-admin-key'] || '');
  const expected = String(process.env.BRAIN_ADMIN_KEY || '');
  if (!provided || !expected || provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}
function formatAddress(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return [value.line1, value.line2, [value.city, value.state, value.postal].filter(Boolean).join(' ')]
    .filter(Boolean).join(', ');
}

function createOwnerGuarded({ logger, prismaClient, verifyAdminRequestImpl }, handler) {
  return async (req, res) => {
    const admin = await verifyAdminRequestImpl(req);
    if (!admin) return res.status(403).json({ error: 'admin only' });
    if (!prismaClient) return res.status(503).json({ error: 'database unavailable' });
    try {
      return await handler(req, res);
    } catch (error) {
      logger?.error?.({ err: error, path: req.path }, 'sales view failed');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
}

const DAY_MS = 86_400_000;
const DEFAULT_WINDOWS = [7, 30, 90];
const OPEN_INVOICE_STATUSES = ['issued', 'partially_paid', 'draft'];
// Work that is promised or in flight, versus work that is finished or dead.
const PIPELINE_STATUSES = ['quoted', 'draft', 'payment_pending', 'booked'];

function daysBetween(from, to) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

function centsSum(rows, field = 'outstandingCents') {
  return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}

function parseWindows(value) {
  if (!value) return DEFAULT_WINDOWS;
  const parsed = String(value)
    .split(',')
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isInteger(entry) && entry > 0 && entry <= 730);
  return parsed.length ? parsed : DEFAULT_WINDOWS;
}

/**
 * Dues a subscription's terms imply inside a window. Modeled, not observed:
 * nothing here has been billed yet, and a cancelled member stops paying without
 * telling this function.
 */
function modeledDuesInWindow(subscription, days) {
  const cadence = String(subscription.billingCadence || '').toLowerCase();
  const base = Number(subscription.recurringBaseCents) || 0;
  if (!base) return 0;
  if (cadence === 'monthly') return Math.round(base * (days / 30));
  if (cadence === 'annual') return Math.round(base * (days / 365));
  return 0;
}

function createSalesRouter({
  logger = null,
  emailOutboxService = null,
  prismaClient = prisma,
  verifyAdminRequestImpl = verifyAdminRequest,
} = {}) {
  const router = express.Router();

  const guarded = (handler) => async (req, res) => {
    const admin = req.method === 'GET' && hasAdminKeyHeader(req)
      ? { service: 'brain-admin-key' }
      : await verifyAdminRequestImpl(req);
    if (!admin) return res.status(403).json({ error: 'admin only' });
    if (!prismaClient) return res.status(503).json({ error: 'database unavailable' });
    try {
      return await handler(req, res);
    } catch (error) {
      logger?.error?.({ err: error, path: req.path }, 'sales view failed');
      return res.status(500).json({ error: 'internal-error' });
    }
  };
  const ownerGuarded = (handler) => createOwnerGuarded(
    { logger, prismaClient, verifyAdminRequestImpl },
    handler,
  );


  const pizzaOrderWhere = {
    status: 'paid',
    sourceSystem: 'store',
    metadata: { path: ['store'], equals: 'pizza-on-smith' },
  };
  const pizzaOrderSelect = {
    id: true, sourceId: true, customerName: true, customerEmail: true,
    totalCents: true, currency: true, createdAt: true, bookedAt: true,
    fulfilledAt: true, metadata: true,
    lines: {
      where: { lineType: 'item' },
      select: { id: true, name: true, quantity: true, unitPriceCents: true, totalCents: true },
    },
    paymentAttempts: {
      select: { status: true, externalPaymentId: true, provider: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    },
  };
  // The business sells in Central time, so "a day of sales" is a Central day.
  const centralDay = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

  router.get('/pizza-on-smith/report', ownerGuarded(async (_req, res) => {
    const [orders, drop] = await Promise.all([
      prismaClient.commercialOrder.findMany({
        where: pizzaOrderWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        select: pizzaOrderSelect,
      }),
      getPizzaDrop(),
    ]);
    const daily = new Map();
    const productCounts = new Map();
    const methodCounts = new Map();
    for (const order of orders) {
      const day = centralDay(order.bookedAt || order.createdAt);
      const method = methodOf(order.metadata);
      const entry = daily.get(day) || { date: day, grossSalesCents: 0, orderCount: 0, units: 0 };
      entry.grossSalesCents += order.totalCents;
      entry.orderCount += 1;
      const byMethod = methodCounts.get(method) || { method, orderCount: 0, units: 0, readyCount: 0 };
      byMethod.orderCount += 1;
      if (order.metadata?.pizzaOnSmithReady?.queuedAt) byMethod.readyCount += 1;
      for (const line of order.lines || []) {
        entry.units += line.quantity;
        byMethod.units += line.quantity;
        const product = productCounts.get(line.name) || { name: line.name, units: 0, orderIds: new Set(), grossSalesCents: 0, byMethod: {} };
        product.units += line.quantity;
        product.orderIds.add(order.id);
        product.grossSalesCents += line.totalCents;
        product.byMethod[method] = (product.byMethod[method] || 0) + line.quantity;
        productCounts.set(line.name, product);
      }
      daily.set(day, entry);
      methodCounts.set(method, byMethod);
    }
    const reportOrders = orders.map((order) => {
      const metadata = order.metadata || {};
      const facts = metadata.saleConfirmationFacts || {};
      const fulfillment = metadata.fulfillment || facts.fulfillment || null;
      return {
        id: order.id,
        reference: order.paymentAttempts?.[0]?.externalPaymentId || order.sourceId,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          phone: facts.customer?.phone || '',
          smsReleaseOptIn: Boolean(metadata.smsReleaseOptIn ?? facts.customer?.smsReleaseOptIn),
        },
        totalCents: order.totalCents,
        currency: order.currency,
        createdAt: order.createdAt,
        method: methodOf(metadata),
        fulfillment,
        fulfillmentDetails: {
          ...(facts.details || {}),
          ...(metadata.deliveryAddress ? { 'Delivery address': formatAddress(metadata.deliveryAddress) } : {}),
          ...(facts.deliveryAddress ? { 'Delivery address': formatAddress(facts.deliveryAddress) } : {}),
        },
        lines: order.lines,
        ready: Boolean(metadata.pizzaOnSmithReady?.queuedAt),
        readyEmail: metadata.pizzaOnSmithReady || null,
      };
    });
    return res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      drop: {
        status: pizzaDropStatus(drop),
        opensAt: drop.opensAt ? new Date(drop.opensAt).toISOString() : null,
        closesAt: drop.closesAt ? new Date(drop.closesAt).toISOString() : null,
        fulfillmentLabel: drop.fulfillmentLabel,
      },
      totals: {
        grossSalesCents: orders.reduce((sum, order) => sum + order.totalCents, 0),
        orderCount: orders.length,
        units: orders.reduce((sum, order) => sum + (order.lines || []).reduce((n, line) => n + line.quantity, 0), 0),
        readyCount: reportOrders.filter((order) => order.ready).length,
      },
      byMethod: [...methodCounts.values()].sort((a, b) => a.method.localeCompare(b.method)),
      daily: [...daily.values()].sort((a, b) => b.date.localeCompare(a.date)),
      products: [...productCounts.values()].map(({ orderIds, ...product }) => ({ ...product, orderCount: orderIds.size })).sort((a, b) => a.name.localeCompare(b.name)),
      orders: reportOrders,
    });
  }));

  const confirmationRoles = ['customer', 'owner'];
  const confirmationError = (code) => Object.assign(new Error(code), { statusCode: 409 });
  const confirmationGuarded = (handler) => ownerGuarded(async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      if (error.statusCode === 409) return res.status(409).json({ error: error.message });
      logger?.error?.({ err: error, orderId: req.params.orderId }, 'sale confirmation unavailable');
      return res.status(503).json({ error: 'email-service-unavailable' });
    }
  });
  const validConfirmationPayload = (payload) => {
    const validEmail = (value) => typeof value === 'string' && /^[^\s@{}]+@[^\s@{}]+\.[^\s@{}]+$/.test(value);
    return payload && Array.isArray(payload.to) && payload.to.length > 0
      && ['to', 'cc', 'bcc'].every((field) => payload[field] == null
        || (Array.isArray(payload[field]) && payload[field].every((recipient) => validEmail(recipient?.email))))
      && validEmail(payload.sender?.email) && validEmail(payload.replyTo?.email)
      && ['subject', 'textContent', 'htmlContent'].every((field) =>
        typeof payload[field] === 'string' && payload[field].trim() && !/\{\{[^}]+\}\}/.test(payload[field]));
  };
  const recipientScope = (payload) => JSON.stringify(['to', 'cc', 'bcc'].map((field) =>
    (payload?.[field] || []).map((recipient) => String(recipient?.email || '').trim().toLowerCase()).sort()));

  async function loadPizzaConfirmations(orderId) {
    if (!emailOutboxService?.getJobs || !emailOutboxService?.stableOutboxId) {
      throw new Error('email-service-unavailable');
    }
    const order = await prismaClient.commercialOrder.findFirst({
      where: { ...pizzaOrderWhere, id: orderId },
      select: {
        ...pizzaOrderSelect,
        status: true,
        sourceSystem: true,
        paymentAttempts: {
          where: { provider: 'square', status: 'succeeded' },
          select: {
            commercialOrderId: true, provider: true, status: true, externalPaymentId: true,
            requestedCents: true, currency: true, metadata: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!order || order.status !== 'paid' || order.sourceSystem !== 'store'
      || order.metadata?.store !== 'pizza-on-smith') throw confirmationError('paid-pizza-order-required');
    const attempt = order.paymentAttempts?.find((entry) =>
      entry.provider === 'square' && entry.status === 'succeeded' && entry.commercialOrderId === order.id
      && typeof entry.externalPaymentId === 'string' && entry.externalPaymentId.trim());
    if (!attempt) throw confirmationError('verified-square-payment-required');
    const paymentId = attempt.externalPaymentId;
    const facts = attempt.metadata?.saleConfirmationFacts || order.metadata?.saleConfirmationFacts;
    if (!facts || facts.flow !== 'store' || facts.store !== 'pizza-on-smith') {
      throw confirmationError('original-confirmation-facts-required');
    }
    if ((attempt.requestedCents != null && attempt.requestedCents !== order.totalCents)
      || (facts.totalCents != null && facts.totalCents !== order.totalCents)
      || (facts.amountCents != null && facts.amountCents !== order.totalCents)
      || (attempt.currency && order.currency && attempt.currency.toUpperCase() !== order.currency.toUpperCase())) {
      throw confirmationError('payment-amount-mismatch');
    }
    const templates = facts.confirmationTemplates;
    if (!Array.isArray(templates) || templates.length !== 2
      || confirmationRoles.some((role) => templates.filter((entry) => entry?.role === role).length !== 1)) {
      throw confirmationError('original-confirmation-templates-required');
    }
    let confirmations;
    try {
      confirmations = buildDirectSaleConfirmations('store', { ...facts, paymentId });
    } catch (_error) {
      throw confirmationError('original-confirmation-template-incomplete');
    }
    if (confirmations.length !== 2 || confirmations.some(({ payload }) => !validConfirmationPayload(payload))) {
      throw confirmationError('original-confirmation-template-incomplete');
    }
    const entries = confirmationRoles.map((role) => {
      const idempotencyKey = `square-payment-${paymentId}-sale-confirmation-${role}`;
      return {
        role, idempotencyKey, id: emailOutboxService.stableOutboxId(idempotencyKey),
        payload: confirmations.find((entry) => entry.role === role).payload,
      };
    });
    return { orderId: order.id, paymentId, entries };
  }

  async function readPizzaConfirmationState(state) {
    const jobs = await emailOutboxService.getJobs({ ids: state.entries.map(({ id }) => id) });
    return state.entries.map((entry) => {
      const job = jobs.find(({ id }) => id === entry.id);
      if (job && (job.source !== 'sale-confirmation' || job.idempotencyKey !== entry.idempotencyKey
        || job.context?.paymentId !== state.paymentId || job.context?.role !== entry.role
        || !validConfirmationPayload(job.payload) || recipientScope(job.payload) !== recipientScope(entry.payload))) {
        throw confirmationError('original-confirmation-job-mismatch');
      }
      const payload = job?.payload || entry.payload;
      return {
        role: entry.role,
        to: payload.to.map(({ email, name }) => ({ email, ...(name ? { name } : {}) })),
        cc: (payload.cc || []).map(({ email, name }) => ({ email, ...(name ? { name } : {}) })),
        bcc: (payload.bcc || []).map(({ email, name }) => ({ email, ...(name ? { name } : {}) })),
        subject: payload.subject,
        textContent: payload.textContent,
        status: job?.status || 'missing',
        attempts: job?.attempts || 0,
        lastError: job?.lastError || null,
        sentAt: job?.sentAt || null,
        providerMessageId: job?.providerMessageId || null,
      };
    });
  }

  router.get('/pizza-on-smith/orders/:orderId/confirmations', confirmationGuarded(async (req, res) => {
    const state = await loadPizzaConfirmations(req.params.orderId);
    return res.json({ ok: true, orderId: state.orderId, confirmations: await readPizzaConfirmationState(state) });
  }));

  router.post('/pizza-on-smith/orders/:orderId/confirmations/send', confirmationGuarded(async (req, res) => {
    const role = req.body?.role;
    if (!confirmationRoles.includes(role) || Object.keys(req.body || {}).some((key) => key !== 'role')) {
      throw confirmationError('confirmation-role-required');
    }
    if (!emailOutboxService?.enqueue || !emailOutboxService?.requeue || !emailOutboxService?.processBatch) {
      throw new Error('email-service-unavailable');
    }
    const state = await loadPizzaConfirmations(req.params.orderId);
    const before = await readPizzaConfirmationState(state);
    const chosen = before.find((entry) => entry.role === role);
    const entry = state.entries.find((item) => item.role === role);
    let requeued = false;
    let processingError = null;
    if (chosen.status !== 'sent') {
      if (chosen.status === 'missing') {
        await emailOutboxService.enqueue({
          idempotencyKey: entry.idempotencyKey, payload: entry.payload,
          category: 'transactional', source: 'sale-confirmation',
          context: { paymentId: state.paymentId, role, tags: ['sale-confirmation'] },
        });
      }
      // Re-read after createIfNotExists: a concurrent webhook may own the job.
      const current = (await readPizzaConfirmationState(state)).find((item) => item.role === role);
      if (['retry', 'dead_letter'].includes(current.status)) {
        requeued = (await emailOutboxService.requeue(entry.idempotencyKey)).requeued;
      }
      if (current.status !== 'sent') {
        try {
          await emailOutboxService.processBatch({ ids: [entry.id], limit: 1, source: 'sale-confirmation' });
        } catch (error) {
          processingError = error;
          logger?.error?.({ err: error, orderId: state.orderId, role }, 'sale confirmation processing unavailable');
        }
      }
    }
    const confirmations = await readPizzaConfirmationState(state);
    const result = { ...confirmations.find((item) => item.role === role), skipped: chosen.status === 'sent', requeued };
    // "sent" records provider acceptance only; it is not recipient delivery.
    return res.status(processingError ? 503 : 200).json({
      ok: !processingError, orderId: state.orderId, confirmations, result,
      ...(processingError ? { error: 'email-service-unavailable' } : {}),
    });
  }));

  // Owner marks an order ready / shipped. The customer notice is queued in the
  // durable outbox before the order is flagged, so a provider outage can never
  // leave an order marked ready without a recoverable message. Calling again on
  // a failed or dead-lettered notice re-queues it; a sent notice is never resent.
  router.post('/pizza-on-smith/orders/:orderId/ready', ownerGuarded(async (req, res) => {
    if (!emailOutboxService) return res.status(503).json({ error: 'email service unavailable' });
    const where = { ...pizzaOrderWhere, id: req.params.orderId };
    const order = await prismaClient.commercialOrder.findFirst({ where, select: pizzaOrderSelect });
    if (!order) return res.status(404).json({ error: 'paid-pizza-order-not-found' });
    if (!order.customerEmail) return res.status(409).json({ error: 'customer-email-missing' });

    const metadata = order.metadata || {};
    const facts = metadata.saleConfirmationFacts || {};
    const method = methodOf(metadata);
    const trackingNumber = String(req.body?.trackingNumber || '').trim().slice(0, 80);
    const carrier = String(req.body?.carrier || '').trim().slice(0, 40);
    if (method === 'shipping' && !trackingNumber) {
      return res.status(422).json({ error: 'tracking-number-required' });
    }

    const drop = await getPizzaDrop();
    const paymentReference = order.paymentAttempts?.[0]?.externalPaymentId || order.sourceId;
    const idempotencyKey = `square-payment-${paymentReference}-pizza-on-smith-ready`;
    const notice = buildPizzaReadyNotice({
      order,
      method,
      paymentReference,
      fulfillmentLabel: drop.fulfillmentLabel,
      pickupAddress: metadata.pickup?.address || facts.pickup?.address || '',
      deliveryAddress: formatAddress(metadata.deliveryAddress || facts.deliveryAddress),
      tracking: { number: trackingNumber, carrier },
    });
    const queued = await emailOutboxService.enqueue({
      idempotencyKey,
      category: 'transactional',
      source: 'pizza-on-smith-ready',
      context: { orderId: order.id, paymentReference, role: 'customer-ready', method },
      payload: {
        to: [{ email: order.customerEmail, name: order.customerName || 'Pizza on Smith customer' }],
        sender: {
          email: process.env.SENDER_EMAIL || process.env.SUPPORT_INBOX_EMAIL || process.env.TEAM_INBOX_EMAIL || REPLY_EMAIL,
          name: 'Pizza on Smith',
        },
        replyTo: { email: REPLY_EMAIL, name: 'Pizza on Smith' },
        subject: notice.subject,
        textContent: `Hi ${order.customerName || 'there'},\n\n${notice.headline}\n\n${notice.details}\n\n${notice.contact}\n\n- Local Effort`,
        htmlContent: `<p>Hi ${escapeHtml(order.customerName || 'there')},</p><p>${escapeHtml(notice.headline)}</p><pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(notice.details)}</pre><p>${escapeHtml(notice.contact)}</p><p>- Local Effort</p>`,
      },
    });

    let requeued = false;
    if (queued.deduped && ['retry', 'dead_letter'].includes(queued.status) && emailOutboxService.requeue) {
      requeued = (await emailOutboxService.requeue(idempotencyKey)).requeued;
    }
    let delivery = { picked: 0, sent: 0, retried: 0, deadLetter: 0, skippedSuppressed: 0 };
    if (!queued.deduped || requeued || queued.status === 'queued') {
      delivery = await emailOutboxService.processBatch({ ids: [queued.id], limit: 1, source: 'pizza-on-smith-ready' });
    }
    const status = delivery.sent ? 'sent'
      : delivery.deadLetter || delivery.skippedSuppressed ? 'dead_letter'
        : delivery.retried ? 'retry' : queued.deduped && !requeued ? queued.status || 'queued' : 'queued';

    // One write, from a fresh read, so a webhook that touched metadata while the
    // email was sending is not overwritten by this request's earlier copy.
    const fresh = await prismaClient.commercialOrder.findFirst({ where, select: { metadata: true } });
    const current = fresh?.metadata || metadata;
    const previous = current.pizzaOnSmithReady || {};
    const now = new Date().toISOString();
    await prismaClient.commercialOrder.update({
      where: { id: order.id },
      data: {
        metadata: {
          ...current,
          pizzaOnSmithReady: {
            ...previous,
            queuedAt: previous.queuedAt || now,
            outboxId: queued.id,
            method,
            status,
            ...(method === 'shipping' ? { trackingNumber, carrier } : {}),
            lastDeliveryAttemptAt: now,
            ...(delivery.sent ? { sentAt: now } : {}),
            delivery,
          },
        },
      },
    });
    return res.json({ ok: true, orderId: order.id, ready: true, method, status, deduped: queued.deduped, requeued, outboxId: queued.id, delivery });
  }));
  /**
   * GET /api/sales/pipeline
   * Everything promised but not finished, by stage, with its value and age.
   * Answers "which opportunities are closest to conversion" — closest means
   * furthest down the stage list with a service date soonest.
   */
  router.get('/pipeline', guarded(async (req, res) => {
    const now = new Date();
    const orders = await prisma.commercialOrder.findMany({
      where: { status: { in: PIPELINE_STATUSES } },
      orderBy: [{ serviceStartAt: 'asc' }, { createdAt: 'asc' }],
      take: 500,
      select: {
        id: true, channel: true, businessLineKey: true, status: true,
        customerName: true, customerEmail: true, totalCents: true,
        serviceStartAt: true, bookedAt: true, createdAt: true,
        invoices: { select: { id: true, totalCents: true, outstandingCents: true, status: true } },
      },
    });

    const byStage = {};
    for (const order of orders) {
      const stage = order.status;
      byStage[stage] = byStage[stage] || { stage, count: 0, valueCents: 0 };
      byStage[stage].count += 1;
      byStage[stage].valueCents += order.totalCents;
    }

    const opportunities = orders.map((order) => ({
      orderId: order.id,
      channel: order.channel,
      businessLineKey: order.businessLineKey,
      stage: order.status,
      customer: order.customerName || order.customerEmail || null,
      valueCents: order.totalCents,
      serviceStartAt: order.serviceStartAt,
      ageDays: daysBetween(order.createdAt, now),
      daysToService: order.serviceStartAt ? daysBetween(now, order.serviceStartAt) : null,
      billedCents: order.invoices.reduce((sum, invoice) => sum + invoice.totalCents, 0),
      outstandingCents: order.invoices.reduce((sum, invoice) => sum + invoice.outstandingCents, 0),
    }));

    return res.json({
      ok: true,
      generatedAt: now.toISOString(),
      stages: Object.values(byStage).sort((a, b) => b.valueCents - a.valueCents),
      totalPipelineCents: orders.reduce((sum, order) => sum + order.totalCents, 0),
      opportunities,
    });
  }));

  /**
   * GET /api/sales/expected?windows=7,30,90
   * What revenue is expected in each window, split by how much we actually know.
   */
  router.get('/expected', guarded(async (req, res) => {
    const now = new Date();
    const windows = parseWindows(req.query.windows);
    const horizonDays = Math.max(...windows);
    const horizon = new Date(now.getTime() + horizonDays * DAY_MS);

    const [dueInvoices, bookedOrders, subscriptions] = await Promise.all([
      prisma.commercialInvoice.findMany({
        where: {
          status: { in: OPEN_INVOICE_STATUSES },
          outstandingCents: { gt: 0 },
          dueAt: { not: null, lte: horizon },
        },
        select: { id: true, dueAt: true, outstandingCents: true, orderId: true },
      }),
      prisma.commercialOrder.findMany({
        where: {
          status: 'booked',
          serviceStartAt: { not: null, gte: now, lte: horizon },
        },
        select: {
          id: true, totalCents: true, serviceStartAt: true, channel: true, businessLineKey: true,
          invoices: { select: { totalCents: true } },
        },
      }),
      prisma.commercialSubscription.findMany({
        where: { status: 'active' },
        select: { id: true, billingCadence: true, recurringBaseCents: true },
      }),
    ]);

    const byWindow = windows.sort((a, b) => a - b).map((days) => {
      const edge = new Date(now.getTime() + days * DAY_MS);

      const billed = dueInvoices.filter((invoice) => invoice.dueAt <= edge);
      const observedCents = centsSum(billed);

      // Booked work inside the window that has not been invoiced yet. Only the
      // uninvoiced remainder counts, or it would double the billed figure.
      const unbilledCents = bookedOrders
        .filter((order) => order.serviceStartAt <= edge)
        .reduce((sum, order) => {
          const invoiced = order.invoices.reduce((total, invoice) => total + invoice.totalCents, 0);
          return sum + Math.max(0, order.totalCents - invoiced);
        }, 0);

      const duesCents = subscriptions.reduce(
        (sum, subscription) => sum + modeledDuesInWindow(subscription, days),
        0,
      );

      return {
        windowDays: days,
        observed: { billedDueCents: observedCents, invoiceCount: billed.length },
        modeled: { unbilledBookedCents: unbilledCents, subscriptionDuesCents: duesCents },
        // Deliberately no grand total: adding a billed invoice to a modeled
        // subscription accrual would present a guess as a receivable.
      };
    });

    return res.json({ ok: true, generatedAt: now.toISOString(), windows: byWindow });
  }));

  /**
   * GET /api/sales/collections
   * Receivables aging. Answers "what is owed, by whom, and how late".
   */
  router.get('/collections', guarded(async (req, res) => {
    const now = new Date();
    const invoices = await prisma.commercialInvoice.findMany({
      where: { status: { in: OPEN_INVOICE_STATUSES }, outstandingCents: { gt: 0 } },
      orderBy: { dueAt: 'asc' },
      take: 1000,
      select: {
        id: true, invoiceNumber: true, totalCents: true, outstandingCents: true,
        issuedAt: true, dueAt: true, status: true, sourceSystem: true,
        agreement: { select: { id: true, title: true, counterpartyName: true, businessLineKey: true } },
        order: { select: { id: true, channel: true, customerName: true, customerEmail: true } },
      },
    });

    const buckets = {
      notYetDue: { label: 'Not yet due', count: 0, outstandingCents: 0 },
      d1_30: { label: '1-30 days late', count: 0, outstandingCents: 0 },
      d31_60: { label: '31-60 days late', count: 0, outstandingCents: 0 },
      d61_90: { label: '61-90 days late', count: 0, outstandingCents: 0 },
      d90plus: { label: '90+ days late', count: 0, outstandingCents: 0 },
      noDueDate: { label: 'No due date recorded', count: 0, outstandingCents: 0 },
    };

    const rows = invoices.map((invoice) => {
      const overdueDays = invoice.dueAt ? daysBetween(invoice.dueAt, now) : null;
      let bucket = 'noDueDate';
      if (overdueDays !== null) {
        if (overdueDays <= 0) bucket = 'notYetDue';
        else if (overdueDays <= 30) bucket = 'd1_30';
        else if (overdueDays <= 60) bucket = 'd31_60';
        else if (overdueDays <= 90) bucket = 'd61_90';
        else bucket = 'd90plus';
      }
      buckets[bucket].count += 1;
      buckets[bucket].outstandingCents += invoice.outstandingCents;

      return {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        account: invoice.agreement?.counterpartyName || invoice.order?.customerName || invoice.order?.customerEmail || null,
        businessLineKey: invoice.agreement?.businessLineKey || null,
        channel: invoice.order?.channel || invoice.sourceSystem,
        totalCents: invoice.totalCents,
        outstandingCents: invoice.outstandingCents,
        dueAt: invoice.dueAt,
        overdueDays: overdueDays !== null ? Math.max(0, overdueDays) : null,
      };
    });

    return res.json({
      ok: true,
      generatedAt: now.toISOString(),
      totalOutstandingCents: centsSum(invoices),
      buckets: Object.entries(buckets).map(([key, value]) => ({ key, ...value })),
      invoices: rows.slice(0, 200),
    });
  }));

  /**
   * GET /api/sales/reorders?dueOnly=true
   * Who bought, how often, and who is overdue to buy again. Cadence is only
   * claimed for customers with at least two orders — one purchase is not a
   * pattern, and pretending otherwise produces a contact list of noise.
   */
  router.get('/reorders', guarded(async (req, res) => {
    const now = new Date();
    const orders = await prisma.commercialOrder.findMany({
      where: { status: 'paid', customerEmail: { not: null } },
      orderBy: { bookedAt: 'asc' },
      take: 5000,
      select: {
        id: true, customerEmail: true, customerName: true, channel: true,
        businessLineKey: true, totalCents: true, bookedAt: true, createdAt: true,
      },
    });

    const byCustomer = new Map();
    for (const order of orders) {
      const email = order.customerEmail.toLowerCase();
      const at = order.bookedAt || order.createdAt;
      const entry = byCustomer.get(email) || {
        email,
        name: order.customerName || null,
        orderCount: 0,
        totalCents: 0,
        channels: new Set(),
        dates: [],
      };
      entry.orderCount += 1;
      entry.totalCents += order.totalCents;
      entry.channels.add(order.channel);
      entry.dates.push(at);
      if (!entry.name && order.customerName) entry.name = order.customerName;
      byCustomer.set(email, entry);
    }

    const customers = [...byCustomer.values()].map((entry) => {
      const dates = entry.dates.sort((a, b) => a - b);
      const lastOrderAt = dates[dates.length - 1];
      const daysSinceLast = daysBetween(lastOrderAt, now);

      let medianGapDays = null;
      if (dates.length >= 2) {
        const gaps = dates.slice(1).map((date, index) => daysBetween(dates[index], date));
        const sorted = gaps.sort((a, b) => a - b);
        medianGapDays = sorted[Math.floor(sorted.length / 2)];
      }

      return {
        email: entry.email,
        name: entry.name,
        orderCount: entry.orderCount,
        totalCents: entry.totalCents,
        channels: [...entry.channels],
        firstOrderAt: dates[0],
        lastOrderAt,
        daysSinceLast,
        medianGapDays,
        // Overdue only means overdue against their own established rhythm.
        reorderDue: medianGapDays !== null && medianGapDays > 0
          ? daysSinceLast > medianGapDays * 1.25
          : null,
      };
    });

    const dueOnly = String(req.query.dueOnly) === 'true';
    const filtered = dueOnly ? customers.filter((customer) => customer.reorderDue) : customers;

    return res.json({
      ok: true,
      generatedAt: now.toISOString(),
      customerCount: customers.length,
      dueCount: customers.filter((customer) => customer.reorderDue).length,
      customers: filtered
        .sort((a, b) => b.totalCents - a.totalCents)
        .slice(0, 250),
    });
  }));

  /**
   * GET /api/sales/channels
   * Revenue by channel and business line, plus the keys Local Budget needs to
   * return margin against. No margin is computed here on purpose.
   */
  router.get('/channels', guarded(async (req, res) => {
    const now = new Date();
    const sinceDays = Number.parseInt(req.query.days, 10);
    const since = new Date(now.getTime() - (Number.isInteger(sinceDays) ? sinceDays : 365) * DAY_MS);

    const grouped = await prisma.commercialOrder.groupBy({
      by: ['channel', 'businessLineKey', 'status'],
      where: { createdAt: { gte: since } },
      _sum: { totalCents: true },
      _count: true,
    });

    const lines = new Map();
    for (const row of grouped) {
      const key = `${row.channel}::${row.businessLineKey || 'unassigned'}`;
      const entry = lines.get(key) || {
        channel: row.channel,
        businessLineKey: row.businessLineKey || null,
        businessLineLabel: BUSINESS_LINES[row.businessLineKey]?.label || null,
        brainBusinessLine: BUSINESS_LINES[row.businessLineKey]?.brainBusinessLine || null,
        paidCents: 0,
        pipelineCents: 0,
        orderCount: 0,
      };
      const amount = Number(row._sum.totalCents || 0);
      entry.orderCount += row._count;
      if (row.status === 'paid') entry.paidCents += amount;
      else if (PIPELINE_STATUSES.includes(row.status)) entry.pipelineCents += amount;
      lines.set(key, entry);
    }

    return res.json({
      ok: true,
      generatedAt: now.toISOString(),
      since: since.toISOString(),
      marginSource: 'local_budget',
      marginNote: 'Join on businessLineKey and commercialOrderId. Local Budget returns measured or explicitly modeled margin; this endpoint never estimates it.',
      channels: [...lines.values()].sort((a, b) => b.paidCents - a.paidCents),
    });
  }));

  /**
   * GET /api/sales/coverage
   * The calibration number the staged plan's kill condition is measured on:
   * how much captured money is attached to a commercial record.
   */
  router.get('/coverage', guarded(async (req, res) => {
    const now = new Date();
    const sinceDays = Number.parseInt(req.query.days, 10);
    const since = new Date(now.getTime() - (Number.isInteger(sinceDays) ? sinceDays : 30) * DAY_MS);

    const [transactions, allocated, attempts] = await Promise.all([
      prisma.financePaymentTransaction.aggregate({
        where: { occurredAt: { gte: since } },
        _sum: { grossCents: true },
        _count: true,
      }),
      prisma.financePaymentAllocation.aggregate({
        where: { transaction: { occurredAt: { gte: since } } },
        _sum: { amountCents: true },
      }),
      prisma.financePaymentAttempt.groupBy({
        by: ['status'],
        where: { startedAt: { gte: since } },
        _count: true,
      }),
    ]);

    const capturedCents = Number(transactions._sum.grossCents || 0);
    const allocatedCents = Number(allocated._sum.amountCents || 0);

    return res.json({
      ok: true,
      generatedAt: now.toISOString(),
      since: since.toISOString(),
      capturedCents,
      allocatedCents,
      unallocatedCents: Math.max(0, capturedCents - allocatedCents),
      allocationCoveragePct: capturedCents
        ? Number(((allocatedCents / capturedCents) * 100).toFixed(1))
        : null,
      transactionCount: transactions._count,
      attemptsByStatus: Object.fromEntries(attempts.map((row) => [row.status, row._count])),
    });
  }));

  router.get('/products', guarded(async (req, res) => {
    const days = Math.min(3650, Math.max(1, Number.parseInt(req.query.days, 10) || 365));
    const since = new Date(Date.now() - days * DAY_MS);
    const lines = await prisma.commercialOrderLine.findMany({
      where: { order: { status: 'paid', createdAt: { gte: since } }, lineType: 'item' },
      select: { quantity: true, totalCents: true, createdAt: true, commercialProductId: true, commercialOfferId: true, order: { select: { id: true, businessLineKey: true, channel: true, bookedAt: true, createdAt: true } }, commercialProduct: { select: { key: true, name: true } }, commercialOffer: { select: { key: true, name: true } } },
    });
    const grouped = new Map();
    const coverage = { unmappedPaidLineCount: 0, unmappedPaidCents: 0 };
    for (const line of lines) {
      if (!line.commercialProduct || !line.commercialOffer) {
        coverage.unmappedPaidLineCount += 1;
        coverage.unmappedPaidCents += line.totalCents;
        continue;
      }
      const key = `${line.commercialOffer.key}::${line.order.businessLineKey || ''}::${line.order.channel}`;
      const at = line.order.bookedAt || line.order.createdAt || line.createdAt;
      const entry = grouped.get(key) || { commercialProductKey: line.commercialProduct.key, commercialProductName: line.commercialProduct.name, commercialOfferKey: line.commercialOffer.key, commercialOfferName: line.commercialOffer.name, businessLineKey: line.order.businessLineKey, channel: line.order.channel, orderIds: new Set(), units: 0, grossPaidCents: 0, firstSale: at, latestSale: at };
      entry.orderIds.add(line.order.id); entry.units += line.quantity; entry.grossPaidCents += line.totalCents;
      if (at < entry.firstSale) entry.firstSale = at; if (at > entry.latestSale) entry.latestSale = at;
      grouped.set(key, entry);
    }
    return res.json({ ok: true, generatedAt: new Date().toISOString(), since: since.toISOString(), products: [...grouped.values()].map(({ orderIds, ...entry }) => ({ ...entry, orderCount: orderIds.size })).sort((a, b) => b.grossPaidCents - a.grossPaidCents), coverage });
  }));

  return router;
}

module.exports = { createSalesRouter };
