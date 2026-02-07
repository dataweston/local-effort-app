-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "MenuWeekItem" ADD COLUMN     "includedInPlan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "basePriceCents" INTEGER,
ADD COLUMN     "deliveryFeeCents" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "includedInPlan" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UserPriceOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPriceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuWeekSection" (
    "id" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuWeekSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPlan" (
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

-- CreateTable
CREATE TABLE "PlannerCard" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'timed',
    "people" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startTime" TEXT,
    "endTime" TEXT,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "costPerHour" INTEGER,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "effectTarget" TEXT,
    "effectType" TEXT,
    "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerOverhead" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyCost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerOverhead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannerCOGS" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannerCOGS_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleCalendarToken" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "calendarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPriceOverride_userId_menuWeekId_dishId_key" ON "UserPriceOverride"("userId", "menuWeekId", "dishId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuWeekSection_menuWeekId_slug_key" ON "MenuWeekSection"("menuWeekId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPlan_customerId_menuWeekId_key" ON "CustomerPlan"("customerId", "menuWeekId");

-- CreateIndex
CREATE INDEX "PlannerCard_supabaseUid_idx" ON "PlannerCard"("supabaseUid");

-- CreateIndex
CREATE INDEX "PlannerCard_supabaseUid_date_idx" ON "PlannerCard"("supabaseUid", "date");

-- CreateIndex
CREATE INDEX "PlannerCard_supabaseUid_templateId_idx" ON "PlannerCard"("supabaseUid", "templateId");

-- CreateIndex
CREATE INDEX "PlannerOverhead_supabaseUid_idx" ON "PlannerOverhead"("supabaseUid");

-- CreateIndex
CREATE INDEX "PlannerCOGS_supabaseUid_idx" ON "PlannerCOGS"("supabaseUid");

-- CreateIndex
CREATE INDEX "PlannerCOGS_supabaseUid_weekStart_idx" ON "PlannerCOGS"("supabaseUid", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarToken_supabaseUid_key" ON "GoogleCalendarToken"("supabaseUid");

-- AddForeignKey
ALTER TABLE "MenuWeekItem" ADD CONSTRAINT "MenuWeekItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "MenuWeekSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPriceOverride" ADD CONSTRAINT "UserPriceOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPriceOverride" ADD CONSTRAINT "UserPriceOverride_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPriceOverride" ADD CONSTRAINT "UserPriceOverride_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuWeekSection" ADD CONSTRAINT "MenuWeekSection_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPlan" ADD CONSTRAINT "CustomerPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPlan" ADD CONSTRAINT "CustomerPlan_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
