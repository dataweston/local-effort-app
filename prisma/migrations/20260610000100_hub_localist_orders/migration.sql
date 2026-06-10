CREATE TABLE "HubLocalistOrder" (
  "id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'checkout_created',
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "pickupWindow" TEXT NOT NULL,
  "customerNote" TEXT,
  "localistWindowId" TEXT,
  "localistToken" TEXT,
  "sourceVisitorId" TEXT,
  "sourceSessionId" TEXT,
  "entrySource" TEXT,
  "squarePaymentLinkId" TEXT,
  "squarePaymentLinkUrl" TEXT,
  "squareOrderId" TEXT,
  "squarePaymentId" TEXT,
  "totalCents" INTEGER NOT NULL,
  "totalQuantity" INTEGER NOT NULL,
  "items" JSONB NOT NULL,
  "checkoutStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "brainLedgerEventId" TEXT,
  "brainInboxItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HubLocalistOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HubLocalistOrder_squarePaymentLinkId_key" ON "HubLocalistOrder"("squarePaymentLinkId");
CREATE UNIQUE INDEX "HubLocalistOrder_squareOrderId_key" ON "HubLocalistOrder"("squareOrderId");
CREATE UNIQUE INDEX "HubLocalistOrder_squarePaymentId_key" ON "HubLocalistOrder"("squarePaymentId");
CREATE INDEX "HubLocalistOrder_status_checkoutStartedAt_idx" ON "HubLocalistOrder"("status", "checkoutStartedAt");
CREATE INDEX "HubLocalistOrder_paidAt_idx" ON "HubLocalistOrder"("paidAt");
CREATE INDEX "HubLocalistOrder_localistWindowId_idx" ON "HubLocalistOrder"("localistWindowId");
CREATE INDEX "HubLocalistOrder_sourceSessionId_idx" ON "HubLocalistOrder"("sourceSessionId");
