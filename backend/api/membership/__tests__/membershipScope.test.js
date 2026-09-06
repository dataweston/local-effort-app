import { describe, expect, it, vi } from 'vitest';
import membershipClassesModule from '../membershipClasses';
import membershipEntitlementsModule from '../membershipEntitlements';
import membershipScopeModule from '../membershipScope';

const {
  BILLING_AUTHORITY,
  CORE_ENTITLEMENTS,
  ENTITLEMENT,
  MEMBERSHIP_CLASSES,
  MEMBERSHIP_CLASS_CODE,
  NON_PERIODIC_PERIOD_KEY,
} = membershipClassesModule;
const { createMembershipEntitlementGrantWriter } = membershipEntitlementsModule;
const { createMembershipScopeResolver } = membershipScopeModule;

const NOW = new Date('2026-09-06T12:00:00.000Z');
const IDENTITY = { id: 'user-1', email: 'Member@Example.com' };
const PROFILE = {
  id: 'profile-1',
  userId: IDENTITY.id,
  email: IDENTITY.email,
  status: 'active',
};

function classRow(code, overrides = {}) {
  const definition = MEMBERSHIP_CLASSES[code];
  return {
    id: `class-${code}`,
    ...definition,
    entitlementSet: [...definition.entitlementSet],
    active: true,
    ...overrides,
  };
}

function membershipRow(code, overrides = {}) {
  const definition = MEMBERSHIP_CLASSES[code];
  const paidPlan = {
    id: `plan-${code}`,
    status: 'active',
    cadence: definition.duesCadence,
    amountCents: definition.duesCents,
    billingAuthority: BILLING_AUTHORITY.SQUARE,
    externalSubscriptionRef: `square-${code}`,
    currentPeriodEnd: new Date('2026-10-06T12:00:00.000Z'),
    coopCreditBalanceCents: definition.accruesCoopCredit ? 225 : 0,
  };

  return {
    id: `membership-${code}`,
    profileId: PROFILE.id,
    organizationId: 'org-1',
    classId: `class-${code}`,
    status: 'active',
    billingAuthority: BILLING_AUTHORITY.SQUARE,
    activatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deactivatedAt: null,
    agreementAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    class: classRow(code),
    organization: { id: 'org-1', name: 'Local Effort', slug: 'local-effort' },
    duesPlans: definition.duesCents === 0 ? [] : [paidPlan],
    ...overrides,
  };
}

function prismaScopeDouble({ profile = PROFILE, memberships = [], roles = [] } = {}) {
  const models = {
    hubProfile: {
      findUnique: vi.fn(async ({ where }) => (
        profile?.userId === where.userId ? profile : null
      )),
    },
    membership: {
      findMany: vi.fn(async () => memberships),
    },
    membershipRelationshipRole: {
      findMany: vi.fn(async () => roles),
    },
  };

  return new Proxy(models, {
    get(target, property) {
      if (property in target) return target[property];
      throw new Error(`Unexpected Prisma model access: ${String(property)}`);
    },
  });
}

function resolver(prisma) {
  return createMembershipScopeResolver({ prisma, now: () => NOW });
}

