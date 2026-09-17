'use strict';

/**
 * Authenticated membership scope derivation.
 *
 * Replaces "one access level per user" (HubProfile.accessLevel) with scope that
 * is derived, per request, from organization-scoped membership. A caller gets an
 * organization, a class, relationship roles, and entitlement codes — or nothing.
 *
 * Fail closed is the whole point. Every path that cannot positively prove an
 * active, agreed, paid-up membership returns EMPTY_SCOPE. There is no default
 * membership, no implied organization, and no entitlement inferred from an
 * access level. A Prisma failure is a denial, not a degradation.
 *
 * Activation gates, in order — a membership must clear all four:
 *   1. identity      — profile exists and profile.status === 'active'
 *   2. agreements    — membership.agreementAcceptedAt is set
 *   3. payment       — dues-bearing classes need an active dues plan; a $0
 *                      waived class needs none
 *   4. entitlements  — the class resolves to a non-empty entitlement set
 *
 * Follows the `createAdminVerifier` / `createOwnerVerifier` factory convention in
 * backend/api/utils/adminVerifier.js: a factory takes its collaborators and
 * returns one async function that resolves to a value or to a closed default.
 */

const {
  BILLING_AUTHORITY,
  DUES_PLAN_STATUS,
  MEMBERSHIP_STATUS,
  resolveEntitlementCodes,
  seedMembershipClass,
} = require('./membershipClasses');

/**
 * The single closed result. Frozen so a caller cannot mutate the shared denial
 * into something permissive.
 */
const EMPTY_SCOPE = Object.freeze({
  authenticated: false,
  userId: null,
  email: null,
  profileId: null,
  memberships: Object.freeze([]),
  organizations: Object.freeze([]),
  organizationIds: Object.freeze([]),
  relationshipRoles: Object.freeze([]),
  entitlements: Object.freeze([]),
  coopCreditBalanceCents: 0,
  reason: 'denied',
});

function closedScope(reason) {
  return Object.freeze({ ...EMPTY_SCOPE, reason });
}

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email || null;
}

function asTime(value) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/**
 * A persisted seeded class must match the code definition that grants access.
 * Configuration drift is a denial rather than a silent pricing or entitlement
 * change.
 */
function resolveActiveClass(classRow) {
  const seeded = seedMembershipClass(classRow?.code);
  if (!seeded || classRow.active === false) return null;

  const matchesSeed = (
    classRow.duesCadence === seeded.duesCadence
    && classRow.duesCents === seeded.duesCents
    && classRow.waivedEligible === seeded.waivedEligible
    && classRow.accruesCoopCredit === seeded.accruesCoopCredit
    && classRow.coopCreditBasisPoints === seeded.coopCreditBasisPoints
    && (classRow.coopCreditCadence || null) === seeded.coopCreditCadence
    && classRow.coopCreditNonExpiring === seeded.coopCreditNonExpiring
  );
  return matchesSeed ? seeded : null;
}

/**
 * Gate 3. A dues-bearing class needs an active, matching plan under the same
 * billing authority. Square plans also need their external subscription id.
 */
function satisfiedPaymentPlan(membership, classDefinition, now) {
  if (classDefinition.duesCents === 0) return null;
  const plans = Array.isArray(membership.duesPlans) ? membership.duesPlans : [];
  return plans.find((plan) => {
    if (!plan || plan.status !== DUES_PLAN_STATUS.ACTIVE) return false;
    if (plan.cadence !== classDefinition.duesCadence) return false;
    if (plan.amountCents !== classDefinition.duesCents) return false;
    if (plan.billingAuthority !== membership.billingAuthority) return false;
    if (
      plan.billingAuthority === BILLING_AUTHORITY.SQUARE
      && !String(plan.externalSubscriptionRef || '').trim()
    ) return false;

    const periodEnd = asTime(plan.currentPeriodEnd);
    return periodEnd === null || periodEnd > now;
  }) || null;
}

/** Gates 2-4 for one membership row. Gate 1 is checked once, on the profile. */
function isActivated(membership, classDefinition, entitlements, paymentPlan, now) {
  if (!membership || membership.status !== MEMBERSHIP_STATUS.ACTIVE) return false;
  if (!classDefinition) return false;

  const activatedAt = asTime(membership.activatedAt);
  if (activatedAt === null || activatedAt > now) return false;

  const deactivatedAt = asTime(membership.deactivatedAt);
  if (deactivatedAt !== null && deactivatedAt <= now) return false;

  if (asTime(membership.agreementAcceptedAt) === null) return false;
  if (classDefinition.duesCents > 0 && !paymentPlan) return false;

  return entitlements.length > 0;
}

function coopCreditForMembership(paymentPlan, classDefinition) {
  if (!classDefinition.accruesCoopCredit || !paymentPlan) return 0;
  const cents = Number(paymentPlan.coopCreditBalanceCents);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : 0;
}

