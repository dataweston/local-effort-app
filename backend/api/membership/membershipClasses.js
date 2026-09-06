'use strict';

/**
 * Owner-confirmed Localist membership tiers, as code constants.
 *
 * These are the authority for every class currently allowed to grant access.
 * MembershipClass rows are seeded FROM these constants; a persisted row must
 * match its constant before scope derivation will activate it. Unknown class
 * codes resolve to no entitlements until an owner-approved code definition is
 * added here — fail closed.
 *
 * Confirmed facts encoded here:
 *   - monthly dues $45  = 4500 cents
 *   - annual dues  $375 = 37500 cents
 *   - waived dues  $0, and waived resolves to the same CORE set as paid plus the
 *     distinct low-cost menu entitlement
 *   - co-op credit accrues at 4% (400 basis points), quarterly, non-expiring
 *
 * Waived memberships do NOT accrue the 4% credit. Two independent sources agree:
 * `docs/agent-requests/2026-08-15-hub-next-session.md` line 35 ("Monthly and
 * annual tiers accrue 4% quarterly non-expiring co-op credit; waived does not")
 * and the CREDIT_RATE comment in `api-handlers/hub/membership.js`, which points
 * at the public /localist FAQ. `accruesCoopCredit` is a single named flag per
 * class, so an owner ruling to the contrary is a one-line flip plus its
 * assertion in the focused test.
 */

// Co-op credit terms. Shared by every accruing class; see CREDIT_RATE in
// api-handlers/hub/membership.js, which must stay in step with this.
const COOP_CREDIT_BASIS_POINTS = 400; // 4%
const COOP_CREDIT_CADENCE = 'quarterly';
const COOP_CREDIT_NON_EXPIRING = true;

const DUES_CADENCE = Object.freeze({
  MONTHLY: 'monthly',
  ANNUAL: 'annual',
  WAIVED: 'waived',
});

/**
 * Square is the current billing authority and stays that way until an explicit
 * owner-approved provider migration. `INTERNAL` exists so a future migration has
 * a value to move to; nothing selects it today.
 */
const BILLING_AUTHORITY = Object.freeze({
  SQUARE: 'square',
  INTERNAL: 'internal',
});
const CURRENT_BILLING_AUTHORITY = BILLING_AUTHORITY.SQUARE;

const MEMBERSHIP_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  CANCELLED: 'cancelled',
});

const DUES_PLAN_STATUS = Object.freeze({
  PENDING: 'pending',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELLED: 'cancelled',
});

const RELATIONSHIP_ROLE = Object.freeze({
  OWNER: 'owner',
  STAFF: 'staff',
  HOUSEHOLD_MEMBER: 'household_member',
});

const ENTITLEMENT = Object.freeze({
  MEMBERSHIP_CORE: 'membership_core',
  MEMBER_FIRST_MENU_ACCESS: 'member_first_menu_access',
  MEAL_PREP_ELIGIBILITY: 'meal_prep_eligibility',
  HUB_MEMBER_AREA: 'hub_member_area',
  COOP_CREDIT_ACCRUAL: 'coop_credit_accrual',
  LOW_COST_MENU: 'low_cost_menu',
});

/**
 * The core membership every approved member gets, paid or waived. Waived members
 * "otherwise receive the same core membership" — so this list is shared verbatim
 * rather than duplicated per class.
 */
const CORE_ENTITLEMENTS = Object.freeze([
  ENTITLEMENT.MEMBERSHIP_CORE,
  ENTITLEMENT.MEMBER_FIRST_MENU_ACCESS,
  ENTITLEMENT.MEAL_PREP_ELIGIBILITY,
  ENTITLEMENT.HUB_MEMBER_AREA,
]);

const MEMBERSHIP_CLASS_CODE = Object.freeze({
  LOCALIST_MONTHLY: 'localist_monthly',
  LOCALIST_ANNUAL: 'localist_annual',
  LOCALIST_WAIVED: 'localist_waived',
});

