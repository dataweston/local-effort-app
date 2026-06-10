const { PrismaClient } = require('@prisma/client');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, tableMissing } = require('./_http');

let prisma = null;
try {
  prisma = new PrismaClient();
} catch (_err) {
  prisma = null;
}

function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    customerName: order.customerName,
    customerEmail: order.customerEmail || null,
    customerPhone: order.customerPhone || null,
    pickupWindow: order.pickupWindow,
    customerNote: order.customerNote || null,
    totalCents: order.totalCents,
    totalQuantity: order.totalQuantity,
    items: Array.isArray(order.items) ? order.items : [],
    checkoutStartedAt: asIso(order.checkoutStartedAt),
    paidAt: asIso(order.paidAt),
    createdAt: asIso(order.createdAt),
    squarePaymentLinkUrl: order.squarePaymentLinkUrl || null,
    squareOrderId: order.squareOrderId || null,
    squarePaymentId: order.squarePaymentId || null,
    squareCustomerId: order.squareCustomerId || null,
    squareReceiptUrl: order.squareReceiptUrl || null,
    localistWindowId: order.localistWindowId || null,
    sourceVisitorId: order.sourceVisitorId || null,
    sourceSessionId: order.sourceSessionId || null,
    entrySource: order.entrySource || null,
    brainLedgerEventId: order.brainLedgerEventId || null,
    brainInboxItemId: order.brainInboxItemId || null,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  try {
    const auth = await resolveHubViewer(req, prisma, { requireCustomer: false });
    const denied = requireHubAccess(auth, { privileged: true });
    if (denied) return res.status(denied.status).json({ error: denied.error });

    const limit = Math.max(1, Math.min(Number(req.query?.limit) || 50, 200));
    const hours = Math.max(1, Math.min(Number(req.query?.hours) || 168, 24 * 60));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const orders = await prisma.hubLocalistOrder.findMany({
      where: { checkoutStartedAt: { gte: since } },
      orderBy: { checkoutStartedAt: 'desc' },
      take: limit,
    });

    const paidOrders = orders.filter((order) => order.status === 'paid');
    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      since: since.toISOString(),
      summary: {
        orderCount: orders.length,
        paidCount: paidOrders.length,
        paidTotalCents: paidOrders.reduce((sum, order) => sum + (Number(order.totalCents) || 0), 0),
        pendingCount: orders.filter((order) => order.status !== 'paid' && order.status !== 'checkout_failed').length,
      },
      orders: orders.map(publicOrder),
    });
  } catch (err) {
    console.error('[hub/localist-orders] error', err);
    if (tableMissing(err)) return res.status(503).json({ error: 'Localist order storage is not ready. Run Prisma migrations.' });
    return res.status(500).json({ error: 'Unable to load Localist orders' });
  }
};
