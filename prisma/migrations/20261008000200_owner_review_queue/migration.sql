CREATE TABLE "OwnerReviewRule" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "classKey" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'disabled',
  "conditions" JSONB NOT NULL,
  "answer" JSONB NOT NULL,
  "validFrom" TIMESTAMP(3),
  "validUntil" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerReviewRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OwnerReviewRule_domain_classKey_ruleKey_version_key" ON "OwnerReviewRule"("domain", "classKey", "ruleKey", "version");
CREATE INDEX "OwnerReviewRule_domain_classKey_status_idx" ON "OwnerReviewRule"("domain", "classKey", "status");
CREATE INDEX "OwnerReviewRule_status_validUntil_idx" ON "OwnerReviewRule"("status", "validUntil");

CREATE TABLE "OwnerReviewRequest" (
  "id" TEXT NOT NULL,
  "domain" TEXT NOT NULL,
  "classKey" TEXT NOT NULL,
  "questionKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "priorityBand" TEXT NOT NULL,
  "question" JSONB NOT NULL,
  "candidateSet" JSONB,
  "safeDisposition" TEXT NOT NULL,
  "raisedBy" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "sourceVersion" TEXT,
  "dueAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerReviewRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OwnerReviewRequest_domain_idempotencyKey_key" ON "OwnerReviewRequest"("domain", "idempotencyKey");
CREATE INDEX "OwnerReviewRequest_status_priorityBand_dueAt_idx" ON "OwnerReviewRequest"("status", "priorityBand", "dueAt");
CREATE INDEX "OwnerReviewRequest_domain_classKey_status_idx" ON "OwnerReviewRequest"("domain", "classKey", "status");

CREATE TABLE "OwnerReviewMember" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "evidenceRefs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "valueCents" INTEGER,
  "state" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerReviewMember_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OwnerReviewMember_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OwnerReviewRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OwnerReviewMember_requestId_subjectType_subjectId_key" ON "OwnerReviewMember"("requestId", "subjectType", "subjectId");
CREATE INDEX "OwnerReviewMember_subjectType_subjectId_state_idx" ON "OwnerReviewMember"("subjectType", "subjectId", "state");

CREATE TABLE "OwnerReviewDecision" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "revision" INTEGER NOT NULL,
  "actorType" TEXT NOT NULL,
  "answer" JSONB NOT NULL,
  "reason" TEXT,
  "applyState" TEXT NOT NULL DEFAULT 'not_requested',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerReviewDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OwnerReviewDecision_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OwnerReviewRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OwnerReviewDecision_requestId_revision_key" ON "OwnerReviewDecision"("requestId", "revision");
CREATE UNIQUE INDEX "OwnerReviewDecision_requestId_idempotencyKey_key" ON "OwnerReviewDecision"("requestId", "idempotencyKey");
CREATE INDEX "OwnerReviewDecision_requestId_createdAt_idx" ON "OwnerReviewDecision"("requestId", "createdAt");

CREATE TABLE "OwnerReviewAudit" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "decisionId" TEXT,
  "eventType" TEXT NOT NULL,
  "actorType" TEXT NOT NULL,
  "beforeRef" JSONB,
  "afterRef" JSONB,
  "reasonCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerReviewAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OwnerReviewAudit_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OwnerReviewRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OwnerReviewAudit_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "OwnerReviewDecision"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "OwnerReviewAudit_requestId_createdAt_idx" ON "OwnerReviewAudit"("requestId", "createdAt");
CREATE INDEX "OwnerReviewAudit_decisionId_idx" ON "OwnerReviewAudit"("decisionId");
