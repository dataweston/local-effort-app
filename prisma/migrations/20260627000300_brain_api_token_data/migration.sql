-- BrainApiToken.tokenData existed in schema.prisma but was never migrated to the
-- DB, so token creation threw P2022. Non-breaking nullable add.
ALTER TABLE "BrainApiToken" ADD COLUMN IF NOT EXISTS "tokenData" JSONB;
