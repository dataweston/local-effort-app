-- Native mobile hub foundation.
-- These tables intentionally keep most cross-domain references as indexed IDs
-- while the organization/space/role model settles.

CREATE TABLE "HubOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubOrganization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HubSpace" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubSpace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HubSpaceMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "userId" TEXT,
    "customerId" TEXT,
    "role" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'customer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubSpaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ObjectThread" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "spaceId" TEXT,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ObjectThreadMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderRole" TEXT,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ObjectThreadMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HubCapture" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "spaceId" TEXT,
    "objectId" TEXT,
    "objectType" TEXT,
    "visibility" TEXT,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "actorId" TEXT,
    "actorRole" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawContent" TEXT NOT NULL,
    "attachments" JSONB,
    "clientCreatedAt" TIMESTAMP(3),
    "offlineQueueId" TEXT,
    "captureIntent" TEXT NOT NULL,
    "ledgerEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'captured',
    "routingSuggestions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HubCapture_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MobilePushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "supabaseUid" TEXT,
    "platform" TEXT NOT NULL,
    "pushToken" TEXT NOT NULL,
    "deviceId" TEXT,
    "permissionsStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HubOrganization_slug_key" ON "HubOrganization"("slug");
CREATE UNIQUE INDEX "HubSpace_organizationId_key_key" ON "HubSpace"("organizationId", "key");
CREATE UNIQUE INDEX "HubCapture_source_sourceId_key" ON "HubCapture"("source", "sourceId");
CREATE UNIQUE INDEX "MobilePushToken_pushToken_key" ON "MobilePushToken"("pushToken");

CREATE INDEX "HubSpace_organizationId_idx" ON "HubSpace"("organizationId");
CREATE INDEX "HubSpaceMembership_organizationId_spaceId_idx" ON "HubSpaceMembership"("organizationId", "spaceId");
CREATE INDEX "HubSpaceMembership_userId_idx" ON "HubSpaceMembership"("userId");
CREATE INDEX "HubSpaceMembership_customerId_idx" ON "HubSpaceMembership"("customerId");
CREATE INDEX "ObjectThread_organizationId_spaceId_idx" ON "ObjectThread"("organizationId", "spaceId");
CREATE INDEX "ObjectThread_objectType_objectId_idx" ON "ObjectThread"("objectType", "objectId");
CREATE INDEX "ObjectThread_visibility_idx" ON "ObjectThread"("visibility");
CREATE INDEX "ObjectThreadMessage_threadId_createdAt_idx" ON "ObjectThreadMessage"("threadId", "createdAt");
CREATE INDEX "ObjectThreadMessage_senderId_idx" ON "ObjectThreadMessage"("senderId");
CREATE INDEX "HubCapture_organizationId_spaceId_idx" ON "HubCapture"("organizationId", "spaceId");
CREATE INDEX "HubCapture_objectType_objectId_idx" ON "HubCapture"("objectType", "objectId");
CREATE INDEX "HubCapture_actorId_idx" ON "HubCapture"("actorId");
CREATE INDEX "HubCapture_status_createdAt_idx" ON "HubCapture"("status", "createdAt");
CREATE INDEX "HubCapture_offlineQueueId_idx" ON "HubCapture"("offlineQueueId");
CREATE INDEX "HubCapture_ledgerEventId_idx" ON "HubCapture"("ledgerEventId");
CREATE INDEX "MobilePushToken_userId_idx" ON "MobilePushToken"("userId");
CREATE INDEX "MobilePushToken_supabaseUid_idx" ON "MobilePushToken"("supabaseUid");
CREATE INDEX "MobilePushToken_platform_idx" ON "MobilePushToken"("platform");

ALTER TABLE "HubSpace"
  ADD CONSTRAINT "HubSpace_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "HubOrganization"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HubSpaceMembership"
  ADD CONSTRAINT "HubSpaceMembership_spaceId_fkey"
  FOREIGN KEY ("spaceId") REFERENCES "HubSpace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ObjectThreadMessage"
  ADD CONSTRAINT "ObjectThreadMessage_threadId_fkey"
  FOREIGN KEY ("threadId") REFERENCES "ObjectThread"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing guardrail index was intentionally non-unique. Mobile capture needs
-- retry safety, but this partial unique index should only be applied after any
-- duplicate source events have been cleaned up.
-- CREATE UNIQUE INDEX "LedgerEvent_eventType_source_sourceId_unique"
--   ON "LedgerEvent"("eventType", source, "sourceId")
--   WHERE "sourceId" IS NOT NULL;
