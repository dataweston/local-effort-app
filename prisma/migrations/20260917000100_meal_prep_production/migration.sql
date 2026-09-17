-- Canonical weekly meal-prep production records.
-- Hub notes and planner cards remain immutable source evidence; these tables
-- hold the idempotently regenerated operating state and batch history.

CREATE TABLE "MealPrepMenuCycle" (
    "id" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sourceDocumentId" TEXT,
    "sourceUpdatedAt" TIMESTAMP(3),
    "sourceBodyHash" TEXT,
    "sourceSnapshot" JSONB NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPrepMenuCycle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MealPrepMenuCycle_week_start_check" CHECK ("weekStart" ~ '^\d{4}-\d{2}-\d{2}$'),
    CONSTRAINT "MealPrepMenuCycle_status_check" CHECK ("status" IN ('draft', 'ready', 'in_production', 'complete', 'blocked')),
    CONSTRAINT "MealPrepMenuCycle_source_hash_check" CHECK ("sourceBodyHash" IS NULL OR "sourceBodyHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "MealPrepMenuCycleItem" (
    "id" TEXT NOT NULL,
    "menuCycleId" TEXT NOT NULL,
    "stableKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dishEntityId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "meal" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "sourceHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPrepMenuCycleItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MealPrepMenuCycleItem_status_check" CHECK ("status" IN ('active', 'removed')),
    CONSTRAINT "MealPrepMenuCycleItem_name_check" CHECK (char_length(btrim("name")) > 0),
    CONSTRAINT "MealPrepMenuCycleItem_meal_check" CHECK ("meal" IN ('dinner', 'lunch', 'breakfast', 'kids', 'snacks', 'other')),
    CONSTRAINT "MealPrepMenuCycleItem_source_hash_check" CHECK ("sourceHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "MealPrepCustomerMenu" (
    "id" TEXT NOT NULL,
    "menuCycleId" TEXT NOT NULL,
    "sourcePlannerCardId" TEXT NOT NULL,
    "customerId" TEXT,
    "brainCustomerEntityId" TEXT,
    "customerName" TEXT NOT NULL,
    "serviceDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planned',
    "revenueCents" INTEGER NOT NULL DEFAULT 0,
    "planSnapshot" JSONB,
    "requirements" JSONB NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPrepCustomerMenu_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MealPrepCustomerMenu_name_check" CHECK (char_length(btrim("customerName")) > 0),
    CONSTRAINT "MealPrepCustomerMenu_service_date_check" CHECK ("serviceDate" ~ '^\d{4}-\d{2}-\d{2}$'),
    CONSTRAINT "MealPrepCustomerMenu_status_check" CHECK ("status" IN ('committed', 'planned', 'paused', 'removed')),
    CONSTRAINT "MealPrepCustomerMenu_revenue_check" CHECK ("revenueCents" >= 0),
    CONSTRAINT "MealPrepCustomerMenu_source_hash_check" CHECK ("sourceHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "MealPrepCustomerMenuItem" (
    "id" TEXT NOT NULL,
    "customerMenuId" TEXT NOT NULL,
    "menuCycleItemId" TEXT,
    "stableKey" TEXT NOT NULL,
    "dishEntityId" TEXT,
    "dishName" TEXT NOT NULL,
    "meal" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "diet" TEXT,
    "station" TEXT,
    "chef" TEXT,
    "prepDay" TEXT,
    "notes" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'chef',
    "chefEditedAt" TIMESTAMP(3),
    "sourceHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPrepCustomerMenuItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MealPrepCustomerMenuItem_name_check" CHECK (char_length(btrim("dishName")) > 0),
    CONSTRAINT "MealPrepCustomerMenuItem_meal_check" CHECK ("meal" IN ('dinner', 'lunch', 'breakfast', 'kids', 'snacks', 'other')),
    CONSTRAINT "MealPrepCustomerMenuItem_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "MealPrepCustomerMenuItem_origin_check" CHECK ("origin" IN ('chef', 'imported', 'generated')),
    CONSTRAINT "MealPrepCustomerMenuItem_source_hash_check" CHECK ("sourceHash" IS NULL OR "sourceHash" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "MealPrepChangeRequest" (
    "id" TEXT NOT NULL,
    "customerMenuId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "requestedChange" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'operator',
    "sourceReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPrepChangeRequest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MealPrepChangeRequest_status_check" CHECK ("status" IN ('open', 'accepted', 'rejected', 'resolved')),
    CONSTRAINT "MealPrepChangeRequest_source_check" CHECK ("source" IN ('operator', 'customer', 'hub', 'imported')),
    CONSTRAINT "MealPrepChangeRequest_text_check" CHECK (char_length(btrim("requestedChange")) > 0)
);

CREATE TABLE "MealPrepProductionBatch" (
    "id" TEXT NOT NULL,
    "menuCycleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "operatorSheet" JSONB NOT NULL,
    "blockers" JSONB NOT NULL,
    "plannerDiff" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPrepProductionBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MealPrepProductionBatch_version_check" CHECK ("version" > 0),
    CONSTRAINT "MealPrepProductionBatch_status_check" CHECK ("status" IN ('ready', 'blocked')),
    CONSTRAINT "MealPrepProductionBatch_source_hash_check" CHECK ("sourceHash" ~ '^[0-9a-f]{64}$')
);

CREATE UNIQUE INDEX "MealPrepMenuCycle_weekStart_key" ON "MealPrepMenuCycle"("weekStart");
CREATE INDEX "MealPrepMenuCycle_status_weekStart_idx" ON "MealPrepMenuCycle"("status", "weekStart");
CREATE UNIQUE INDEX "MealPrepMenuCycleItem_menuCycleId_stableKey_key" ON "MealPrepMenuCycleItem"("menuCycleId", "stableKey");
CREATE INDEX "MealPrepMenuCycleItem_menuCycleId_status_sortOrder_idx" ON "MealPrepMenuCycleItem"("menuCycleId", "status", "sortOrder");
CREATE UNIQUE INDEX "MealPrepCustomerMenu_sourcePlannerCardId_key" ON "MealPrepCustomerMenu"("sourcePlannerCardId");
CREATE INDEX "MealPrepCustomerMenu_menuCycleId_status_serviceDate_idx" ON "MealPrepCustomerMenu"("menuCycleId", "status", "serviceDate");
CREATE INDEX "MealPrepCustomerMenu_customerId_idx" ON "MealPrepCustomerMenu"("customerId");
CREATE INDEX "MealPrepCustomerMenu_brainCustomerEntityId_idx" ON "MealPrepCustomerMenu"("brainCustomerEntityId");
CREATE UNIQUE INDEX "MealPrepCustomerMenuItem_customerMenuId_stableKey_key" ON "MealPrepCustomerMenuItem"("customerMenuId", "stableKey");
CREATE INDEX "MealPrepCustomerMenuItem_customerMenuId_meal_idx" ON "MealPrepCustomerMenuItem"("customerMenuId", "meal");
CREATE INDEX "MealPrepCustomerMenuItem_dishEntityId_idx" ON "MealPrepCustomerMenuItem"("dishEntityId");
CREATE UNIQUE INDEX "MealPrepChangeRequest_customerMenuId_requestKey_key" ON "MealPrepChangeRequest"("customerMenuId", "requestKey");
CREATE INDEX "MealPrepChangeRequest_customerMenuId_status_requestedAt_idx" ON "MealPrepChangeRequest"("customerMenuId", "status", "requestedAt");
CREATE UNIQUE INDEX "MealPrepProductionBatch_menuCycleId_version_key" ON "MealPrepProductionBatch"("menuCycleId", "version");
CREATE UNIQUE INDEX "MealPrepProductionBatch_menuCycleId_sourceHash_key" ON "MealPrepProductionBatch"("menuCycleId", "sourceHash");
CREATE INDEX "MealPrepProductionBatch_menuCycleId_generatedAt_idx" ON "MealPrepProductionBatch"("menuCycleId", "generatedAt");

ALTER TABLE "MealPrepMenuCycleItem"
  ADD CONSTRAINT "MealPrepMenuCycleItem_menuCycleId_fkey"
  FOREIGN KEY ("menuCycleId") REFERENCES "MealPrepMenuCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPrepCustomerMenu"
  ADD CONSTRAINT "MealPrepCustomerMenu_menuCycleId_fkey"
  FOREIGN KEY ("menuCycleId") REFERENCES "MealPrepMenuCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPrepCustomerMenuItem"
  ADD CONSTRAINT "MealPrepCustomerMenuItem_customerMenuId_fkey"
  FOREIGN KEY ("customerMenuId") REFERENCES "MealPrepCustomerMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPrepCustomerMenuItem"
  ADD CONSTRAINT "MealPrepCustomerMenuItem_menuCycleItemId_fkey"
  FOREIGN KEY ("menuCycleItemId") REFERENCES "MealPrepMenuCycleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MealPrepChangeRequest"
  ADD CONSTRAINT "MealPrepChangeRequest_customerMenuId_fkey"
  FOREIGN KEY ("customerMenuId") REFERENCES "MealPrepCustomerMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPrepProductionBatch"
  ADD CONSTRAINT "MealPrepProductionBatch_menuCycleId_fkey"
  FOREIGN KEY ("menuCycleId") REFERENCES "MealPrepMenuCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
