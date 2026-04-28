-- Non-breaking Brain guardrails.
-- A hard unique index on (eventType, source, sourceId) and
-- (entityType, canonicalName) should be added after duplicate cleanup.

ALTER TABLE "BrainEntity"
  ADD COLUMN IF NOT EXISTS "canonicalName" TEXT;

UPDATE "BrainEntity"
SET "canonicalName" = trim(regexp_replace(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
WHERE "canonicalName" IS NULL;

CREATE INDEX IF NOT EXISTS "BrainEntity_entityType_canonicalName_idx"
  ON "BrainEntity"("entityType", "canonicalName");

CREATE INDEX IF NOT EXISTS "LedgerEvent_eventType_source_sourceId_idx"
  ON "LedgerEvent"("eventType", source, "sourceId")
  WHERE "sourceId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "BrainAssertion_sourceId_srcId_dstId_relType_idx"
  ON "BrainAssertion"("sourceId", "srcId", "dstId", "relType")
  WHERE "sourceId" IS NOT NULL AND "retractedAt" IS NULL;

