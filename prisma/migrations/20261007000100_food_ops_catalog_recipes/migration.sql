-- Food Operations Core, phases 1-2: stock catalog, vendor-item mapping, cost
-- evidence, and versioned recipes (docs/architecture/food-operations-core-plan.md).
-- Additive only; no existing table is touched.

-- CreateTable
CREATE TABLE "StockProduct" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'raw',
    "dimension" TEXT NOT NULL,
    "densityGPerMl" DECIMAL(12,6),
    "aliases" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorItem" (
    "id" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,
    "vendorKey" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "localBudgetVendorId" TEXT,
    "vendorSku" TEXT,
    "description" TEXT NOT NULL,
    "normalizedDescription" TEXT NOT NULL,
    "packText" TEXT,
    "packBaseQuantity" DECIMAL(18,6),
    "packDimension" TEXT,
    "stockProductId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unmapped',
    "lastPackCostCents" INTEGER,
    "lastPurchasedAt" TIMESTAMP(3),
    "localBudgetItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostObservation" (
    "id" TEXT NOT NULL,
    "vendorItemId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "packCostCents" INTEGER NOT NULL,
    "quantity" DECIMAL(18,6),
    "lineTotalCents" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'prep',
    "outputStockProductId" TEXT,
    "dishEntityId" TEXT,
    "commercialProductId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeVersion" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "yieldQuantity" DECIMAL(18,6) NOT NULL,
    "yieldUnit" TEXT NOT NULL,
    "servings" INTEGER,
    "contentHash" TEXT NOT NULL,
    "notes" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeComponent" (
    "id" TEXT NOT NULL,
    "recipeVersionId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "stockProductId" TEXT,
    "subRecipeId" TEXT,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit" TEXT NOT NULL,
    "wastePct" DECIMAL(6,3) NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "RecipeComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockProduct_key_key" ON "StockProduct"("key");

-- CreateIndex
CREATE INDEX "StockProduct_kind_status_idx" ON "StockProduct"("kind", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorItem_identityKey_key" ON "VendorItem"("identityKey");

-- CreateIndex
CREATE INDEX "VendorItem_status_vendorKey_idx" ON "VendorItem"("status", "vendorKey");

-- CreateIndex
CREATE INDEX "VendorItem_stockProductId_idx" ON "VendorItem"("stockProductId");

-- CreateIndex
CREATE INDEX "CostObservation_vendorItemId_observedAt_idx" ON "CostObservation"("vendorItemId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CostObservation_source_sourceKey_key" ON "CostObservation"("source", "sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_key_key" ON "Recipe"("key");

-- CreateIndex
CREATE INDEX "Recipe_dishEntityId_idx" ON "Recipe"("dishEntityId");

-- CreateIndex
CREATE INDEX "Recipe_kind_status_idx" ON "Recipe"("kind", "status");

-- CreateIndex
CREATE INDEX "RecipeVersion_recipeId_status_idx" ON "RecipeVersion"("recipeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeVersion_recipeId_version_key" ON "RecipeVersion"("recipeId", "version");

-- CreateIndex
CREATE INDEX "RecipeComponent_stockProductId_idx" ON "RecipeComponent"("stockProductId");

-- CreateIndex
CREATE INDEX "RecipeComponent_subRecipeId_idx" ON "RecipeComponent"("subRecipeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeComponent_recipeVersionId_lineNo_key" ON "RecipeComponent"("recipeVersionId", "lineNo");

-- AddForeignKey
ALTER TABLE "VendorItem" ADD CONSTRAINT "VendorItem_stockProductId_fkey" FOREIGN KEY ("stockProductId") REFERENCES "StockProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostObservation" ADD CONSTRAINT "CostObservation_vendorItemId_fkey" FOREIGN KEY ("vendorItemId") REFERENCES "VendorItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_outputStockProductId_fkey" FOREIGN KEY ("outputStockProductId") REFERENCES "StockProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_stockProductId_fkey" FOREIGN KEY ("stockProductId") REFERENCES "StockProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeComponent" ADD CONSTRAINT "RecipeComponent_subRecipeId_fkey" FOREIGN KEY ("subRecipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints. Prisma models these as free strings; the database
-- enforces the vocabularies so a bad write fails loudly.
ALTER TABLE "StockProduct"
  ADD CONSTRAINT "StockProduct_kind_check" CHECK ("kind" IN ('raw', 'prep', 'packaging', 'finished')),
  ADD CONSTRAINT "StockProduct_dimension_check" CHECK ("dimension" IN ('mass', 'volume', 'count')),
  ADD CONSTRAINT "StockProduct_status_check" CHECK ("status" IN ('active', 'archived')),
  ADD CONSTRAINT "StockProduct_key_check" CHECK ("key" ~ '^[a-z0-9][a-z0-9_-]*$'),
  ADD CONSTRAINT "StockProduct_name_check" CHECK (char_length(btrim("name")) > 0),
  ADD CONSTRAINT "StockProduct_density_check" CHECK ("densityGPerMl" IS NULL OR "densityGPerMl" > 0);

ALTER TABLE "VendorItem"
  ADD CONSTRAINT "VendorItem_status_check" CHECK ("status" IN ('unmapped', 'mapped', 'ignored')),
  ADD CONSTRAINT "VendorItem_mapping_check" CHECK (("status" = 'mapped') = ("stockProductId" IS NOT NULL)),
  ADD CONSTRAINT "VendorItem_pack_dimension_check" CHECK ("packDimension" IS NULL OR "packDimension" IN ('mass', 'volume', 'count')),
  ADD CONSTRAINT "VendorItem_pack_quantity_check" CHECK ("packBaseQuantity" IS NULL OR "packBaseQuantity" > 0),
  ADD CONSTRAINT "VendorItem_mapped_pack_check" CHECK ("status" <> 'mapped' OR ("packBaseQuantity" IS NOT NULL AND "packDimension" IS NOT NULL)),
  ADD CONSTRAINT "VendorItem_cost_check" CHECK ("lastPackCostCents" IS NULL OR "lastPackCostCents" >= 0),
  ADD CONSTRAINT "VendorItem_description_check" CHECK (char_length(btrim("description")) > 0);

ALTER TABLE "CostObservation"
  ADD CONSTRAINT "CostObservation_source_check" CHECK ("source" IN ('manual', 'lb_line')),
  ADD CONSTRAINT "CostObservation_cost_check" CHECK ("packCostCents" >= 0),
  ADD CONSTRAINT "CostObservation_quantity_check" CHECK ("quantity" IS NULL OR "quantity" > 0),
  ADD CONSTRAINT "CostObservation_total_check" CHECK ("lineTotalCents" IS NULL OR "lineTotalCents" >= 0);

ALTER TABLE "Recipe"
  ADD CONSTRAINT "Recipe_kind_check" CHECK ("kind" IN ('prep', 'menu', 'retail')),
  ADD CONSTRAINT "Recipe_status_check" CHECK ("status" IN ('active', 'archived')),
  ADD CONSTRAINT "Recipe_key_check" CHECK ("key" ~ '^[a-z0-9][a-z0-9_-]*$'),
  ADD CONSTRAINT "Recipe_name_check" CHECK (char_length(btrim("name")) > 0);

ALTER TABLE "RecipeVersion"
  ADD CONSTRAINT "RecipeVersion_status_check" CHECK ("status" IN ('draft', 'active', 'retired')),
  ADD CONSTRAINT "RecipeVersion_version_check" CHECK ("version" > 0),
  ADD CONSTRAINT "RecipeVersion_yield_check" CHECK ("yieldQuantity" > 0),
  ADD CONSTRAINT "RecipeVersion_servings_check" CHECK ("servings" IS NULL OR "servings" > 0),
  ADD CONSTRAINT "RecipeVersion_hash_check" CHECK ("contentHash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "RecipeVersion_activated_check" CHECK (("status" = 'draft') = ("activatedAt" IS NULL));

ALTER TABLE "RecipeComponent"
  ADD CONSTRAINT "RecipeComponent_target_check" CHECK (("stockProductId" IS NULL) <> ("subRecipeId" IS NULL)),
  ADD CONSTRAINT "RecipeComponent_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "RecipeComponent_waste_check" CHECK ("wastePct" >= 0 AND "wastePct" < 100),
  ADD CONSTRAINT "RecipeComponent_line_check" CHECK ("lineNo" > 0);

-- Recipe versions are editable only while draft. Active/retired versions are
-- frozen except for the single transition active -> retired, so a costed
-- recipe can never silently change under a production order or cost report.
-- At most one active version per recipe is enforced here too (a partial unique
-- index would show up as schema drift in `prisma migrate dev`).
CREATE FUNCTION "recipe_version_guard"() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'draft' THEN
      RAISE EXCEPTION 'RecipeVersion % is % and cannot be deleted', OLD."id", OLD."status";
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" = 'draft' THEN
    IF NEW."status" = 'active' AND EXISTS (
      SELECT 1 FROM "RecipeVersion"
      WHERE "recipeId" = NEW."recipeId" AND "status" = 'active' AND "id" <> NEW."id"
    ) THEN
      RAISE EXCEPTION 'Recipe % already has an active version; retire it first', NEW."recipeId";
    END IF;
    RETURN NEW;
  END IF;
  IF OLD."status" = 'active' AND NEW."status" = 'retired'
     AND NEW."recipeId" = OLD."recipeId"
     AND NEW."version" = OLD."version"
     AND NEW."yieldQuantity" = OLD."yieldQuantity"
     AND NEW."yieldUnit" = OLD."yieldUnit"
     AND NEW."servings" IS NOT DISTINCT FROM OLD."servings"
     AND NEW."contentHash" = OLD."contentHash"
     AND NEW."notes" IS NOT DISTINCT FROM OLD."notes"
     AND NEW."activatedAt" IS NOT DISTINCT FROM OLD."activatedAt" THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'RecipeVersion % is % and is immutable', OLD."id", OLD."status";
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RecipeVersion_guard"
  BEFORE UPDATE OR DELETE ON "RecipeVersion"
  FOR EACH ROW EXECUTE FUNCTION "recipe_version_guard"();

CREATE FUNCTION "recipe_component_guard"() RETURNS trigger AS $$
DECLARE
  version_id TEXT;
  version_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    version_id := OLD."recipeVersionId";
  ELSE
    version_id := NEW."recipeVersionId";
  END IF;
  SELECT "status" INTO version_status FROM "RecipeVersion" WHERE "id" = version_id;
  -- No parent row means the parent is being deleted (a draft, per its own guard).
  IF version_status IS NOT NULL AND version_status <> 'draft' THEN
    RAISE EXCEPTION 'RecipeVersion % is % and its components are immutable', version_id, version_status;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW."recipeVersionId" <> OLD."recipeVersionId" THEN
    SELECT "status" INTO version_status FROM "RecipeVersion" WHERE "id" = OLD."recipeVersionId";
    IF version_status IS NOT NULL AND version_status <> 'draft' THEN
      RAISE EXCEPTION 'RecipeVersion % is % and its components are immutable', OLD."recipeVersionId", version_status;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "RecipeComponent_guard"
  BEFORE INSERT OR UPDATE OR DELETE ON "RecipeComponent"
  FOR EACH ROW EXECUTE FUNCTION "recipe_component_guard"();
