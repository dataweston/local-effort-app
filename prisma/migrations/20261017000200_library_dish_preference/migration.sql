CREATE TABLE "LibraryDishPreference" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "dishId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "LibraryDishPreference_userId_dishId_key" ON "LibraryDishPreference"("userId", "dishId");
CREATE INDEX "LibraryDishPreference_dishId_idx" ON "LibraryDishPreference"("dishId");
