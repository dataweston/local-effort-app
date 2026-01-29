-- Weekly order sections, plans, and per-user overrides

ALTER TABLE "Customer"
ADD COLUMN IF NOT EXISTS "name" TEXT;

ALTER TABLE "MenuWeekItem"
ADD COLUMN IF NOT EXISTS "sectionId" TEXT,
ADD COLUMN IF NOT EXISTS "includedInPlan" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "basePriceCents" INTEGER,
ADD COLUMN IF NOT EXISTS "deliveryFeeCents" INTEGER;

ALTER TABLE "OrderItem"
ADD COLUMN IF NOT EXISTS "includedInPlan" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "MenuWeekSection" (
  "id" TEXT NOT NULL,
  "menuWeekId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MenuWeekSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomerPlan" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "menuWeekId" TEXT NOT NULL,
  "basePriceCents" INTEGER NOT NULL,
  "deliveryFeeCents" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPriceOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "menuWeekId" TEXT NOT NULL,
  "dishId" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserPriceOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MenuWeekSection_menuWeekId_slug_key"
  ON "MenuWeekSection" ("menuWeekId", "slug");

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerPlan_customerId_menuWeekId_key"
  ON "CustomerPlan" ("customerId", "menuWeekId");

CREATE UNIQUE INDEX IF NOT EXISTS "UserPriceOverride_userId_menuWeekId_dishId_key"
  ON "UserPriceOverride" ("userId", "menuWeekId", "dishId");

DO $$
BEGIN
  ALTER TABLE "MenuWeekSection"
    ADD CONSTRAINT "MenuWeekSection_menuWeekId_fkey"
    FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "MenuWeekItem"
    ADD CONSTRAINT "MenuWeekItem_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "MenuWeekSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CustomerPlan"
    ADD CONSTRAINT "CustomerPlan_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "CustomerPlan"
    ADD CONSTRAINT "CustomerPlan_menuWeekId_fkey"
    FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserPriceOverride"
    ADD CONSTRAINT "UserPriceOverride_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserPriceOverride"
    ADD CONSTRAINT "UserPriceOverride_menuWeekId_fkey"
    FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "UserPriceOverride"
    ADD CONSTRAINT "UserPriceOverride_dishId_fkey"
    FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
