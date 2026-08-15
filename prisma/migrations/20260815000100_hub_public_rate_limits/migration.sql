ALTER TABLE "ObjectThread"
ADD COLUMN "singletonKey" TEXT;

UPDATE "ObjectThread"
SET "singletonKey" = 'hub-localist-public-chat'
WHERE "id" = (
    SELECT "id"
    FROM "ObjectThread"
    WHERE "objectType" = 'hub_localist' AND "objectId" = 'public-localist'
    ORDER BY "createdAt" ASC
    LIMIT 1
);

CREATE UNIQUE INDEX "ObjectThread_singletonKey_key"
ON "ObjectThread"("singletonKey");

CREATE TABLE "HubPublicRateLimitBucket" (
    "scope" TEXT NOT NULL,
    "clientHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubPublicRateLimitBucket_pkey" PRIMARY KEY ("scope", "clientHash", "windowStart")
);

CREATE INDEX "HubPublicRateLimitBucket_expiresAt_idx"
ON "HubPublicRateLimitBucket"("expiresAt");
