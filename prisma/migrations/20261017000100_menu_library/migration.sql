ALTER TABLE "Dish"
  ADD COLUMN "slug" TEXT,
  ADD COLUMN "inLibrary" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "libraryVisibility" TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN "courses" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "proteins" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "diets" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "dietsInferred" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "dietsVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "seasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "cuisines" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "components" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "formats" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "programs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "variantSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE UNIQUE INDEX "Dish_slug_key" ON "Dish"("slug");
CREATE INDEX "Dish_inLibrary_idx" ON "Dish"("inLibrary");

CREATE TABLE "LibraryMenu" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'archive',
  "program" TEXT NOT NULL DEFAULT 'events',
  "occasion" TEXT,
  "clientLabel" TEXT,
  "status" TEXT,
  "eventDateText" TEXT,
  "guests" TEXT,
  "priceNote" TEXT,
  "notes" TEXT,
  "sourceKey" TEXT NOT NULL,
  "sourceThreadId" TEXT,
  "occurredAt" TIMESTAMP(3),
  "visibility" TEXT NOT NULL DEFAULT 'internal',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "LibraryMenu_slug_key" ON "LibraryMenu"("slug");
CREATE UNIQUE INDEX "LibraryMenu_sourceKey_key" ON "LibraryMenu"("sourceKey");
CREATE INDEX "LibraryMenu_kind_idx" ON "LibraryMenu"("kind");
CREATE INDEX "LibraryMenu_occurredAt_idx" ON "LibraryMenu"("occurredAt");

CREATE TABLE "LibraryMenuItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "menuId" TEXT NOT NULL,
  "dishId" TEXT NOT NULL,
  "course" TEXT NOT NULL,
  "wording" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "LibraryMenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "LibraryMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LibraryMenuItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "LibraryMenuItem_menuId_idx" ON "LibraryMenuItem"("menuId");
CREATE INDEX "LibraryMenuItem_dishId_idx" ON "LibraryMenuItem"("dishId");