function membershipClass({
  code,
  label,
  duesCadence,
  duesCents,
  extraEntitlements = [],
  waivedEligible = false,
  accruesCoopCredit = false,
}) {
  return Object.freeze({
    code,
    label,
    duesCadence,
    duesCents,
    waivedEligible,
    accruesCoopCredit,
    coopCreditBasisPoints: accruesCoopCredit ? COOP_CREDIT_BASIS_POINTS : 0,
    coopCreditCadence: accruesCoopCredit ? COOP_CREDIT_CADENCE : null,
    coopCreditNonExpiring: accruesCoopCredit ? COOP_CREDIT_NON_EXPIRING : false,
    entitlementSet: Object.freeze([...CORE_ENTITLEMENTS, ...extraEntitlements]),
  });
}

const MEMBERSHIP_CLASSES = Object.freeze({
  [MEMBERSHIP_CLASS_CODE.LOCALIST_MONTHLY]: membershipClass({
    code: MEMBERSHIP_CLASS_CODE.LOCALIST_MONTHLY,
    label: 'Localist Monthly',
    duesCadence: DUES_CADENCE.MONTHLY,
    duesCents: 4500,
    extraEntitlements: [ENTITLEMENT.COOP_CREDIT_ACCRUAL],
    accruesCoopCredit: true,
  }),
  [MEMBERSHIP_CLASS_CODE.LOCALIST_ANNUAL]: membershipClass({
    code: MEMBERSHIP_CLASS_CODE.LOCALIST_ANNUAL,
    label: 'Localist Annual',
    duesCadence: DUES_CADENCE.ANNUAL,
    duesCents: 37500,
    extraEntitlements: [ENTITLEMENT.COOP_CREDIT_ACCRUAL],
    accruesCoopCredit: true,
  }),
  [MEMBERSHIP_CLASS_CODE.LOCALIST_WAIVED]: membershipClass({
    code: MEMBERSHIP_CLASS_CODE.LOCALIST_WAIVED,
    label: 'Localist, cost waived',
    duesCadence: DUES_CADENCE.WAIVED,
    duesCents: 0,
    extraEntitlements: [ENTITLEMENT.LOW_COST_MENU],
    waivedEligible: true,
    accruesCoopCredit: false,
  }),
});

/** Period key for entitlements that are not scoped to a billing period. */
const NON_PERIODIC_PERIOD_KEY = 'lifetime';

function seedMembershipClass(code) {
  return MEMBERSHIP_CLASSES[String(code || '').trim()] || null;
}

/**
 * Resolve the entitlement codes a class grants. Only owner-confirmed seeded
 * codes grant access; an unknown code resolves to an empty set even if a row
 * contains persisted entitlement strings.
 * Returns a sorted, de-duplicated array — never null.
 */
function resolveEntitlementCodes(classCode) {
  const seeded = seedMembershipClass(classCode);
  const source = seeded ? seeded.entitlementSet : [];
  const codes = new Set();
  for (const entry of source) {
    const code = String(entry || '').trim();
    if (code) codes.add(code);
  }
  return [...codes].sort();
}

/** Idempotency key for an entitlement grant, matching the DB natural key. */
function entitlementGrantKey(membershipId, entitlementCode, periodKey = NON_PERIODIC_PERIOD_KEY) {
  return `${membershipId}:${entitlementCode}:${periodKey}`;
}

module.exports = {
  BILLING_AUTHORITY,
  COOP_CREDIT_BASIS_POINTS,
  COOP_CREDIT_CADENCE,
  COOP_CREDIT_NON_EXPIRING,
  CORE_ENTITLEMENTS,
  CURRENT_BILLING_AUTHORITY,
  DUES_CADENCE,
  DUES_PLAN_STATUS,
  ENTITLEMENT,
  MEMBERSHIP_CLASSES,
  MEMBERSHIP_CLASS_CODE,
  MEMBERSHIP_STATUS,
  NON_PERIODIC_PERIOD_KEY,
  RELATIONSHIP_ROLE,
  entitlementGrantKey,
  resolveEntitlementCodes,
  seedMembershipClass,
};
