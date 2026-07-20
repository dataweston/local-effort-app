ALTER TABLE "PlannerCard"
  ADD COLUMN "revenueCents" INTEGER,
  ADD COLUMN "cashReceivedCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "costCents" INTEGER,
  ADD COLUMN "costPerHourCents" INTEGER,
  ADD COLUMN "financialStatus" TEXT,
  ADD COLUMN "financialSource" TEXT,
  ADD COLUMN "financialMetadata" JSONB;

ALTER TABLE "PlannerCOGS"
  ADD COLUMN "amountCents" INTEGER,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'projected',
  ADD COLUMN "source" TEXT,
  ADD COLUMN "notes" TEXT;
