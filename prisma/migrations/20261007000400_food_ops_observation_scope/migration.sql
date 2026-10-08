-- Personal vs business scope for purchases. Additive and nullable: NULL = unassigned.
-- Price evidence stays valid either way; scope only drives spend/usage reporting.
--   CostObservation.scope        explicit per-line decision
--   CostObservation.scopeSource  'owner' (decided by the owner) | 'rule' (accepted suggestion)
--   CostObservation.scopeAt      when the decision was recorded
--   VendorItem.defaultScope      owner rule "always business / always personal for this item"
-- Effective scope = observation.scope ?? vendorItem.defaultScope, resolved at read time.
ALTER TABLE "VendorItem" ADD COLUMN "defaultScope" TEXT;

ALTER TABLE "CostObservation"
  ADD COLUMN "scope" TEXT,
  ADD COLUMN "scopeSource" TEXT,
  ADD COLUMN "scopeAt" TIMESTAMP(3);

ALTER TABLE "VendorItem"
  ADD CONSTRAINT "VendorItem_default_scope_check"
  CHECK ("defaultScope" IS NULL OR "defaultScope" IN ('business', 'personal'));

ALTER TABLE "CostObservation"
  ADD CONSTRAINT "CostObservation_scope_check"
  CHECK ("scope" IS NULL OR "scope" IN ('business', 'personal')),
  ADD CONSTRAINT "CostObservation_scope_source_check"
  CHECK ("scopeSource" IS NULL OR "scopeSource" IN ('owner', 'rule')),
  ADD CONSTRAINT "CostObservation_scope_decision_check"
  CHECK (("scope" IS NULL) = ("scopeSource" IS NULL) AND ("scope" IS NULL) = ("scopeAt" IS NULL));

CREATE INDEX "CostObservation_source_observedAt_idx" ON "CostObservation"("source", "observedAt");
