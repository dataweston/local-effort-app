/*
  Warnings:

  - A unique constraint covering the columns `[externalKey]` on the table `RecipeIngest` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Dish" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "allergens" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "RecipeIngest" ADD COLUMN     "externalKey" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "text" TEXT;

-- CreateTable
CREATE TABLE "DishDraft" (
    "id" TEXT NOT NULL,
    "sourceIngestId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "matchedDishId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecipeIngest_externalKey_key" ON "RecipeIngest"("externalKey");

-- AddForeignKey
ALTER TABLE "DishDraft" ADD CONSTRAINT "DishDraft_sourceIngestId_fkey" FOREIGN KEY ("sourceIngestId") REFERENCES "RecipeIngest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishDraft" ADD CONSTRAINT "DishDraft_matchedDishId_fkey" FOREIGN KEY ("matchedDishId") REFERENCES "Dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
