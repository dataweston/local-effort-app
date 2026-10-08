-- Triage eligibility is independent from triageHint, which also carries source evidence IDs.
ALTER TABLE "BrainInboxItem"
  ADD COLUMN "triageState" TEXT NOT NULL DEFAULT 'eligible';

-- Existing pending classifier hints already represent a completed classification.
-- Source-ledger-only hints intentionally remain eligible for their first classification.
UPDATE "BrainInboxItem"
SET "triageState" = 'classified'
WHERE "status" = 'pending'
  AND jsonb_typeof("triageHint") = 'object'
  AND "triageHint" ? 'intent';

CREATE INDEX "BrainInboxItem_status_triageState_capturedAt_idx"
  ON "BrainInboxItem"("status", "triageState", "capturedAt");
