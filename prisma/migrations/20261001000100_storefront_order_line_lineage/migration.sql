-- Add nullable storefront catalog lineage without changing historical rows.
ALTER TABLE "CommercialOrderLine"
  ADD COLUMN "commercialProductId" TEXT,
  ADD COLUMN "commercialOfferId" TEXT,
  ADD COLUMN "priceBookId" TEXT,
  ADD COLUMN "catalogRevision" TEXT;

CREATE INDEX "CommercialOrderLine_commercialProductId_idx"
  ON "CommercialOrderLine"("commercialProductId");
CREATE INDEX "CommercialOrderLine_commercialOfferId_idx"
  ON "CommercialOrderLine"("commercialOfferId");
CREATE INDEX "CommercialOrderLine_priceBookId_idx"
  ON "CommercialOrderLine"("priceBookId");

ALTER TABLE "CommercialOrderLine"
  ADD CONSTRAINT "CommercialOrderLine_commercialProductId_fkey"
  FOREIGN KEY ("commercialProductId") REFERENCES "CommercialProduct"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialOrderLine"
  ADD CONSTRAINT "CommercialOrderLine_commercialOfferId_fkey"
  FOREIGN KEY ("commercialOfferId") REFERENCES "CommercialOffer"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommercialOrderLine"
  ADD CONSTRAINT "CommercialOrderLine_priceBookId_fkey"
  FOREIGN KEY ("priceBookId") REFERENCES "PriceBook"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
