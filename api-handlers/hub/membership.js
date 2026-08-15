/**
 * Hub membership — the Localist member's own membership page.
 *
 * A member lands here from the link in their signup confirmation email and sees
 * four things: their perks, what they have spent with the co-op (and the 4%
 * credit that spending has earned), notes we have written to members, and the
 * way into the 308B member capital offerings.
 *
 * Strictly self-scoped. Spending is aggregated from HubLocalistOrder rows that
 * match the authenticated viewer's own email; there is no way to ask for anyone
 * else's. Staff and privileged callers may target a member with ?email= so
 * support can see what the member sees.
 *
 *   GET /api/hub/membership          → { ok, membership, spending, credit, messages }
 */

const { prisma } = require('../_lib/prisma');
const { getSupabase } = require('../../backend/api/supabaseClient');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');

// Paid membership earns 4% of spend back as co-op credit each quarter. Waived
// memberships do not — see the FAQ on /localist. Keep this in step with that page.
const CREDIT_RATE = 0.04;

const TIERS = {
  monthly: { key: 'monthly', label: 'Monthly', paying: true, price: '$45/month', amountCents: 4500, cadence: 'monthly' },
  annual: { key: 'annual', label: 'Annual', paying: true, price: '$375/year', amountCents: 37500, cadence: 'annual' },
  waived: { key: 'waived', label: 'Cost waived', paying: false, price: '$0', amountCents: 0, cadence: 'waived' },
};
const UNKNOWN_TIER = { key: 'unknown', label: 'Localist', paying: false, price: null, amountCents: null, cadence: 'unknown' };

function tierFromKey(raw) {
  const key = String(raw || '').toLowerCase().trim();
  return TIERS[key] || null;
}

/**
 * The membership roster is the Supabase `localist_members` table, written by
 * api-handlers/localist/subscribe.js — that, not HubProfile, is where a tier
 * actually lives. HubProfile.title is only a fallback for members who were set
 * up by hand through a Hub invite. Non-fatal: a Supabase hiccup degrades to
 * "Localist" rather than failing the page.
 */
async function loadRosterMembership(email) {
  const supabase = getSupabase();
  if (!supabase || !email) return null;
  try {
    const { data, error } = await supabase
      .from('localist_members')
      .select('*')
      .ilike('email', email)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) {
      console.warn('[hub/membership] roster lookup failed:', error.message || error.code);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    return {
      tier: tierFromKey(row.tier),
      status: row.status ? String(row.status).toLowerCase() : null,
      joinedAt: row.joined_at || row.created_at || row.signup_date || row.updated_at || null,
      squareCustomerId: row.square_customer_id || null,
      squareOrderId: row.square_order_id || null,
      squarePaymentId: row.square_payment_id || null,
      squareSubscriptionId: row.square_subscription_id || null,
    };
  } catch (err) {
    console.warn('[hub/membership] roster lookup threw:', err.message);
    return null;
  }
}

function quarterStart(now = new Date()) {
  const q = Math.floor(now.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(now.getUTCFullYear(), q, 1));
}

async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const denied = requireHubAccess(auth, {
    allowedAccess: ['localist', 'customer', 'staff', 'privileged'],
  });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  const profile = auth.hubProfile || null;
  // Support override: only staff/privileged may look at another member.
  const requested = auth.isStaff ? cleanString(req.query?.email, 320) : '';
  const email = (requested || profile?.email || auth.viewer?.email || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'No member email resolved' });

  try {
    const paidOrdersWhere = {
      customerEmail: { equals: email, mode: 'insensitive' },
      paidAt: { not: null },
    };
    const qStart = quarterStart();
    const [roster, orderTotals, quarterTotals, recentOrders, notes] = await Promise.all([
      loadRosterMembership(email),
      prisma.hubLocalistOrder.aggregate({
        where: paidOrdersWhere,
        _sum: { totalCents: true },
        _count: { _all: true },
        _max: { paidAt: true },
      }),
      prisma.hubLocalistOrder.aggregate({
        where: { ...paidOrdersWhere, paidAt: { gte: qStart } },
        _sum: { totalCents: true },
      }),
      prisma.hubLocalistOrder.findMany({
        where: paidOrdersWhere,
        select: { id: true, totalCents: true, totalQuantity: true, paidAt: true, squareReceiptUrl: true, pickupWindow: true },
        orderBy: { paidAt: 'desc' },
        take: 12,
      }),
      prisma.hubDocument.findMany({
        where: { status: 'published', visibility: 'member' },
        select: { id: true, title: true, summary: true, body: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalCents = orderTotals?._sum?.totalCents || 0;
    const orderCount = orderTotals?._count?._all || 0;
    const quarterCents = quarterTotals?._sum?.totalCents || 0;
    const tier = roster?.tier || tierFromKey(profile?.title) || UNKNOWN_TIER;
    const memberSince = roster?.joinedAt ? asIso(roster.joinedAt) : asIso(profile?.createdAt);
    const membershipStatus = roster?.status || profile?.status || 'unknown';

    return res.status(200).json({
      ok: true,
      membership: {
        email,
        displayName: profile?.displayName || null,
        accessLevel: profile?.accessLevel || null,
        status: membershipStatus,
        tier,
        memberSince,
      },
      dues: {
        status: membershipStatus,
        waived: tier.key === 'waived',
        amountCents: tier.amountCents,
        cadence: tier.cadence,
      },
      billing: {
        provider: 'square',
        subscription: roster?.squareSubscriptionId
          ? { id: roster.squareSubscriptionId, status: membershipStatus }
          : null,
        lastPaymentId: roster?.squarePaymentId || null,
        history: { available: false, entries: [] },
      },
      purchases: {
        totalCents,
        orderCount,
        lastOrderAt: orderTotals?._max?.paidAt ? asIso(orderTotals._max.paidAt) : null,
        quarterToDateCents: quarterCents,
        recent: recentOrders.map((o) => ({
          id: o.id,
          totalCents: o.totalCents,
          totalQuantity: o.totalQuantity,
          paidAt: asIso(o.paidAt),
          pickupWindow: o.pickupWindow || null,
          receiptUrl: o.squareReceiptUrl || null,
        })),
      },
      credit: {
        rate: CREDIT_RATE,
        eligible: tier.paying,
        basis: 'tracked-paid-food-purchases',
        lifetimeAccruedEstimateCents: tier.paying ? Math.round(totalCents * CREDIT_RATE) : 0,
        quarterToDateAccruedEstimateCents: tier.paying ? Math.round(quarterCents * CREDIT_RATE) : 0,
        note: 'Accrued estimate only. Finalized quarterly credit and spendable balances are not yet tracked in Hub.',
      },
      messages: notes.map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary || null,
        body: n.body,
        createdAt: asIso(n.createdAt),
      })),
    });
  } catch (err) {
    console.error('[hub/membership] error', err);
    return res.status(500).json({ error: 'Unable to load membership' });
  }
}

module.exports = handler;
module.exports._internals = { tierFromKey, quarterStart, loadRosterMembership, CREDIT_RATE, TIERS };
