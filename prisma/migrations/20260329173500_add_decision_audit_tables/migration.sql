-- CreateTable
CREATE TABLE "DecisionAssignment" (
    "id" TEXT NOT NULL,
    "experimentKey" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "bucket" INTEGER NOT NULL,
    "path" TEXT,
    "pageType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionEvent" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "experimentKey" TEXT,
    "variant" TEXT,
    "bucket" INTEGER,
    "reasonCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedPriorityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DecisionAssignment_experimentKey_sessionId_key" ON "DecisionAssignment"("experimentKey", "sessionId");

-- CreateIndex
CREATE INDEX "DecisionAssignment_experimentKey_variant_idx" ON "DecisionAssignment"("experimentKey", "variant");

-- CreateIndex
CREATE INDEX "DecisionEvent_sessionId_createdAt_idx" ON "DecisionEvent"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "DecisionEvent_eventType_createdAt_idx" ON "DecisionEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "DecisionEvent_experimentKey_variant_idx" ON "DecisionEvent"("experimentKey", "variant");
