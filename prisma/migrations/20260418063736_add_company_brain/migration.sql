-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "householdSize" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "deliveryNotes" TEXT,
    "intakeSurvey" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "thumbsUp" BOOLEAN NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChefNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChefNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEventSchema" (
    "eventType" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEventSchema_pkey" PRIMARY KEY ("eventType","version")
);

-- CreateTable
CREATE TABLE "LedgerEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "actorType" TEXT,
    "actorId" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tombstonedAt" TIMESTAMP(3),
    "tombstoneReason" TEXT,

    CONSTRAINT "LedgerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainEntity" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "properties" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "snoozeUntil" TIMESTAMP(3),
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "shareToken" TEXT,
    "tombstonedAt" TIMESTAMP(3),
    "tombstoneReason" TEXT,
    "localEffortCustomerId" TEXT,
    "localEffortDishId" TEXT,
    "localBudgetVendorId" TEXT,
    "squareCustomerId" TEXT,
    "plannerCardId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainEntityAlias" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainEntityAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainAssertion" (
    "id" TEXT NOT NULL,
    "srcId" TEXT NOT NULL,
    "dstId" TEXT NOT NULL,
    "relType" TEXT NOT NULL,
    "metadata" JSONB,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "knownFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "knownUntil" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "createdBy" TEXT NOT NULL,
    "supersededBy" TEXT,
    "supersededAt" TIMESTAMP(3),
    "supersededReason" TEXT,
    "retractedAt" TIMESTAMP(3),
    "retractedBy" TEXT,
    "retractedReason" TEXT,
    "retractionSourceId" TEXT,
    "provisional" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainInference" (
    "id" TEXT NOT NULL,
    "srcId" TEXT NOT NULL,
    "dstId" TEXT NOT NULL,
    "inferenceType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "decayRate" TEXT NOT NULL,
    "knownFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "knownUntil" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL,
    "computedFrom" TEXT[],
    "summary" TEXT NOT NULL,
    "staleAt" TIMESTAMP(3),
    "staleReason" TEXT,
    "supersededBy" TEXT,

    CONSTRAINT "BrainInference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainInboxItem" (
    "id" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "attachments" JSONB,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),
    "resultEntityId" TEXT,

    CONSTRAINT "BrainInboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainApiToken" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrainSeedReview" (
    "id" TEXT NOT NULL,
    "entityAId" TEXT NOT NULL,
    "entityBId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchReason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrainSeedReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_customerId_key" ON "CustomerProfile"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "DishFeedback_userId_dishId_menuWeekId_key" ON "DishFeedback"("userId", "dishId", "menuWeekId");

-- CreateIndex
CREATE INDEX "LedgerEvent_eventType_occurredAt_idx" ON "LedgerEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "LedgerEvent_source_sourceId_idx" ON "LedgerEvent"("source", "sourceId");

-- CreateIndex
CREATE INDEX "LedgerEvent_occurredAt_idx" ON "LedgerEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "LedgerEvent_tombstonedAt_idx" ON "LedgerEvent"("tombstonedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrainEntity_shareToken_key" ON "BrainEntity"("shareToken");

-- CreateIndex
CREATE INDEX "BrainEntity_entityType_idx" ON "BrainEntity"("entityType");

-- CreateIndex
CREATE INDEX "BrainEntity_status_idx" ON "BrainEntity"("status");

-- CreateIndex
CREATE INDEX "BrainEntity_shareToken_idx" ON "BrainEntity"("shareToken");

-- CreateIndex
CREATE INDEX "BrainEntity_localEffortCustomerId_idx" ON "BrainEntity"("localEffortCustomerId");

-- CreateIndex
CREATE INDEX "BrainEntity_localEffortDishId_idx" ON "BrainEntity"("localEffortDishId");

-- CreateIndex
CREATE INDEX "BrainEntity_localBudgetVendorId_idx" ON "BrainEntity"("localBudgetVendorId");

-- CreateIndex
CREATE INDEX "BrainEntityAlias_alias_idx" ON "BrainEntityAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "BrainEntityAlias_entityId_alias_key" ON "BrainEntityAlias"("entityId", "alias");

-- CreateIndex
CREATE INDEX "BrainAssertion_srcId_relType_idx" ON "BrainAssertion"("srcId", "relType");

-- CreateIndex
CREATE INDEX "BrainAssertion_dstId_relType_idx" ON "BrainAssertion"("dstId", "relType");

-- CreateIndex
CREATE INDEX "BrainAssertion_validUntil_idx" ON "BrainAssertion"("validUntil");

-- CreateIndex
CREATE INDEX "BrainAssertion_knownUntil_idx" ON "BrainAssertion"("knownUntil");

-- CreateIndex
CREATE INDEX "BrainAssertion_provisional_idx" ON "BrainAssertion"("provisional");

-- CreateIndex
CREATE INDEX "BrainAssertion_retractedAt_idx" ON "BrainAssertion"("retractedAt");

-- CreateIndex
CREATE INDEX "BrainInference_srcId_inferenceType_idx" ON "BrainInference"("srcId", "inferenceType");

-- CreateIndex
CREATE INDEX "BrainInference_confidence_idx" ON "BrainInference"("confidence");

-- CreateIndex
CREATE INDEX "BrainInference_staleAt_idx" ON "BrainInference"("staleAt");

-- CreateIndex
CREATE INDEX "BrainInference_knownUntil_idx" ON "BrainInference"("knownUntil");

-- CreateIndex
CREATE INDEX "BrainInboxItem_status_capturedAt_idx" ON "BrainInboxItem"("status", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrainApiToken_tokenHash_key" ON "BrainApiToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishFeedback" ADD CONSTRAINT "DishFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishFeedback" ADD CONSTRAINT "DishFeedback_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishFeedback" ADD CONSTRAINT "DishFeedback_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChefNote" ADD CONSTRAINT "ChefNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainEntityAlias" ADD CONSTRAINT "BrainEntityAlias_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "BrainEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainAssertion" ADD CONSTRAINT "BrainAssertion_srcId_fkey" FOREIGN KEY ("srcId") REFERENCES "BrainEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainAssertion" ADD CONSTRAINT "BrainAssertion_dstId_fkey" FOREIGN KEY ("dstId") REFERENCES "BrainEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainAssertion" ADD CONSTRAINT "BrainAssertion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LedgerEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainInference" ADD CONSTRAINT "BrainInference_srcId_fkey" FOREIGN KEY ("srcId") REFERENCES "BrainEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainInference" ADD CONSTRAINT "BrainInference_dstId_fkey" FOREIGN KEY ("dstId") REFERENCES "BrainEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrainInboxItem" ADD CONSTRAINT "BrainInboxItem_resultEntityId_fkey" FOREIGN KEY ("resultEntityId") REFERENCES "BrainEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
