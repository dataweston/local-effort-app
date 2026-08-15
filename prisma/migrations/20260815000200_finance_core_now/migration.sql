-- Finance Core "now" foundation.
-- Commercial obligations and provider-neutral payment provenance live here.
-- Local Budget remains authoritative for bank cash, classifications, and margin.

CREATE TABLE "CommercialAgreement" (
    "id" TEXT NOT NULL,
    "agreementType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" TEXT NOT NULL,
    "customerId" TEXT,
    "counterpartyName" TEXT,
    "counterpartyEmail" TEXT,
    "businessLineKey" TEXT,
    "effectiveAt" TIMESTAMP(3),
    "termEndAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "cancellationTerms" TEXT,
    "sourceSystem" TEXT,
    "sourceId" TEXT,
    "documentRef" TEXT,
    "terms" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercialAgreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialSubscription" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT,
    "customerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "billingCadence" TEXT NOT NULL,
    "recurringBaseCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "startAt" TIMESTAMP(3) NOT NULL,
    "currentPeriodStartAt" TIMESTAMP(3),
    "currentPeriodEndAt" TIMESTAMP(3),
    "cancelAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerSubscriptionId" TEXT,
    "sourceSystem" TEXT,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercialSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialOrder" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT,
    "subscriptionId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "channel" TEXT NOT NULL,
    "businessLineKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotalCents" INTEGER,
    "totalCents" INTEGER NOT NULL,
    "bookedAt" TIMESTAMP(3),
    "serviceStartAt" TIMESTAMP(3),
    "serviceEndAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "sourceSystem" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercialOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "lineType" TEXT NOT NULL DEFAULT 'item',
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "sourceSystem" TEXT,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercialOrderLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommercialInvoice" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT,
    "orderId" TEXT,
    "invoiceNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalCents" INTEGER NOT NULL,
    "outstandingCents" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "sourceSystem" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CommercialInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePaymentAttempt" (
    "id" TEXT NOT NULL,
    "commercialOrderId" TEXT,
    "weeklyOrderId" TEXT,
    "invoiceId" TEXT,
    "provider" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "externalPaymentId" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancePaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePaymentTransaction" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT,
    "provider" TEXT NOT NULL,
    "externalPaymentId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL DEFAULT 'payment',
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER,
    "netCents" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancePaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancePaymentAllocation" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "orderId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancePaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommercialAgreement_sourceSystem_sourceId_key" ON "CommercialAgreement"("sourceSystem", "sourceId");
CREATE INDEX "CommercialAgreement_customerId_status_idx" ON "CommercialAgreement"("customerId", "status");
CREATE INDEX "CommercialAgreement_businessLineKey_status_idx" ON "CommercialAgreement"("businessLineKey", "status");
CREATE UNIQUE INDEX "CommercialSubscription_provider_providerSubscriptionId_key" ON "CommercialSubscription"("provider", "providerSubscriptionId");
CREATE UNIQUE INDEX "CommercialSubscription_sourceSystem_sourceId_key" ON "CommercialSubscription"("sourceSystem", "sourceId");
CREATE INDEX "CommercialSubscription_customerId_status_idx" ON "CommercialSubscription"("customerId", "status");
CREATE INDEX "CommercialSubscription_agreementId_status_idx" ON "CommercialSubscription"("agreementId", "status");
CREATE UNIQUE INDEX "CommercialOrder_sourceSystem_sourceId_key" ON "CommercialOrder"("sourceSystem", "sourceId");
CREATE INDEX "CommercialOrder_customerId_status_idx" ON "CommercialOrder"("customerId", "status");
CREATE INDEX "CommercialOrder_agreementId_status_idx" ON "CommercialOrder"("agreementId", "status");
CREATE INDEX "CommercialOrder_subscriptionId_status_idx" ON "CommercialOrder"("subscriptionId", "status");
CREATE INDEX "CommercialOrder_businessLineKey_bookedAt_idx" ON "CommercialOrder"("businessLineKey", "bookedAt");
CREATE INDEX "CommercialOrderLine_orderId_idx" ON "CommercialOrderLine"("orderId");
CREATE INDEX "CommercialOrderLine_sku_idx" ON "CommercialOrderLine"("sku");
CREATE UNIQUE INDEX "CommercialInvoice_sourceSystem_sourceId_key" ON "CommercialInvoice"("sourceSystem", "sourceId");
CREATE INDEX "CommercialInvoice_status_dueAt_idx" ON "CommercialInvoice"("status", "dueAt");
CREATE INDEX "CommercialInvoice_agreementId_status_idx" ON "CommercialInvoice"("agreementId", "status");
CREATE INDEX "CommercialInvoice_orderId_idx" ON "CommercialInvoice"("orderId");
CREATE UNIQUE INDEX "FinancePaymentAttempt_provider_idempotencyKey_key" ON "FinancePaymentAttempt"("provider", "idempotencyKey");
CREATE INDEX "FinancePaymentAttempt_commercialOrderId_status_idx" ON "FinancePaymentAttempt"("commercialOrderId", "status");
CREATE INDEX "FinancePaymentAttempt_weeklyOrderId_status_idx" ON "FinancePaymentAttempt"("weeklyOrderId", "status");
CREATE INDEX "FinancePaymentAttempt_invoiceId_status_idx" ON "FinancePaymentAttempt"("invoiceId", "status");
CREATE INDEX "FinancePaymentAttempt_externalPaymentId_idx" ON "FinancePaymentAttempt"("externalPaymentId");
CREATE UNIQUE INDEX "FinancePaymentTransaction_provider_externalPaymentId_key" ON "FinancePaymentTransaction"("provider", "externalPaymentId");
CREATE INDEX "FinancePaymentTransaction_attemptId_idx" ON "FinancePaymentTransaction"("attemptId");
CREATE INDEX "FinancePaymentTransaction_occurredAt_idx" ON "FinancePaymentTransaction"("occurredAt");
CREATE UNIQUE INDEX "FinancePaymentAllocation_transactionId_targetType_targetId_key" ON "FinancePaymentAllocation"("transactionId", "targetType", "targetId");
CREATE INDEX "FinancePaymentAllocation_invoiceId_idx" ON "FinancePaymentAllocation"("invoiceId");
CREATE INDEX "FinancePaymentAllocation_orderId_idx" ON "FinancePaymentAllocation"("orderId");

ALTER TABLE "CommercialAgreement" ADD CONSTRAINT "CommercialAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialSubscription" ADD CONSTRAINT "CommercialSubscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialOrder" ADD CONSTRAINT "CommercialOrder_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialOrder" ADD CONSTRAINT "CommercialOrder_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "CommercialSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialOrder" ADD CONSTRAINT "CommercialOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialOrderLine" ADD CONSTRAINT "CommercialOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommercialOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommercialInvoice" ADD CONSTRAINT "CommercialInvoice_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "CommercialAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CommercialInvoice" ADD CONSTRAINT "CommercialInvoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentAttempt" ADD CONSTRAINT "FinancePaymentAttempt_commercialOrderId_fkey" FOREIGN KEY ("commercialOrderId") REFERENCES "CommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentAttempt" ADD CONSTRAINT "FinancePaymentAttempt_weeklyOrderId_fkey" FOREIGN KEY ("weeklyOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentAttempt" ADD CONSTRAINT "FinancePaymentAttempt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommercialInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentTransaction" ADD CONSTRAINT "FinancePaymentTransaction_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "FinancePaymentAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentAllocation" ADD CONSTRAINT "FinancePaymentAllocation_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancePaymentTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentAllocation" ADD CONSTRAINT "FinancePaymentAllocation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "CommercialInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancePaymentAllocation" ADD CONSTRAINT "FinancePaymentAllocation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CommercialOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
