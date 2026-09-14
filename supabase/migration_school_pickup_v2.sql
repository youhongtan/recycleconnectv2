-- RecycleConnect V2 — School pickup requests, update 2
-- Run this ONLY if you already ran migration_school_pickup.sql BEFORE the
-- pickup-preference + photo columns were added. (Fresh installs already get
-- them from migration_school_pickup.sql.) Safe to run multiple times.

ALTER TABLE school_pickup_requests
  ADD COLUMN IF NOT EXISTS pickup_preference TEXT;

ALTER TABLE school_pickup_requests
  ADD COLUMN IF NOT EXISTS photo_url TEXT;
