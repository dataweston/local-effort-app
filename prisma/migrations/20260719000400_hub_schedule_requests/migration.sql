CREATE TABLE "HubScheduleRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannerCardId" TEXT,
    "requestType" TEXT NOT NULL,
    "requestedDate" TEXT NOT NULL,
    "requestedStartTime" TEXT,
    "requestedEndTime" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubScheduleRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HubScheduleRequest_userId_status_requestedDate_idx"
ON "HubScheduleRequest"("userId", "status", "requestedDate");

CREATE INDEX "HubScheduleRequest_plannerCardId_idx"
ON "HubScheduleRequest"("plannerCardId");

CREATE INDEX "HubScheduleRequest_status_requestedDate_idx"
ON "HubScheduleRequest"("status", "requestedDate");
