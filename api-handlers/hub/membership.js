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
  monthly: { key: 'monthly', label: 'Monthly', paying: true, price: '$45/month' },
  annual: { key: 'annual', label: 'Annual', paying: true, price: '$375/year' },
  waived: { key: 'waived', label: 'Cost waived', paying: false, price: '$0' },
};
const UNKNOWN_TIER = { key: 'unknown', label: 'Localist', paying: false, price: null };

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
async function loadRosterTier(email) {
  const supabase = getSupabase();
  if (!supabase || !email) return null;
  try {
    const { data, error } = await supabase
      .from('localist_members')
      .select('tier, updated_at')
      .ilike('email', email)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (error) {
      console.warn('[hub/membership] roster lookup failed:', error.message || error.code);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    return { tier: tierFromKey(row.tier), joinedAt: row.updated_at || null };
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
    const [roster, orders, notes] = await Promise.all([
      loadRosterTier(email),
      prisma.hubLocalistOrder.findMany({
        where: { customerEmail: { equals: email, mode: 'insensitive' }, paidAt: { not: null } },
        select: { id: true, totalCents: true, totalQuantity: true, paidAt: true, squareReceiptUrl: true, pickupWindow: true },
        orderBy: { paidAt: 'desc' },
        take: 50,
      }),
      // "Messages from us" are Hub documents published to members. No new model:
      // visibility 'member' is the member-facing channel, same as 'staff' is
      // the internal one.
      prisma.hubDocument.findMany({
        where: { status: 'published', visibility: 'member' },
        select: { id: true, title: true, summary: true, body: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalCents = orders.reduce((sum, o) => sum + (o.totalCents || 0), 0);
    const qStart = quarterStart();
    const quarterOrders = orders.filter((o) => o.paidAt && new Date(o.paidAt) >= qStart);
    const quarterCents = quarterOrders.reduce((sum, o) => sum + (o.totalCents || 0), 0);

    // Roster first (the real signup record), HubProfile.title as a fallback for
    // hand-set-up members, then a neutral "Localist".
    const tier = roster?.tier || tierFromKey(profile?.title) || UNKNOWN_TIER;
    const memberSince = asIso(profile?.createdAt) || (roster?.joinedAt ? asIso(roster.joinedAt) : null);

    return res.status(200).json({
      ok: true,
      membership: {
        email,
        displayName: profile?.displayName || null,
        accessLevel: profile?.accessLevel || null,
        status: profile?.status || 'active',
        tier,
        memberSince,
      },
      spending: {
        totalCents,
        orderCount: orders.length,
        lastOrderAt: orders[0]?.paidAt ? asIso(orders[0].paidAt) : null,
        quarterToDateCents: quarterCents,
        orders: orders.slice(0, 12).map((o) => ({
          id: o.id,
          totalCents: o.totalCents,
          totalQuantity: o.totalQuantity,
          paidAt: asIso(o.paidAt),
          pickupWindow: o.pickupWindow || null,
          receiptUrl: o.squareReceiptUrl || null,
        })),
      },
      credit: {
        // Only paying tiers earn the credit. Waived members see the rate and a
        // zero, not a number they cannot spend.
        rate: CREDIT_RATE,
        eligible: tier.paying,
        lifetimeCents: tier.paying ? Math.round(totalCents * CREDIT_RATE) : 0,
        quarterToDateCents: tier.paying ? Math.round(quarterCents * CREDIT_RATE) : 0,
        nextPayoutNote: 'Credit lands in your account at the end of each quarter.',
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
module.exports._internals = { tierFromKey, quarterStart, loadRosterTier, CREDIT_RATE, TIERS };
