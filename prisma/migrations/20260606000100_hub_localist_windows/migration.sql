CREATE TABLE "HubLocalistWindow" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdByUserId" TEXT,
  "smsCampaignId" INTEGER,
  "smsSentAt" TIMESTAMP(3),
  "smsMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "HubLocalistWindow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HubLocalistWindow_token_key" ON "HubLocalistWindow"("token");
CREATE INDEX "HubLocalistWindow_active_expiresAt_idx" ON "HubLocalistWindow"("active", "expiresAt");
CREATE INDEX "HubLocalistWindow_createdAt_idx" ON "HubLocalistWindow"("createdAt");
