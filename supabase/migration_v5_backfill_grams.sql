-- RecycleConnect V2 — backfill grams for pre-grams history.
-- Old accounts logged weight_kg (or nothing) before weight_g existed. This
-- gives every historical row a gram value + submission id so medal tiers,
-- bonuses history and progress bars include ALL accounts, old and new.
-- Additive, idempotent (WHERE clauses only touch missing values).

-- 1. Grams from recorded kilograms where available.
UPDATE recycle_logs
SET weight_g = weight_kg * 1000
WHERE weight_g IS NULL AND weight_kg IS NOT NULL AND weight_kg > 0;

-- 2. Remaining rows (e.g. old QR check-ins stored weight 0): keep 0, but give
--    them a stable submission id so each historic entry counts as its own
--    submission instead of collapsing together.
UPDATE recycle_logs
SET client_submission_id = id::text
WHERE client_submission_id IS NULL;

-- 3. Points columns for rows predating them (best-effort from earned total).
UPDATE recycle_logs
SET points_base = COALESCE(eco_points_earned, 0),
    points_bonus = 0
WHERE points_base IS NULL;
