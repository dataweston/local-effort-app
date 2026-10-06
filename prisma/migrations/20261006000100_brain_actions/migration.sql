-- Durable recommendation/action/outcome records for operational follow-through.
CREATE TABLE IF NOT EXISTS "BrainAction" (
  "id" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'proposed',
  "title" TEXT NOT NULL,
  "rationale" TEXT,
  "recommendation" JSONB,
  "evidenceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourceType" TEXT,
  "sourceId" TEXT,
  "subjectEntityId" TEXT,
  "owner" TEXT,
  "dueAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "outcome" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrainAction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrainAction_status_dueAt_idx" ON "BrainAction"("status", "dueAt");
CREATE INDEX IF NOT EXISTS "BrainAction_subjectEntityId_status_idx" ON "BrainAction"("subjectEntityId", "status");
CREATE INDEX IF NOT EXISTS "BrainAction_sourceType_sourceId_idx" ON "BrainAction"("sourceType", "sourceId");
