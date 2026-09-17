-- Durable planner work blocks and cost-side finance provenance.
-- Planner work blocks intentionally retain plannerCardId as a source key without a
-- foreign key so cancellation/deletion can remain synchronized after card removal.

CREATE TABLE "PlannerWorkBlock" (
    "id" TEXT NOT NULL,
    "plannerCardId" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "status" TEXT NOT NULL DEFAULT 'needs_schedule',
    "location" TEXT,
    "sourceFingerprint" TEXT NOT NULL,
    "googleCalendarId" TEXT,
    "googleEventId" TEXT,
    "googleEtag" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlannerWorkBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCostObligation" (
    "id" TEXT NOT NULL,
    "commercialOrderId" TEXT,
    "plannerCardId" TEXT,
    "obligationType" TEXT NOT NULL DEFAULT 'event_cost',
    "status" TEXT NOT NULL DEFAULT 'planned',
    "counterpartyName" TEXT,
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountCents" INTEGER NOT NULL,
    "outstandingCents" INTEGER NOT NULL,
    "committedAt" TIMESTAMP(3),
    "serviceAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "sourceSystem" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceCostObligation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceCostPayment" (
    "id" TEXT NOT NULL,
    "obligationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalPaymentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amountCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinanceCostPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlannerWorkBlock_plannerCardId_blockType_key" ON "PlannerWorkBlock"("plannerCardId", "blockType");
CREATE UNIQUE INDEX "PlannerWorkBlock_googleCalendarId_googleEventId_key" ON "PlannerWorkBlock"("googleCalendarId", "googleEventId");
CREATE INDEX "PlannerWorkBlock_supabaseUid_date_idx" ON "PlannerWorkBlock"("supabaseUid", "date");
CREATE INDEX "PlannerWorkBlock_supabaseUid_syncStatus_idx" ON "PlannerWorkBlock"("supabaseUid", "syncStatus");

CREATE UNIQUE INDEX "FinanceCostObligation_sourceSystem_sourceId_key" ON "FinanceCostObligation"("sourceSystem", "sourceId");
CREATE INDEX "FinanceCostObligation_commercialOrderId_status_idx" ON "FinanceCostObligation"("commercialOrderId", "status");
CREATE INDEX "FinanceCostObligation_plannerCardId_idx" ON "FinanceCostObligation"("plannerCardId");
CREATE INDEX "FinanceCostObligation_status_dueAt_idx" ON "FinanceCostObligation"("status", "dueAt");
CREATE INDEX "FinanceCostObligation_serviceAt_idx" ON "FinanceCostObligation"("serviceAt");

CREATE UNIQUE INDEX "FinanceCostPayment_provider_externalPaymentId_key" ON "FinanceCostPayment"("provider", "externalPaymentId");
CREATE INDEX "FinanceCostPayment_obligationId_idx" ON "FinanceCostPayment"("obligationId");
CREATE INDEX "FinanceCostPayment_occurredAt_idx" ON "FinanceCostPayment"("occurredAt");

ALTER TABLE "FinanceCostObligation" ADD CONSTRAINT "FinanceCostObligation_commercialOrderId_fkey" FOREIGN KEY ("commercialOrderId") REFERENCES "CommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinanceCostPayment" ADD CONSTRAINT "FinanceCostPayment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "FinanceCostObligation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
