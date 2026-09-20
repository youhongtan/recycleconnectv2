-- RecycleConnect V2 — tier trophies (limited stock, holder display).
-- Run in Supabase SQL Editor AFTER migration_v3_grams_points.sql.
-- Additive only. Safe to run multiple times.

-- Tier qualification threshold (single-submission grams) + rotating stock.
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS tier_min_grams INTEGER;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS stock_total INTEGER;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS stock_left INTEGER;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS holder_name TEXT;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS holder_at TIMESTAMPTZ;
