-- Owner-authored restaurateur knowledge interview staging.
-- Raw answer text remains outside LedgerEvent, BrainInboxItem, BrainAssertion,
-- BrainInference, and every operational system-of-record table.

CREATE TABLE "BrainOwnerInterviewSession" (
    "id" TEXT NOT NULL,
    "interviewKey" TEXT NOT NULL,
    "definitionVersion" INTEGER NOT NULL,
    "definitionSnapshot" JSONB NOT NULL,
    "respondentUserId" TEXT NOT NULL,
    "respondentEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "currentQuestionId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainOwnerInterviewSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BrainOwnerInterviewSession_interview_key_check" CHECK (char_length(btrim("interviewKey")) BETWEEN 1 AND 100),
    CONSTRAINT "BrainOwnerInterviewSession_definition_version_check" CHECK ("definitionVersion" >= 1),
    CONSTRAINT "BrainOwnerInterviewSession_identity_check" CHECK (char_length(btrim("respondentUserId")) > 0 AND char_length(btrim("respondentEmail")) > 0),
    CONSTRAINT "BrainOwnerInterviewSession_status_check" CHECK ("status" IN ('in_progress', 'submitted')),
    CONSTRAINT "BrainOwnerInterviewSession_question_check" CHECK (char_length(btrim("currentQuestionId")) BETWEEN 1 AND 100),
    CONSTRAINT "BrainOwnerInterviewSession_revision_check" CHECK ("revision" >= 0),
    CONSTRAINT "BrainOwnerInterviewSession_submitted_at_check" CHECK ("status" <> 'submitted' OR "submittedAt" IS NOT NULL)
);

CREATE TABLE "BrainOwnerInterviewAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "responseText" TEXT NOT NULL,
    "knowledgeKind" TEXT,
    "confidence" TEXT,
    "applicability" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "asOfDate" TIMESTAMP(3),
    "sourceReference" TEXT,
    "caveats" TEXT,
    "sensitivity" TEXT NOT NULL DEFAULT 'confidential_business',
    "disposition" TEXT NOT NULL DEFAULT 'draft',
    "supersedesId" TEXT,
    "supersededAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainOwnerInterviewAnswer_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BrainOwnerInterviewAnswer_question_check" CHECK (char_length(btrim("questionId")) BETWEEN 1 AND 100),
    CONSTRAINT "BrainOwnerInterviewAnswer_revision_check" CHECK ("revision" >= 1),
    CONSTRAINT "BrainOwnerInterviewAnswer_response_length_check" CHECK (char_length("responseText") <= 50000),
    CONSTRAINT "BrainOwnerInterviewAnswer_source_length_check" CHECK ("sourceReference" IS NULL OR char_length("sourceReference") <= 2000),
    CONSTRAINT "BrainOwnerInterviewAnswer_caveats_length_check" CHECK ("caveats" IS NULL OR char_length("caveats") <= 5000),
    CONSTRAINT "BrainOwnerInterviewAnswer_kind_check" CHECK ("knowledgeKind" IS NULL OR "knowledgeKind" IN ('observed_fact', 'owner_experience', 'judgment_heuristic', 'hypothesis', 'external_claim')),
    CONSTRAINT "BrainOwnerInterviewAnswer_confidence_check" CHECK ("confidence" IS NULL OR "confidence" IN ('firm', 'context_dependent', 'tentative')),
    CONSTRAINT "BrainOwnerInterviewAnswer_applicability_check" CHECK ("applicability" <@ ARRAY['general_food_industry', 'twin_cities', 'local_effort']::TEXT[]),
    CONSTRAINT "BrainOwnerInterviewAnswer_sensitivity_check" CHECK ("sensitivity" IN ('internal', 'confidential_business', 'external_shareable')),
    CONSTRAINT "BrainOwnerInterviewAnswer_disposition_check" CHECK ("disposition" IN ('draft', 'answered', 'deferred', 'not_known')),
    CONSTRAINT "BrainOwnerInterviewAnswer_no_self_supersession_check" CHECK ("supersedesId" IS NULL OR "supersedesId" <> "id"),
    CONSTRAINT "BrainOwnerInterviewAnswer_answered_provenance_check" CHECK (
      "disposition" <> 'answered' OR (
        char_length(btrim("responseText")) > 0
        AND "knowledgeKind" IS NOT NULL
        AND "confidence" IS NOT NULL
        AND cardinality("applicability") > 0
        AND "asOfDate" IS NOT NULL
      )
    ),
    CONSTRAINT "BrainOwnerInterviewAnswer_kind_provenance_check" CHECK (
      "disposition" <> 'answered'
      OR "knowledgeKind" NOT IN ('observed_fact', 'external_claim')
      OR char_length(btrim(COALESCE("sourceReference", ''))) > 0
    ),
    CONSTRAINT "BrainOwnerInterviewAnswer_reasoning_boundary_check" CHECK (
      "disposition" <> 'answered'
      OR "knowledgeKind" NOT IN ('judgment_heuristic', 'hypothesis')
      OR char_length(btrim(COALESCE("caveats", ''))) > 0
    )
);

CREATE INDEX "BrainOwnerInterviewSession_respondentUserId_interviewKey_status_updatedAt_idx"
  ON "BrainOwnerInterviewSession"("respondentUserId", "interviewKey", "status", "updatedAt");
CREATE INDEX "BrainOwnerInterviewSession_status_updatedAt_idx"
  ON "BrainOwnerInterviewSession"("status", "updatedAt");
CREATE UNIQUE INDEX "BrainOwnerInterviewSession_active_owner_interview_key"
  ON "BrainOwnerInterviewSession"("respondentUserId", "interviewKey")
  WHERE "status" = 'in_progress';

CREATE UNIQUE INDEX "BrainOwnerInterviewAnswer_sessionId_questionId_revision_key"
  ON "BrainOwnerInterviewAnswer"("sessionId", "questionId", "revision");
CREATE UNIQUE INDEX "BrainOwnerInterviewAnswer_supersedesId_key"
  ON "BrainOwnerInterviewAnswer"("supersedesId");
CREATE INDEX "BrainOwnerInterviewAnswer_sessionId_questionId_supersededAt_idx"
  ON "BrainOwnerInterviewAnswer"("sessionId", "questionId", "supersededAt");
CREATE INDEX "BrainOwnerInterviewAnswer_sessionId_disposition_idx"
  ON "BrainOwnerInterviewAnswer"("sessionId", "disposition");
CREATE INDEX "BrainOwnerInterviewAnswer_submittedAt_idx"
  ON "BrainOwnerInterviewAnswer"("submittedAt");
CREATE UNIQUE INDEX "BrainOwnerInterviewAnswer_current_session_question_key"
  ON "BrainOwnerInterviewAnswer"("sessionId", "questionId")
  WHERE "supersededAt" IS NULL;

ALTER TABLE "BrainOwnerInterviewAnswer"
  ADD CONSTRAINT "BrainOwnerInterviewAnswer_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "BrainOwnerInterviewSession"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BrainOwnerInterviewAnswer"
  ADD CONSTRAINT "BrainOwnerInterviewAnswer_supersedesId_fkey"
  FOREIGN KEY ("supersedesId") REFERENCES "BrainOwnerInterviewAnswer"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
