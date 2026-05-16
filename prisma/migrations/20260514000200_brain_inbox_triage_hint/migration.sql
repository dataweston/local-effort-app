-- Add triageHint JSONB column to BrainInboxItem
-- Stores structured AI triage decision separately from rawContent

ALTER TABLE "BrainInboxItem" ADD COLUMN "triageHint" JSONB;
