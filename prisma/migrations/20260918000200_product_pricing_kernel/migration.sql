-- Shared product, pricing, quote, and inventory foundation.
--
-- Published policy is versioned in PriceBook/PriceRule. Customer-specific
-- negotiations are append-only quote revisions and adjustments. Paid sales
-- continue to live in the existing CommercialOrder/Invoice records.

CREATE TABLE "CommercialProduct" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialOffer" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "composition" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialOffer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PriceBook" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "effectiveAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceBook_version_check" CHECK ("version" > 0),
  CONSTRAINT "PriceBook_window_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "effectiveAt")
);

CREATE TABLE "PriceRule" (
  "id" TEXT NOT NULL,
  "priceBookId" TEXT NOT NULL,
  "ruleKey" TEXT NOT NULL,
  "calculator" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "ruleType" TEXT NOT NULL,
  "amountCents" INTEGER,
  "rateBps" INTEGER,
  "parameters" JSONB,
  "displayLabel" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PriceRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PriceRule_amount_check" CHECK ("amountCents" IS NULL OR "amountCents" >= 0),
  CONSTRAINT "PriceRule_rate_check" CHECK ("rateBps" IS NULL OR ("rateBps" >= 0 AND "rateBps" <= 10000))
);

CREATE TABLE "CommercialQuote" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "offerId" TEXT,
  "customerId" TEXT,
  "agreementId" TEXT,
  "businessLineKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "pricingMode" TEXT NOT NULL,
  "currentRevisionNumber" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "sourceSystem" TEXT,
  "sourceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommercialQuote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialQuote_revision_check" CHECK ("currentRevisionNumber" > 0)
);

CREATE TABLE "CommercialQuoteRevision" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "priceBookId" TEXT NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "standardSubtotalCents" INTEGER NOT NULL,
  "adjustedSubtotalCents" INTEGER NOT NULL,
  "feesCents" INTEGER NOT NULL DEFAULT 0,
  "separateChargesCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL,
  "depositCents" INTEGER NOT NULL DEFAULT 0,
  "creditEarnedCents" INTEGER NOT NULL DEFAULT 0,
  "inputSnapshot" JSONB NOT NULL,
  "calculationSnapshot" JSONB NOT NULL,
  "changeSummary" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialQuoteRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialQuoteRevision_revision_check" CHECK ("revisionNumber" > 0),
  CONSTRAINT "CommercialQuoteRevision_money_check" CHECK (
    "standardSubtotalCents" >= 0 AND
    "adjustedSubtotalCents" >= 0 AND
    "feesCents" >= 0 AND
    "separateChargesCents" >= 0 AND
    "totalCents" >= 0 AND
    "depositCents" >= 0 AND
    "depositCents" <= "totalCents" AND
    "creditEarnedCents" >= 0
  )
);

CREATE TABLE "CommercialQuoteAdjustment" (
  "id" TEXT NOT NULL,
  "quoteRevisionId" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'subtotal',
  "amountCents" INTEGER NOT NULL,
  "reasonCode" TEXT NOT NULL,
  "explanation" TEXT NOT NULL,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommercialQuoteAdjustment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommercialQuoteAdjustment_amount_check" CHECK ("amountCents" <> 0),
  CONSTRAINT "CommercialQuoteAdjustment_explanation_check" CHECK (char_length(btrim("explanation")) > 0)
);

CREATE TABLE "InventoryResource" (
  "id" TEXT NOT NULL,
  "productId" TEXT,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "capacity" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryResource_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryResource_capacity_check" CHECK ("capacity" IS NULL OR "capacity" > 0)
);

CREATE TABLE "InventoryReservation" (
  "id" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "quoteId" TEXT,
  "orderId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'hold',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "sourceSystem" TEXT,
  "sourceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryReservation_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "InventoryReservation_window_check" CHECK ("endsAt" > "startsAt")
);

