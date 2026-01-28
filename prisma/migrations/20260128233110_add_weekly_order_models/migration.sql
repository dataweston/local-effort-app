-- CreateEnum
CREATE TYPE "PriceTier" AS ENUM ('subscriber', 'member');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('subscriber', 'member', 'admin');

-- CreateTable
CREATE TABLE "SmallEventUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallEventUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallEventSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmallEventSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallEventEstimate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "guestCount" INTEGER,
    "eventDate" TEXT,
    "eventTime" TEXT,
    "alternateDates" TEXT,
    "location" TEXT,
    "serviceStyle" TEXT,
    "budgetRange" TEXT,
    "menuNotes" TEXT,
    "dietary" TEXT,
    "rentals" TEXT,
    "notes" TEXT,
    "courses" TEXT,
    "plannerInfo" TEXT,
    "celebrationType" TEXT,
    "kitchenAccess" TEXT,
    "estimateMinCents" INTEGER,
    "estimateMaxCents" INTEGER,
    "subtotalCents" INTEGER,
    "depositPercent" INTEGER,
    "depositAmountCents" INTEGER,
    "depositStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "lastEditedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "claimToken" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallEventEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallEventAvailability" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallEventAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallEventHold" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'held',
    "holdUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallEventHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmallEventPayment" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "squarePaymentId" TEXT,
    "squarePaymentLinkId" TEXT,
    "squareOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmallEventPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "planRulesJson" JSONB,
    "priceTierDefault" "PriceTier",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dish" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "allergens" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuWeek" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "cutoffAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuWeekItem" (
    "id" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "capacityLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuWeekItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishVisibility" (
    "id" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishVisibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishPrice" (
    "id" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "tier" "PriceTier" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerPriceOverride" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerPriceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "menuWeekId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "squarePaymentId" TEXT,
    "totalsCents" INTEGER,
    "notes" TEXT,
    "tier" "PriceTier",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "isAddon" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngest" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rawPayloadJson" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeIngest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishSourceLink" (
    "id" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DishSourceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmallEventUser_email_key" ON "SmallEventUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SmallEventSession_token_key" ON "SmallEventSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX "SmallEventEstimate_claimToken_key" ON "SmallEventEstimate"("claimToken");

-- CreateIndex
CREATE UNIQUE INDEX "SmallEventAvailability_date_type_key" ON "SmallEventAvailability"("date", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SmallEventHold_estimateId_key" ON "SmallEventHold"("estimateId");

-- CreateIndex
CREATE UNIQUE INDEX "SmallEventPayment_squarePaymentId_key" ON "SmallEventPayment"("squarePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_slug_key" ON "Customer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MenuWeekItem_menuWeekId_dishId_key" ON "MenuWeekItem"("menuWeekId", "dishId");

-- CreateIndex
CREATE UNIQUE INDEX "DishVisibility_menuWeekId_dishId_customerId_key" ON "DishVisibility"("menuWeekId", "dishId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "DishPrice_menuWeekId_dishId_tier_key" ON "DishPrice"("menuWeekId", "dishId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerPriceOverride_customerId_menuWeekId_dishId_key" ON "CustomerPriceOverride"("customerId", "menuWeekId", "dishId");

-- CreateIndex
CREATE UNIQUE INDEX "DishSourceLink_sourceId_externalKey_key" ON "DishSourceLink"("sourceId", "externalKey");

-- AddForeignKey
ALTER TABLE "SmallEventSession" ADD CONSTRAINT "SmallEventSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SmallEventUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallEventEstimate" ADD CONSTRAINT "SmallEventEstimate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SmallEventUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallEventHold" ADD CONSTRAINT "SmallEventHold_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "SmallEventEstimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallEventHold" ADD CONSTRAINT "SmallEventHold_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "SmallEventAvailability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmallEventPayment" ADD CONSTRAINT "SmallEventPayment_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "SmallEventEstimate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuWeekItem" ADD CONSTRAINT "MenuWeekItem_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuWeekItem" ADD CONSTRAINT "MenuWeekItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishVisibility" ADD CONSTRAINT "DishVisibility_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishVisibility" ADD CONSTRAINT "DishVisibility_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishVisibility" ADD CONSTRAINT "DishVisibility_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishPrice" ADD CONSTRAINT "DishPrice_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishPrice" ADD CONSTRAINT "DishPrice_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPriceOverride" ADD CONSTRAINT "CustomerPriceOverride_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPriceOverride" ADD CONSTRAINT "CustomerPriceOverride_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerPriceOverride" ADD CONSTRAINT "CustomerPriceOverride_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_menuWeekId_fkey" FOREIGN KEY ("menuWeekId") REFERENCES "MenuWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishSourceLink" ADD CONSTRAINT "DishSourceLink_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
