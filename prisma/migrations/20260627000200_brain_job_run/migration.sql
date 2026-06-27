-- Durable job-run tracking for recurring brain crons + freshness SLA.
CREATE TABLE IF NOT EXISTS "BrainJobRun" (
  "id" TEXT NOT NULL,
  "jobName" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "itemsProcessed" INTEGER,
  "itemsWritten" INTEGER,
  "errorCount" INTEGER NOT NULL DEFAULT 0,
  "expectedIntervalHours" INTEGER,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrainJobRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BrainJobRun_jobName_startedAt_idx" ON "BrainJobRun"("jobName", "startedAt");
CREATE INDEX IF NOT EXISTS "BrainJobRun_status_idx" ON "BrainJobRun"("status");
