-- CreateTable
CREATE TABLE "ChefPublicProfile" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "draftVersion" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "consentedVersion" INTEGER,
    "consentedApplicationVersion" INTEGER,
    "consentedPolicyId" TEXT,
    "consentedAt" TIMESTAMP(3),
    "consentText" TEXT,
    "approvedVersion" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "approvedByUid" TEXT,
    "removedAt" TIMESTAMP(3),
    "moderationReason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChefPublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefPublicProfileEvent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorUid" TEXT NOT NULL,
    "privateNote" TEXT NOT NULL DEFAULT '',
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChefPublicProfileEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefDuesAssessment" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "period" TEXT NOT NULL,
    "serviceStartAt" TIMESTAMP(3) NOT NULL,
    "serviceEndAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "assessedCents" INTEGER NOT NULL,
    "payableCents" INTEGER NOT NULL,
    "adjustmentReason" TEXT NOT NULL DEFAULT '',
    "reason" TEXT NOT NULL,
    "assessedByUid" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "frozenAt" TIMESTAMP(3),
    "confirmationFacts" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChefDuesAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefDuesEvent" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUid" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChefDuesEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefWorkOpportunity" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "responseDeadline" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "compensation" TEXT NOT NULL,
    "engagementReference" TEXT NOT NULL,
    "suitability" TEXT NOT NULL,
    "allocationPolicyReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedMembershipId" TEXT,
    "assignmentReason" TEXT,
    "clientChoiceEvidence" TEXT,
    "assignedByUid" TEXT,
    "assignedAt" TIMESTAMP(3),

    CONSTRAINT "ChefWorkOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefWorkOffer" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'offered',
    "eligibilityEvidence" TEXT NOT NULL,
    "orderingEvidence" TEXT NOT NULL,
    "offeredByUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseReason" TEXT,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ChefWorkOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefWorkEvent" (
    "id" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "membershipId" TEXT,
    "actorUid" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "clientChoiceEvidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChefWorkEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefContribution" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "version" INTEGER NOT NULL DEFAULT 1,
    "currentRevision" INTEGER NOT NULL DEFAULT 1,
    "submittedByUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctsId" TEXT,
    "approvedReviewId" TEXT,

    CONSTRAINT "ChefContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefContributionRevision" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "workDate" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "compensationReference" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "policyReference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "submittedByUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChefContributionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefContributionReview" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "verifiedMinutes" INTEGER NOT NULL,
    "policyReference" TEXT NOT NULL,
    "evidenceReference" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChefContributionReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefCapitalClose" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "classReference" TEXT NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "poolCents" BIGINT NOT NULL,
    "retentionBps" INTEGER NOT NULL,
    "accountantEvidence" TEXT NOT NULL,
    "authorityEvidence" TEXT NOT NULL,
    "selectedContributionIds" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'prepared',
    "version" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "preparedByUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedByUid" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvalReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledByUid" TEXT,
    "cancellationReason" TEXT,

    CONSTRAINT "ChefCapitalClose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefCapitalAllocation" (
    "id" TEXT NOT NULL,
    "closeId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "verifiedMinutes" INTEGER NOT NULL,
    "totalCents" BIGINT NOT NULL,
    "retainedCents" BIGINT NOT NULL,
    "cashPayableCents" BIGINT NOT NULL,

    CONSTRAINT "ChefCapitalAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefCapitalSelection" (
    "id" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    "allocationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "verifiedMinutes" INTEGER NOT NULL,

    CONSTRAINT "ChefCapitalSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefEngagement" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "policySnapshot" JSONB NOT NULL,
    "templateSnapshot" JSONB NOT NULL,
    "kind" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "compensation" TEXT NOT NULL,
    "facility" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "safetyInsurance" TEXT NOT NULL,
    "cancellationTerms" TEXT NOT NULL,
    "authorityReference" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offered',
    "version" INTEGER NOT NULL DEFAULT 1,
    "ownerUid" TEXT NOT NULL,
    "ownerConfirmedAt" TIMESTAMP(3) NOT NULL,
    "ownerReason" TEXT NOT NULL,
    "signedName" TEXT,
    "signedByUid" TEXT,
    "signedAt" TIMESTAMP(3),
    "cancelledByUid" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,

    CONSTRAINT "ChefEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefEngagementEvent" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorUid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChefEngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChefPublicProfile_applicationId_key" ON "ChefPublicProfile"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ChefPublicProfile_slug_key" ON "ChefPublicProfile"("slug");

-- CreateIndex
CREATE INDEX "ChefPublicProfile_approvedAt_id_idx" ON "ChefPublicProfile"("approvedAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ChefPublicProfileEvent_profileId_version_key" ON "ChefPublicProfileEvent"("profileId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ChefDuesAssessment_invoiceId_key" ON "ChefDuesAssessment"("invoiceId");

-- CreateIndex
CREATE INDEX "ChefDuesAssessment_dueAt_idx" ON "ChefDuesAssessment"("dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChefDuesAssessment_membershipId_period_key" ON "ChefDuesAssessment"("membershipId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "ChefDuesEvent_assessmentId_version_key" ON "ChefDuesEvent"("assessmentId", "version");

-- CreateIndex
CREATE INDEX "ChefWorkOpportunity_status_startsAt_idx" ON "ChefWorkOpportunity"("status", "startsAt");

-- CreateIndex
CREATE INDEX "ChefWorkOffer_membershipId_status_idx" ON "ChefWorkOffer"("membershipId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChefWorkOffer_opportunityId_membershipId_key" ON "ChefWorkOffer"("opportunityId", "membershipId");

-- CreateIndex
CREATE INDEX "ChefWorkEvent_opportunityId_createdAt_idx" ON "ChefWorkEvent"("opportunityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChefContribution_correctsId_key" ON "ChefContribution"("correctsId");

-- CreateIndex
CREATE UNIQUE INDEX "ChefContribution_approvedReviewId_key" ON "ChefContribution"("approvedReviewId");

-- CreateIndex
CREATE INDEX "ChefContribution_applicationId_createdAt_idx" ON "ChefContribution"("applicationId", "createdAt");

-- CreateIndex
CREATE INDEX "ChefContribution_status_policyId_idx" ON "ChefContribution"("status", "policyId");

-- CreateIndex
CREATE UNIQUE INDEX "ChefContributionRevision_contributionId_revision_key" ON "ChefContributionRevision"("contributionId", "revision");

-- CreateIndex
CREATE INDEX "ChefContributionReview_contributionId_revision_idx" ON "ChefContributionReview"("contributionId", "revision");

-- CreateIndex
CREATE INDEX "ChefCapitalClose_policyId_status_idx" ON "ChefCapitalClose"("policyId", "status");

-- CreateIndex
CREATE INDEX "ChefCapitalAllocation_membershipId_idx" ON "ChefCapitalAllocation"("membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ChefCapitalAllocation_closeId_membershipId_key" ON "ChefCapitalAllocation"("closeId", "membershipId");

-- CreateIndex
CREATE UNIQUE INDEX "ChefCapitalSelection_contributionId_key" ON "ChefCapitalSelection"("contributionId");

-- CreateIndex
CREATE INDEX "ChefEngagement_applicationId_status_idx" ON "ChefEngagement"("applicationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChefEngagementEvent_engagementId_version_key" ON "ChefEngagementEvent"("engagementId", "version");

-- AddForeignKey
ALTER TABLE "ChefPublicProfile" ADD CONSTRAINT "ChefPublicProfile_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ChefApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefPublicProfile" ADD CONSTRAINT "ChefPublicProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefPublicProfileEvent" ADD CONSTRAINT "ChefPublicProfileEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ChefPublicProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefDuesAssessment" ADD CONSTRAINT "ChefDuesAssessment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefDuesAssessment" ADD CONSTRAINT "ChefDuesAssessment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ChefMembershipPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefDuesAssessment" ADD CONSTRAINT "ChefDuesAssessment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommercialInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefDuesEvent" ADD CONSTRAINT "ChefDuesEvent_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "ChefDuesAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefWorkOpportunity" ADD CONSTRAINT "ChefWorkOpportunity_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ChefMembershipPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefWorkOpportunity" ADD CONSTRAINT "ChefWorkOpportunity_assignedMembershipId_fkey" FOREIGN KEY ("assignedMembershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefWorkOffer" ADD CONSTRAINT "ChefWorkOffer_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ChefWorkOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefWorkOffer" ADD CONSTRAINT "ChefWorkOffer_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefWorkEvent" ADD CONSTRAINT "ChefWorkEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "ChefWorkOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefWorkEvent" ADD CONSTRAINT "ChefWorkEvent_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContribution" ADD CONSTRAINT "ChefContribution_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ChefApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContribution" ADD CONSTRAINT "ChefContribution_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContribution" ADD CONSTRAINT "ChefContribution_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ChefMembershipPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContribution" ADD CONSTRAINT "ChefContribution_correctsId_fkey" FOREIGN KEY ("correctsId") REFERENCES "ChefContribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContribution" ADD CONSTRAINT "ChefContribution_approvedReviewId_fkey" FOREIGN KEY ("approvedReviewId") REFERENCES "ChefContributionReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContributionRevision" ADD CONSTRAINT "ChefContributionRevision_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "ChefContribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContributionRevision" ADD CONSTRAINT "ChefContributionRevision_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "ChefEngagement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefContributionReview" ADD CONSTRAINT "ChefContributionReview_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "ChefContribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefCapitalClose" ADD CONSTRAINT "ChefCapitalClose_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ChefMembershipPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefCapitalAllocation" ADD CONSTRAINT "ChefCapitalAllocation_closeId_fkey" FOREIGN KEY ("closeId") REFERENCES "ChefCapitalClose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefCapitalAllocation" ADD CONSTRAINT "ChefCapitalAllocation_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefCapitalSelection" ADD CONSTRAINT "ChefCapitalSelection_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "ChefContribution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefCapitalSelection" ADD CONSTRAINT "ChefCapitalSelection_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "ChefCapitalAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefCapitalSelection" ADD CONSTRAINT "ChefCapitalSelection_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ChefContributionReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefEngagement" ADD CONSTRAINT "ChefEngagement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ChefApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefEngagement" ADD CONSTRAINT "ChefEngagement_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ChefMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefEngagement" ADD CONSTRAINT "ChefEngagement_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "ChefMembershipPolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefEngagementEvent" ADD CONSTRAINT "ChefEngagementEvent_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "ChefEngagement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Private operational records are backend-only, including consent and audit data.
DO $$
DECLARE target REGCLASS; browser_role RECORD; table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ChefPublicProfile', 'ChefPublicProfileEvent', 'ChefDuesAssessment', 'ChefDuesEvent',
    'ChefWorkOpportunity', 'ChefWorkOffer', 'ChefWorkEvent', 'ChefContribution',
    'ChefContributionRevision', 'ChefContributionReview', 'ChefCapitalClose',
    'ChefCapitalAllocation', 'ChefCapitalSelection', 'ChefEngagement', 'ChefEngagementEvent'
  ] LOOP
    target := to_regclass(format('%I', table_name));
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
    IF EXISTS (SELECT 1 FROM pg_class c,
      LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
      WHERE c.oid = target AND a.grantee = 0) THEN
      EXECUTE format('REVOKE ALL ON TABLE %s FROM PUBLIC', target);
    END IF;
    FOR browser_role IN SELECT DISTINCT r.rolname FROM pg_class c,
      LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
      JOIN pg_roles r ON r.oid = a.grantee
      WHERE c.oid = target AND r.rolname IN ('anon', 'authenticated')
    LOOP
      EXECUTE format('REVOKE ALL ON TABLE %s FROM %I', target, browser_role.rolname);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE "ChefDuesAssessment"
  ADD CONSTRAINT "ChefDuesAssessment_amounts_check" CHECK ("assessedCents" > 0 AND "payableCents" BETWEEN 0 AND "assessedCents"),
  ADD CONSTRAINT "ChefDuesAssessment_adjustment_check" CHECK ("payableCents" = "assessedCents" OR length(btrim("adjustmentReason")) > 0),
  ADD CONSTRAINT "ChefDuesAssessment_period_check" CHECK ("period" ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  ADD CONSTRAINT "ChefDuesAssessment_bounds_check" CHECK ("serviceEndAt" > "serviceStartAt" AND "version" > 0),
  ADD CONSTRAINT "ChefDuesAssessment_facts_check" CHECK (("frozenAt" IS NULL) = ("confirmationFacts" IS NULL));

CREATE FUNCTION chef_dues_preserve_assessment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Dues assessments are retained'; END IF;
  IF ROW(NEW."membershipId", NEW."policyId", NEW."policySnapshot", NEW."period", NEW."invoiceId", NEW."assessedByUid", NEW."createdAt")
     IS DISTINCT FROM ROW(OLD."membershipId", OLD."policyId", OLD."policySnapshot", OLD."period", OLD."invoiceId", OLD."assessedByUid", OLD."createdAt") THEN
    RAISE EXCEPTION 'Dues assessment identity is immutable';
  END IF;
  IF OLD."frozenAt" IS NOT NULL AND
     ROW(NEW."assessedCents", NEW."payableCents", NEW."adjustmentReason", NEW."dueAt", NEW."serviceStartAt", NEW."serviceEndAt", NEW."confirmationFacts", NEW."frozenAt")
     IS DISTINCT FROM ROW(OLD."assessedCents", OLD."payableCents", OLD."adjustmentReason", OLD."dueAt", OLD."serviceStartAt", OLD."serviceEndAt", OLD."confirmationFacts", OLD."frozenAt") THEN
    RAISE EXCEPTION 'Hosted checkout facts are frozen';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER chef_dues_preserve_assessment BEFORE UPDATE OR DELETE ON "ChefDuesAssessment"
  FOR EACH ROW EXECUTE FUNCTION chef_dues_preserve_assessment();

CREATE FUNCTION chef_preserve_audit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Cooperative audit evidence is append-only';
END $$;
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['ChefMembershipEvent', 'ChefPublicProfileEvent', 'ChefWorkEvent',
    'ChefContributionRevision', 'ChefContributionReview', 'ChefCapitalAllocation', 'ChefCapitalSelection', 'ChefEngagementEvent']
  LOOP
    EXECUTE format('CREATE TRIGGER chef_preserve_audit BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION chef_preserve_audit()', table_name);
  END LOOP;
END $$;

CREATE FUNCTION chef_dues_preserve_event() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Dues events are retained'; END IF;
  IF (to_jsonb(NEW) - 'outcome') IS DISTINCT FROM (to_jsonb(OLD) - 'outcome')
     OR (NEW."outcome" IS DISTINCT FROM OLD."outcome" AND OLD."outcome" <> 'recorded') THEN
    RAISE EXCEPTION 'Dues event identity and completed evidence are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER chef_dues_preserve_event BEFORE UPDATE OR DELETE ON "ChefDuesEvent"
  FOR EACH ROW EXECUTE FUNCTION chef_dues_preserve_event();

CREATE FUNCTION chef_dues_preserve_invoice() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."sourceSystem" = 'chef-dues' AND EXISTS (SELECT 1 FROM "FinancePaymentAttempt" WHERE "invoiceId" = OLD."id")
     AND ROW(NEW."totalCents", NEW."dueAt", NEW."currency", NEW."sourceSystem", NEW."sourceId")
     IS DISTINCT FROM ROW(OLD."totalCents", OLD."dueAt", OLD."currency", OLD."sourceSystem", OLD."sourceId") THEN
    RAISE EXCEPTION 'Owned dues checkout invoice facts are immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER chef_dues_preserve_invoice BEFORE UPDATE ON "CommercialInvoice"
  FOR EACH ROW EXECUTE FUNCTION chef_dues_preserve_invoice();

