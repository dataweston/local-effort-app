-- Venue booking: FIREHOUSE and FOODIST.
--
-- Availability gains a venue dimension. "client" is the pre-existing meaning of
-- every row already in this table -- we cook at the customer's place -- so the
-- default backfills the history correctly and /small-events keeps behaving as
-- it did. A date can be open at one venue and taken at the other, which is why
-- the unique key has to widen rather than the table being duplicated.

ALTER TABLE "SmallEventAvailability"
  ADD COLUMN "venue" TEXT NOT NULL DEFAULT 'client';

DROP INDEX IF EXISTS "SmallEventAvailability_date_type_key";

CREATE UNIQUE INDEX "SmallEventAvailability_date_type_venue_key"
  ON "SmallEventAvailability"("date", "type", "venue");

-- External calendars we subscribe to (Airbnb, Google Calendar, Lodgify, Vrbo).
-- A feed URL is a bearer credential: anyone holding it can read the booking
-- calendar, so it lives in the database with the rest of the operational
-- secrets rather than in the repo, and the owner can revoke one without a
-- deploy.
CREATE TABLE "VenueCalendarFeed" (
  "id" TEXT NOT NULL,
  "venue" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt" TIMESTAMP(3),
  "lastStatus" TEXT,
  "lastError" TEXT,
  "lastBlockCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VenueCalendarFeed_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenueCalendarFeed_venue_idx" ON "VenueCalendarFeed"("venue");

-- One row per busy day pulled from a feed. Sync is delete-then-insert per feed
-- inside a transaction, because a cancelled reservation vanishes from the feed
-- and must vanish here too; diffing on a UID that several sources omit would
-- buy nothing at this row count.
CREATE TABLE "VenueBlock" (
  "id" TEXT NOT NULL,
  "venue" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "summary" TEXT,
  "feedId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VenueBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VenueBlock_venue_date_idx" ON "VenueBlock"("venue", "date");
CREATE INDEX "VenueBlock_feedId_idx" ON "VenueBlock"("feedId");

ALTER TABLE "VenueBlock"
  ADD CONSTRAINT "VenueBlock_feedId_fkey"
  FOREIGN KEY ("feedId") REFERENCES "VenueCalendarFeed"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
