-- Hard unique constraints deferred by 20260428000100_brain_guardrails, applied
-- after the duplicate cleanup (68 LedgerEvent + 3 BrainEntity excess rows
-- tombstoned, their assertions repointed to survivors). Partial on
-- tombstonedAt IS NULL so merged/archived duplicates that legitimately share a
-- key with their survivor do not violate the constraint.

CREATE UNIQUE INDEX IF NOT EXISTS "LedgerEvent_eventType_source_sourceId_key"
  ON "LedgerEvent"("eventType", source, "sourceId")
  WHERE "sourceId" IS NOT NULL AND "tombstonedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "BrainEntity_entityType_canonicalName_key"
  ON "BrainEntity"("entityType", "canonicalName")
  WHERE "canonicalName" IS NOT NULL AND "tombstonedAt" IS NULL;