/**
 * Build the membership scope resolver.
 *
 * @param {object} deps
 * @param {import('@prisma/client').PrismaClient} deps.prisma
 * @param {() => Date} [deps.now] injectable clock, for tests
 * @returns {(identity: object|null) => Promise<Readonly<object>>} deriveMembershipScope
 *
 * The returned `deriveMembershipScope(identity)` takes an ALREADY-VERIFIED
 * Supabase identity (what `createAdminVerifier`/`createOwnerVerifier` resolve to,
 * i.e. a `user` with `id` and `email`) and resolves to a frozen scope. It never
 * verifies a token itself and never throws: on any failure it resolves to a
 * closed scope whose `reason` explains the denial.
 *
 * Denial reasons: `no-identity`, `unknown-profile`, `inactive-profile`,
 * `no-active-membership`, `scope-lookup-failed`.
 */
function createMembershipScopeResolver({ prisma, now = () => new Date() } = {}) {
  return async function deriveMembershipScope(identity) {
    const userId = String(identity?.id || '').trim();
    if (!prisma || !userId) return closedScope('no-identity');

    try {
      const profile = await prisma.hubProfile.findUnique({ where: { userId } });
      if (!profile) return closedScope('unknown-profile');
      if (profile.status !== 'active') return closedScope('inactive-profile');

      const at = now().getTime();

      const [membershipRows, roleRows] = await Promise.all([
        prisma.membership.findMany({
          where: { profileId: profile.id },
          include: { class: true, organization: true, duesPlans: true },
          orderBy: { id: 'asc' },
        }),
        prisma.membershipRelationshipRole.findMany({
          where: { profileId: profile.id, status: 'active', revokedAt: null },
          orderBy: [{ organizationId: 'asc' }, { role: 'asc' }],
        }),
      ]);

      const memberships = [];
      const organizations = new Map();
      const entitlements = new Set();
      let coopCreditBalanceCents = 0;

      for (const row of Array.isArray(membershipRows) ? membershipRows : []) {
        const classDefinition = resolveActiveClass(row?.class);
        const codes = resolveEntitlementCodes(classDefinition?.code);
        const paymentPlan = classDefinition
          ? satisfiedPaymentPlan(row, classDefinition, at)
          : null;
        if (!isActivated(row, classDefinition, codes, paymentPlan, at)) continue;
        const membershipCreditCents = coopCreditForMembership(paymentPlan, classDefinition);

        memberships.push(Object.freeze({
          id: row.id,
          organizationId: row.organizationId,
          classCode: classDefinition.code,
          classLabel: classDefinition.label,
          duesCadence: classDefinition.duesCadence,
          duesCents: classDefinition.duesCents,
          waived: classDefinition.duesCents === 0,
          accruesCoopCredit: classDefinition.accruesCoopCredit,
          coopCreditBasisPoints: classDefinition.coopCreditBasisPoints,
          coopCreditNonExpiring: classDefinition.coopCreditNonExpiring,
          coopCreditBalanceCents: membershipCreditCents,
          billingAuthority: row.billingAuthority,
          duesPlan: paymentPlan ? Object.freeze({
            status: paymentPlan.status,
            cadence: paymentPlan.cadence,
            amountCents: paymentPlan.amountCents,
            billingAuthority: paymentPlan.billingAuthority,
            externalSubscriptionRef: paymentPlan.externalSubscriptionRef,
            currentPeriodStart: paymentPlan.currentPeriodStart || null,
            currentPeriodEnd: paymentPlan.currentPeriodEnd || null,
          }) : null,
          activatedAt: row.activatedAt,
          agreementAcceptedAt: row.agreementAcceptedAt,
          entitlements: Object.freeze(codes),
        }));

        if (row.organization && !organizations.has(row.organizationId)) {
          organizations.set(row.organizationId, Object.freeze({
            id: row.organization.id,
            name: row.organization.name,
            slug: row.organization.slug || null,
          }));
        }
        for (const code of codes) entitlements.add(code);
        coopCreditBalanceCents += membershipCreditCents;
      }

      if (memberships.length === 0) return closedScope('no-active-membership');

      // Roles are only in scope for organizations the caller actually has an
      // activated membership in — a stale role row cannot widen reach.
      const relationshipRoles = (Array.isArray(roleRows) ? roleRows : [])
        .filter((row) => organizations.has(row?.organizationId))
        .map((row) => Object.freeze({
          organizationId: row.organizationId,
          role: row.role,
          grantedAt: row.grantedAt,
        }));

      return Object.freeze({
        authenticated: true,
        userId: profile.userId,
        email: normalizeEmail(profile.email),
        profileId: profile.id,
        memberships: Object.freeze(memberships),
        organizations: Object.freeze([...organizations.values()]),
        organizationIds: Object.freeze([...organizations.keys()]),
        relationshipRoles: Object.freeze(relationshipRoles),
        entitlements: Object.freeze([...entitlements].sort()),
        coopCreditBalanceCents,
        reason: 'ok',
      });
    } catch (_err) {
      // A lookup failure is a denial. Never fall back to an access level.
      return closedScope('scope-lookup-failed');
    }
  };
}

function hasEntitlement(scope, code) {
  if (!scope?.authenticated || !code) return false;
  return scope.entitlements.includes(code);
}

function hasOrganizationRole(scope, organizationId, role) {
  if (!scope?.authenticated || !organizationId || !role) return false;
  return scope.relationshipRoles.some(
    (entry) => entry.organizationId === organizationId && entry.role === role
  );
}

module.exports = {
  EMPTY_SCOPE,
  createMembershipScopeResolver,
  hasEntitlement,
  hasOrganizationRole,
};
