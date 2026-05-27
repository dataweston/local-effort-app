-- Hub staff/privileged MVP tables.

CREATE TABLE "HubProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'staff',
  "title" TEXT,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HubProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HubInvite" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "accessLevel" TEXT NOT NULL DEFAULT 'staff',
  "displayNameHint" TEXT,
  "invitedByUserId" TEXT,
  "acceptedByUserId" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HubInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HubDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "summary" TEXT,
  "visibility" TEXT NOT NULL DEFAULT 'staff',
  "category" TEXT NOT NULL DEFAULT 'general',
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sourceId" TEXT,
  "createdByUserId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'published',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HubDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HubShiftClaim" (
  "id" TEXT NOT NULL,
  "plannerCardId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'claimed',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HubShiftClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HubProfile_userId_key" ON "HubProfile"("userId");
CREATE UNIQUE INDEX "HubProfile_email_key" ON "HubProfile"("email");
CREATE INDEX "HubProfile_accessLevel_idx" ON "HubProfile"("accessLevel");
CREATE INDEX "HubProfile_status_idx" ON "HubProfile"("status");

CREATE UNIQUE INDEX "HubInvite_token_key" ON "HubInvite"("token");
CREATE INDEX "HubInvite_email_idx" ON "HubInvite"("email");
CREATE INDEX "HubInvite_accessLevel_idx" ON "HubInvite"("accessLevel");

CREATE INDEX "HubDocument_visibility_idx" ON "HubDocument"("visibility");
CREATE INDEX "HubDocument_category_idx" ON "HubDocument"("category");
CREATE INDEX "HubDocument_status_idx" ON "HubDocument"("status");
CREATE UNIQUE INDEX "HubDocument_source_sourceId_key" ON "HubDocument"("source", "sourceId");

CREATE UNIQUE INDEX "HubShiftClaim_plannerCardId_userId_key" ON "HubShiftClaim"("plannerCardId", "userId");
CREATE INDEX "HubShiftClaim_plannerCardId_idx" ON "HubShiftClaim"("plannerCardId");
CREATE INDEX "HubShiftClaim_userId_idx" ON "HubShiftClaim"("userId");
CREATE INDEX "HubShiftClaim_status_idx" ON "HubShiftClaim"("status");

ALTER TABLE "HubProfile"
  ADD CONSTRAINT "HubProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HubInvite"
  ADD CONSTRAINT "HubInvite_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HubInvite"
  ADD CONSTRAINT "HubInvite_acceptedByUserId_fkey"
  FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HubDocument"
  ADD CONSTRAINT "HubDocument_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
