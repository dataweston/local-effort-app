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

const { prisma } = require('../utils/prisma');
const { createAdminVerifier } = require('../utils/adminVerifier');
const { BUSINESS_LINES } = require('../finance/businessLines');

const verifyAdminRequest = createAdminVerifier();

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

function createSalesRouter({ logger = null } = {}) {
  const router = express.Router();

  const guarded = (handler) => async (req, res) => {
    const admin = await verifyAdminRequest(req);
    if (!admin) return res.status(403).json({ error: 'admin only' });
    if (!prisma) return res.status(503).json({ error: 'database unavailable' });
    try {
      return await handler(req, res);
    } catch (error) {
      logger?.error?.({ err: error, path: req.path }, 'sales view failed');
      return res.status(500).json({ error: 'internal-error' });
    }
  };

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

  return router;
}

module.exports = { createSalesRouter };
