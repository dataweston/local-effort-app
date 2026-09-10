-- Add organization-scoped Localist membership without changing legacy reads.
-- Tier rows are intentionally not seeded here; code constants remain the
-- reviewed authority until activation and backfill are separately approved.

CREATE TABLE "MembershipClass" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "duesCadence" TEXT NOT NULL,
    "duesCents" INTEGER NOT NULL,
    "entitlementSet" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "waivedEligible" BOOLEAN NOT NULL DEFAULT false,
    "accruesCoopCredit" BOOLEAN NOT NULL DEFAULT false,
    "coopCreditBasisPoints" INTEGER NOT NULL DEFAULT 0,
    "coopCreditCadence" TEXT,
    "coopCreditNonExpiring" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipClass_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipClass_code_check" CHECK (char_length(btrim("code")) > 0),
    CONSTRAINT "MembershipClass_label_check" CHECK (char_length(btrim("label")) > 0),
    CONSTRAINT "MembershipClass_cadence_check" CHECK (char_length(btrim("duesCadence")) > 0),
    CONSTRAINT "MembershipClass_dues_check" CHECK ("duesCents" >= 0),
    CONSTRAINT "MembershipClass_credit_rate_check" CHECK ("coopCreditBasisPoints" BETWEEN 0 AND 10000)
);

CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "billingAuthority" TEXT NOT NULL DEFAULT 'square',
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "agreementAcceptedAt" TIMESTAMP(3),
    "agreementVersion" TEXT,
    "externalRosterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Membership_status_check" CHECK ("status" IN ('pending', 'active', 'suspended', 'cancelled')),
    CONSTRAINT "Membership_billing_authority_check" CHECK (char_length(btrim("billingAuthority")) > 0),
    CONSTRAINT "Membership_activation_window_check" CHECK ("deactivatedAt" IS NULL OR "activatedAt" IS NULL OR "deactivatedAt" >= "activatedAt")
);

CREATE TABLE "MembershipRelationshipRole" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipRelationshipRole_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipRelationshipRole_role_check" CHECK (char_length(btrim("role")) > 0),
    CONSTRAINT "MembershipRelationshipRole_status_check" CHECK (char_length(btrim("status")) > 0),
    CONSTRAINT "MembershipRelationshipRole_revocation_check" CHECK ("revokedAt" IS NULL OR "revokedAt" >= "grantedAt")
);

CREATE TABLE "MembershipDuesPlan" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "cadence" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "billingAuthority" TEXT NOT NULL DEFAULT 'square',
    "externalSubscriptionRef" TEXT,
    "externalCustomerRef" TEXT,
    "coopCreditBalanceCents" INTEGER NOT NULL DEFAULT 0,
    "coopCreditNonExpiring" BOOLEAN NOT NULL DEFAULT true,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipDuesPlan_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipDuesPlan_cadence_check" CHECK (char_length(btrim("cadence")) > 0),
    CONSTRAINT "MembershipDuesPlan_amount_check" CHECK ("amountCents" >= 0),
    CONSTRAINT "MembershipDuesPlan_credit_balance_check" CHECK ("coopCreditBalanceCents" >= 0),
    CONSTRAINT "MembershipDuesPlan_status_check" CHECK ("status" IN ('pending', 'active', 'past_due', 'cancelled')),
    CONSTRAINT "MembershipDuesPlan_billing_authority_check" CHECK (char_length(btrim("billingAuthority")) > 0),
    CONSTRAINT "MembershipDuesPlan_period_check" CHECK ("currentPeriodEnd" IS NULL OR "currentPeriodStart" IS NULL OR "currentPeriodEnd" >= "currentPeriodStart")
);

CREATE TABLE "MembershipEntitlementGrant" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "entitlementCode" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipEntitlementGrant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MembershipEntitlementGrant_code_check" CHECK (char_length(btrim("entitlementCode")) > 0),
    CONSTRAINT "MembershipEntitlementGrant_period_check" CHECK (char_length(btrim("periodKey")) > 0),
    CONSTRAINT "MembershipEntitlementGrant_source_check" CHECK (char_length(btrim("source")) > 0),
    CONSTRAINT "MembershipEntitlementGrant_status_check" CHECK (char_length(btrim("status")) > 0),
    CONSTRAINT "MembershipEntitlementGrant_revocation_check" CHECK ("revokedAt" IS NULL OR "revokedAt" >= "grantedAt")
);

CREATE UNIQUE INDEX "MembershipClass_code_key" ON "MembershipClass"("code");
CREATE INDEX "MembershipClass_active_duesCadence_idx" ON "MembershipClass"("active", "duesCadence");

CREATE UNIQUE INDEX "Membership_profileId_organizationId_classId_key" ON "Membership"("profileId", "organizationId", "classId");
CREATE INDEX "Membership_organizationId_status_idx" ON "Membership"("organizationId", "status");
CREATE INDEX "Membership_profileId_status_idx" ON "Membership"("profileId", "status");
CREATE INDEX "Membership_classId_idx" ON "Membership"("classId");
CREATE INDEX "Membership_billingAuthority_idx" ON "Membership"("billingAuthority");

CREATE UNIQUE INDEX "MembershipRelationshipRole_profileId_organizationId_role_key" ON "MembershipRelationshipRole"("profileId", "organizationId", "role");
CREATE INDEX "MembershipRelationshipRole_organizationId_role_status_idx" ON "MembershipRelationshipRole"("organizationId", "role", "status");
CREATE INDEX "MembershipRelationshipRole_profileId_status_idx" ON "MembershipRelationshipRole"("profileId", "status");

CREATE UNIQUE INDEX "MembershipDuesPlan_billingAuthority_externalSubscriptionRef_key" ON "MembershipDuesPlan"("billingAuthority", "externalSubscriptionRef");
CREATE INDEX "MembershipDuesPlan_membershipId_status_idx" ON "MembershipDuesPlan"("membershipId", "status");
CREATE INDEX "MembershipDuesPlan_status_cadence_idx" ON "MembershipDuesPlan"("status", "cadence");

CREATE UNIQUE INDEX "MembershipEntitlementGrant_membershipId_entitlementCode_periodKey_key" ON "MembershipEntitlementGrant"("membershipId", "entitlementCode", "periodKey");
CREATE INDEX "MembershipEntitlementGrant_membershipId_status_idx" ON "MembershipEntitlementGrant"("membershipId", "status");
CREATE INDEX "MembershipEntitlementGrant_entitlementCode_periodKey_idx" ON "MembershipEntitlementGrant"("entitlementCode", "periodKey");

ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "HubProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "HubOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership"
  ADD CONSTRAINT "Membership_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "MembershipClass"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipRelationshipRole"
  ADD CONSTRAINT "MembershipRelationshipRole_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "HubProfile"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipRelationshipRole"
  ADD CONSTRAINT "MembershipRelationshipRole_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "HubOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipDuesPlan"
  ADD CONSTRAINT "MembershipDuesPlan_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipEntitlementGrant"
  ADD CONSTRAINT "MembershipEntitlementGrant_membershipId_fkey"
  FOREIGN KEY ("membershipId") REFERENCES "Membership"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
