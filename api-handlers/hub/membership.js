/**
 * Hub membership — canonical, organization-scoped Localist membership state.
 *
 * The authenticated viewer may read only their own membership. Staff and
 * privileged callers may target another profile with ?email= for support. Hub
 * access, tier, dues, entitlements, and recorded co-op credit all come from the
 * fail-closed membership scope resolver; the legacy Supabase roster is not an
 * authorization or display fallback.
 */

const { prisma } = require('../_lib/prisma');
const { resolveHubViewer, requireHubAccess } = require('./_auth');
const { methodNotAllowed, asIso, cleanString } = require('./_http');
const {
  createMembershipScopeResolver,
  hasEntitlement,
} = require('../../backend/api/membership/membershipScope');
const { ENTITLEMENT } = require('../../backend/api/membership/membershipClasses');

function quarterStart(now = new Date()) {
  const q = Math.floor(now.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(now.getUTCFullYear(), q, 1));
}

function localEffortMembership(scope) {
  if (!scope?.authenticated) return null;
  const localEffort = scope.organizations.find((organization) => organization.slug === 'local-effort');
  return scope.memberships.find((membership) => (
    !localEffort || membership.organizationId === localEffort.id
  )) || null;
}

function publicTier(membership) {
  if (!membership) return null;
  return {
    key: membership.classCode.replace(/^localist_/, ''),
    code: membership.classCode,
    label: membership.classLabel,
    paying: membership.accruesCoopCredit,
    amountCents: membership.duesCents,
    cadence: membership.duesCadence,
  };
}

function emptyMembershipPayload() {
  return {
    ok: true,
    membership: null,
    dues: null,
    billing: { provider: null, subscription: null, history: { available: false, entries: [] } },
    purchases: {
      totalCents: 0,
      orderCount: 0,
      lastOrderAt: null,
      quarterToDateCents: 0,
      recent: [],
    },
    credit: {
      rate: 0,
      eligible: false,
      availableBalanceCents: 0,
      basis: 'canonical-membership-scope',
      lifetimeAccruedEstimateCents: 0,
      quarterToDateAccruedEstimateCents: 0,
      note: 'No active organization-scoped membership is recorded for this profile.',
    },
    messages: [],
  };
}

async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  if (!prisma) return res.status(503).json({ error: 'Database unavailable' });

  const auth = await resolveHubViewer(req, prisma, { includeMembershipScope: true });
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const denied = requireHubAccess(auth, {
    allowedAccess: ['localist', 'customer', 'staff', 'privileged'],
  });
  if (denied) return res.status(denied.status).json({ error: denied.error });

  try {
    const requested = auth.isStaff
      ? (cleanString(req.query?.email, 320) || '').toLowerCase()
      : '';
    let profile = auth.hubProfile || null;
    let membershipScope = auth.membershipScope;

    if (requested) {
      profile = await prisma.hubProfile.findUnique({ where: { email: requested } });
      if (!profile) return res.status(404).json({ error: 'Member profile not found' });
      membershipScope = await createMembershipScopeResolver({ prisma })({
        id: profile.userId,
        email: profile.email,
      });
    }

    const membership = localEffortMembership(membershipScope);
    if (!membership) return res.status(200).json(emptyMembershipPayload());

    const email = String(profile?.email || membershipScope.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'No member email resolved' });

    const paidOrdersWhere = {
      customerEmail: { equals: email, mode: 'insensitive' },
      paidAt: { not: null },
    };
    const qStart = quarterStart();
    const [orderTotals, quarterTotals, recentOrders, notes] = await Promise.all([
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
        select: {
          id: true,
          totalCents: true,
          totalQuantity: true,
          paidAt: true,
          squareReceiptUrl: true,
          pickupWindow: true,
        },
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
    const tier = publicTier(membership);
    const creditRate = membership.coopCreditBasisPoints / 10_000;
    const subscription = membership.duesPlan?.externalSubscriptionRef
      ? {
        id: membership.duesPlan.externalSubscriptionRef,
        status: membership.duesPlan.status,
        currentPeriodEnd: asIso(membership.duesPlan.currentPeriodEnd),
      }
      : null;

    return res.status(200).json({
      ok: true,
      membership: {
        email,
        displayName: profile?.displayName || null,
        accessLevel: profile?.accessLevel || null,
        status: 'active',
        tier,
        memberSince: asIso(membership.activatedAt),
        organizationId: membership.organizationId,
        entitlements: [...membership.entitlements],
      },
      dues: {
        status: membership.waived ? 'waived' : membership.duesPlan?.status || 'unknown',
        waived: membership.waived,
        amountCents: membership.duesCents,
        cadence: membership.duesCadence,
      },
      billing: {
        provider: membership.billingAuthority,
        subscription,
        history: { available: false, entries: [] },
      },
      purchases: {
        totalCents,
        orderCount,
        lastOrderAt: orderTotals?._max?.paidAt ? asIso(orderTotals._max.paidAt) : null,
        quarterToDateCents: quarterCents,
        recent: recentOrders.map((order) => ({
          id: order.id,
          totalCents: order.totalCents,
          totalQuantity: order.totalQuantity,
          paidAt: asIso(order.paidAt),
          pickupWindow: order.pickupWindow || null,
          receiptUrl: order.squareReceiptUrl || null,
        })),
      },
      credit: {
        rate: creditRate,
        eligible: hasEntitlement(membershipScope, ENTITLEMENT.COOP_CREDIT_ACCRUAL),
        availableBalanceCents: membership.coopCreditBalanceCents,
        nonExpiring: membership.coopCreditNonExpiring,
        basis: 'tracked-paid-food-purchases',
        lifetimeAccruedEstimateCents: membership.accruesCoopCredit
          ? Math.round(totalCents * creditRate)
          : 0,
        quarterToDateAccruedEstimateCents: membership.accruesCoopCredit
          ? Math.round(quarterCents * creditRate)
          : 0,
        note: 'The recorded balance is authoritative. Purchase-derived accrual figures remain estimates until quarterly posting.',
      },
      messages: notes.map((note) => ({
        id: note.id,
        title: note.title,
        summary: note.summary || null,
        body: note.body,
        createdAt: asIso(note.createdAt),
      })),
    });
  } catch (err) {
    console.error('[hub/membership] error', err);
    return res.status(500).json({ error: 'Unable to load membership' });
  }
}

module.exports = handler;
module.exports._internals = { quarterStart, localEffortMembership, publicTier };
