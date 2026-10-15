CREATE TABLE "CalendarNode" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "config" JSONB,
  "posX" INTEGER,
  "posY" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarRoute" (
  "id" TEXT NOT NULL,
  "fromId" TEXT NOT NULL,
  "toId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarRoute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarRoute_fromId_toId_kind_key" ON "CalendarRoute"("fromId", "toId", "kind");
CREATE INDEX "CalendarRoute_toId_idx" ON "CalendarRoute"("toId");

CREATE TABLE "CalendarMirror" (
  "id" TEXT NOT NULL,
  "estimateId" TEXT NOT NULL,
  "nodeId" TEXT NOT NULL,
  "externalId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "lastAttemptAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarMirror_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarMirror_estimateId_nodeId_key" ON "CalendarMirror"("estimateId", "nodeId");
CREATE INDEX "CalendarMirror_status_idx" ON "CalendarMirror"("status");
