CREATE TABLE "BrainSyncCursor" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "stream" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "pageToken" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "processedCount" INTEGER NOT NULL DEFAULT 0,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "retryAfter" TIMESTAMP(3),
  "lastObservedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BrainSyncCursor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BrainSyncCursor_source_stream_windowStart_windowEnd_key" ON "BrainSyncCursor"("source", "stream", "windowStart", "windowEnd");
CREATE INDEX "BrainSyncCursor_source_stream_status_windowEnd_idx" ON "BrainSyncCursor"("source", "stream", "status", "windowEnd");

CREATE TABLE "PartnerReviewDecision" (
  "id" TEXT NOT NULL,
  "vendorEntityId" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "fieldName" TEXT,
  "proposedValue" JSONB,
  "chosenValue" JSONB,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "evidenceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "featureSnapshot" JSONB,
  "ruleVersion" TEXT,
  "reviewer" TEXT NOT NULL,
  "supersedesId" TEXT,
  "revertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PartnerReviewDecision_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PartnerReviewDecision_vendorEntityId_taskType_createdAt_idx" ON "PartnerReviewDecision"("vendorEntityId", "taskType", "createdAt");
CREATE INDEX "PartnerReviewDecision_taskType_fieldName_action_idx" ON "PartnerReviewDecision"("taskType", "fieldName", "action");

CREATE TABLE "PartnerLearnedRule" (
  "id" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  "scopeType" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "conditions" JSONB NOT NULL,
  "outcome" JSONB NOT NULL,
  "supportCount" INTEGER NOT NULL DEFAULT 1,
  "successCount" INTEGER NOT NULL DEFAULT 1,
  "failureCount" INTEGER NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT NOT NULL,
  "lastAppliedAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PartnerLearnedRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PartnerLearnedRule_taskType_scopeType_scopeKey_key" ON "PartnerLearnedRule"("taskType", "scopeType", "scopeKey");
CREATE INDEX "PartnerLearnedRule_taskType_enabled_confidence_idx" ON "PartnerLearnedRule"("taskType", "enabled", "confidence");