CREATE UNIQUE INDEX "CommercialProduct_key_key" ON "CommercialProduct"("key");
CREATE INDEX "CommercialProduct_status_idx" ON "CommercialProduct"("status");
CREATE UNIQUE INDEX "CommercialOffer_key_key" ON "CommercialOffer"("key");
CREATE INDEX "CommercialOffer_productId_status_idx" ON "CommercialOffer"("productId", "status");
CREATE UNIQUE INDEX "PriceBook_key_version_key" ON "PriceBook"("key", "version");
CREATE INDEX "PriceBook_key_status_effectiveAt_idx" ON "PriceBook"("key", "status", "effectiveAt");
CREATE UNIQUE INDEX "PriceRule_priceBookId_ruleKey_key" ON "PriceRule"("priceBookId", "ruleKey");
CREATE INDEX "PriceRule_calculator_scopeKey_idx" ON "PriceRule"("calculator", "scopeKey");
CREATE UNIQUE INDEX "CommercialQuote_sourceSystem_sourceId_key" ON "CommercialQuote"("sourceSystem", "sourceId");
CREATE INDEX "CommercialQuote_customerId_status_idx" ON "CommercialQuote"("customerId", "status");
CREATE INDEX "CommercialQuote_businessLineKey_status_createdAt_idx" ON "CommercialQuote"("businessLineKey", "status", "createdAt");
CREATE INDEX "CommercialQuote_productId_offerId_idx" ON "CommercialQuote"("productId", "offerId");
CREATE UNIQUE INDEX "CommercialQuoteRevision_quoteId_revisionNumber_key" ON "CommercialQuoteRevision"("quoteId", "revisionNumber");
CREATE INDEX "CommercialQuoteRevision_priceBookId_idx" ON "CommercialQuoteRevision"("priceBookId");
CREATE INDEX "CommercialQuoteAdjustment_quoteRevisionId_reasonCode_idx" ON "CommercialQuoteAdjustment"("quoteRevisionId", "reasonCode");
CREATE UNIQUE INDEX "InventoryResource_key_key" ON "InventoryResource"("key");
CREATE INDEX "InventoryResource_resourceType_status_idx" ON "InventoryResource"("resourceType", "status");
CREATE INDEX "InventoryResource_productId_idx" ON "InventoryResource"("productId");
CREATE UNIQUE INDEX "InventoryReservation_sourceSystem_sourceId_key" ON "InventoryReservation"("sourceSystem", "sourceId");
CREATE INDEX "InventoryReservation_resourceId_startsAt_endsAt_status_idx" ON "InventoryReservation"("resourceId", "startsAt", "endsAt", "status");
CREATE INDEX "InventoryReservation_quoteId_status_idx" ON "InventoryReservation"("quoteId", "status");
CREATE INDEX "InventoryReservation_orderId_status_idx" ON "InventoryReservation"("orderId", "status");

ALTER TABLE "CommercialOffer"
  ADD CONSTRAINT "CommercialOffer_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "CommercialProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PriceRule"
  ADD CONSTRAINT "PriceRule_priceBookId_fkey"
  FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote"
  ADD CONSTRAINT "CommercialQuote_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "CommercialProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote"
  ADD CONSTRAINT "CommercialQuote_offerId_fkey"
  FOREIGN KEY ("offerId") REFERENCES "CommercialOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote"
  ADD CONSTRAINT "CommercialQuote_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialQuote"
  ADD CONSTRAINT "CommercialQuote_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialQuoteRevision"
  ADD CONSTRAINT "CommercialQuoteRevision_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "CommercialQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialQuoteRevision"
  ADD CONSTRAINT "CommercialQuoteRevision_priceBookId_fkey"
  FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CommercialQuoteAdjustment"
  ADD CONSTRAINT "CommercialQuoteAdjustment_quoteRevisionId_fkey"
  FOREIGN KEY ("quoteRevisionId") REFERENCES "CommercialQuoteRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryResource"
  ADD CONSTRAINT "InventoryResource_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "CommercialProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation"
  ADD CONSTRAINT "InventoryReservation_resourceId_fkey"
  FOREIGN KEY ("resourceId") REFERENCES "InventoryResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation"
  ADD CONSTRAINT "InventoryReservation_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "CommercialQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation"
  ADD CONSTRAINT "InventoryReservation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "CommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
