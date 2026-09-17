-- Lossless, provenance-preserving source corpus for Company Brain.
-- LedgerEvent remains the append-only event record; this table stores the exact
-- compressed source bytes plus searchable text used to verify derived claims.

CREATE TABLE "BrainSourceDocument" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "parentSourceId" TEXT,
    "sourceUrl" TEXT,
    "mediaType" TEXT NOT NULL,
    "title" TEXT,
    "headers" JSONB,
    "textContent" TEXT NOT NULL DEFAULT '',
    "htmlContent" TEXT,
    "attachments" JSONB,
    "rawContent" BYTEA NOT NULL,
    "rawEncoding" TEXT NOT NULL DEFAULT 'gzip',
    "contentHash" TEXT NOT NULL,
    "rawByteLength" INTEGER NOT NULL,
    "storedByteLength" INTEGER NOT NULL,
    "captureStatus" TEXT NOT NULL DEFAULT 'complete',
    "extractionStatus" TEXT NOT NULL DEFAULT 'complete',
    "extractionVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrainSourceDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BrainSourceDocument_source_check" CHECK (char_length(btrim("source")) > 0),
    CONSTRAINT "BrainSourceDocument_source_id_check" CHECK (char_length(btrim("sourceId")) > 0),
    CONSTRAINT "BrainSourceDocument_media_type_check" CHECK (char_length(btrim("mediaType")) > 0),
    CONSTRAINT "BrainSourceDocument_content_hash_check" CHECK ("contentHash" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "BrainSourceDocument_byte_length_check" CHECK ("rawByteLength" >= 0 AND "storedByteLength" >= 0),
    CONSTRAINT "BrainSourceDocument_capture_status_check" CHECK ("captureStatus" IN ('complete', 'partial', 'failed')),
    CONSTRAINT "BrainSourceDocument_extraction_status_check" CHECK ("extractionStatus" IN ('complete', 'partial', 'failed')),
    CONSTRAINT "BrainSourceDocument_extraction_version_check" CHECK ("extractionVersion" >= 1)
);

CREATE UNIQUE INDEX "BrainSourceDocument_source_sourceId_key"
  ON "BrainSourceDocument"("source", "sourceId");
CREATE INDEX "BrainSourceDocument_source_parentSourceId_idx"
  ON "BrainSourceDocument"("source", "parentSourceId");
CREATE INDEX "BrainSourceDocument_occurredAt_idx"
  ON "BrainSourceDocument"("occurredAt");
CREATE INDEX "BrainSourceDocument_captureStatus_extractionStatus_idx"
  ON "BrainSourceDocument"("captureStatus", "extractionStatus");
CREATE INDEX "BrainSourceDocument_search_idx"
  ON "BrainSourceDocument"
  USING GIN (to_tsvector('simple', COALESCE("title", '') || ' ' || COALESCE("textContent", '')));