describe('organization-scoped membership', () => {
  it('returns an empty scope for an unknown verified identity', async () => {
    const prisma = prismaScopeDouble({ profile: null });

    const scope = await resolver(prisma)(IDENTITY);

    expect(scope).toMatchObject({ authenticated: false, reason: 'unknown-profile' });
    expect(scope.memberships).toEqual([]);
    expect(prisma.membership.findMany).not.toHaveBeenCalled();
  });

  it('returns an empty scope when the only membership is inactive', async () => {
    const prisma = prismaScopeDouble({
      memberships: [membershipRow(MEMBERSHIP_CLASS_CODE.LOCALIST_MONTHLY, { status: 'suspended' })],
    });

    const scope = await resolver(prisma)(IDENTITY);

    expect(scope).toMatchObject({ authenticated: false, reason: 'no-active-membership' });
    expect(scope.entitlements).toEqual([]);
  });

  it('resolves the paid monthly class, credit, organization, and in-scope roles', async () => {
    const prisma = prismaScopeDouble({
      memberships: [membershipRow(MEMBERSHIP_CLASS_CODE.LOCALIST_MONTHLY)],
      roles: [
        { organizationId: 'org-1', role: 'household_member', grantedAt: NOW },
        { organizationId: 'org-outside-scope', role: 'owner', grantedAt: NOW },
      ],
    });

    const scope = await resolver(prisma)(IDENTITY);

    expect(scope.authenticated).toBe(true);
    expect(scope.email).toBe('member@example.com');
    expect(scope.organizationIds).toEqual(['org-1']);
    expect(scope.relationshipRoles).toEqual([
      { organizationId: 'org-1', role: 'household_member', grantedAt: NOW },
    ]);
    expect(scope.entitlements).toEqual([
      ...CORE_ENTITLEMENTS,
      ENTITLEMENT.COOP_CREDIT_ACCRUAL,
    ].sort());
    expect(scope.coopCreditBalanceCents).toBe(225);
    expect(scope.memberships[0]).toMatchObject({
      classCode: MEMBERSHIP_CLASS_CODE.LOCALIST_MONTHLY,
      duesCadence: 'monthly',
      duesCents: 4500,
      waived: false,
    });
  });

  it('resolves the paid annual class only with its matching active Square plan', async () => {
    const prisma = prismaScopeDouble({
      memberships: [membershipRow(MEMBERSHIP_CLASS_CODE.LOCALIST_ANNUAL)],
    });

    const scope = await resolver(prisma)(IDENTITY);

    expect(scope.authenticated).toBe(true);
    expect(scope.memberships[0]).toMatchObject({
      classCode: MEMBERSHIP_CLASS_CODE.LOCALIST_ANNUAL,
      duesCadence: 'annual',
      duesCents: 37500,
    });
    expect(scope.entitlements).toContain(ENTITLEMENT.COOP_CREDIT_ACCRUAL);
  });

  it('resolves waived membership to core plus low-cost menu without credit', async () => {
    const prisma = prismaScopeDouble({
      memberships: [membershipRow(MEMBERSHIP_CLASS_CODE.LOCALIST_WAIVED)],
    });

    const scope = await resolver(prisma)(IDENTITY);

    expect(scope.authenticated).toBe(true);
    expect(scope.memberships[0]).toMatchObject({ waived: true, duesCents: 0 });
    expect(scope.entitlements).toEqual([
      ...CORE_ENTITLEMENTS,
      ENTITLEMENT.LOW_COST_MENU,
    ].sort());
    expect(scope.entitlements).not.toContain(ENTITLEMENT.COOP_CREDIT_ACCRUAL);
    expect(scope.coopCreditBalanceCents).toBe(0);
  });

  it('fails closed when a persisted class drifts from its seeded price', async () => {
    const row = membershipRow(MEMBERSHIP_CLASS_CODE.LOCALIST_MONTHLY);
    row.class = classRow(MEMBERSHIP_CLASS_CODE.LOCALIST_MONTHLY, { duesCents: 0 });
    const prisma = prismaScopeDouble({ memberships: [row] });

    const scope = await resolver(prisma)(IDENTITY);

    expect(scope).toMatchObject({ authenticated: false, reason: 'no-active-membership' });
  });

  it('upserts an entitlement grant by its natural key without duplicating it', async () => {
    const grants = [];
    const prisma = {
      membershipEntitlementGrant: {
        upsert: vi.fn(async ({ where, create }) => {
          const key = where.membershipId_entitlementCode_periodKey;
          const existing = grants.find((row) => (
            row.membershipId === key.membershipId
            && row.entitlementCode === key.entitlementCode
            && row.periodKey === key.periodKey
          ));
          if (existing) return existing;
          const row = { id: 'grant-1', ...create };
          grants.push(row);
          return row;
        }),
      },
    };
    const grant = createMembershipEntitlementGrantWriter({ prisma, now: () => NOW });
    const input = {
      membershipId: 'membership-1',
      entitlementCode: ENTITLEMENT.MEMBERSHIP_CORE,
      source: 'approved-membership-activation',
    };

    const first = await grant(input);
    const retry = await grant(input);

    expect(retry).toEqual(first);
    expect(grants).toHaveLength(1);
    expect(grants[0]).toMatchObject({
      ...input,
      periodKey: NON_PERIODIC_PERIOD_KEY,
      grantedAt: NOW,
    });
  });
});
