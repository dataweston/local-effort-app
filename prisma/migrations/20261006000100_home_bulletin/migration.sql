CREATE TABLE "HomeBulletin" (
  "id" TEXT NOT NULL DEFAULT 'home',
  "markdown" TEXT NOT NULL DEFAULT '',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HomeBulletin_pkey" PRIMARY KEY ("id")
);
