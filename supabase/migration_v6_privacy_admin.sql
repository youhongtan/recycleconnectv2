-- RecycleConnect V2 — profile privacy + admin adjustments.
-- Run in Supabase SQL Editor AFTER migration_v3_grams_points.sql.
-- Additive only (one CHECK widened on a V2-new table). Safe to run multiple times.

-- 1. Visibility flag (default public = current behaviour preserved) ------------
ALTER TABLE eco_profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- Public leaderboard: anyone can read profiles flagged public.
DROP POLICY IF EXISTS "public_read_leaderboard" ON eco_profiles;
CREATE POLICY "public_read_leaderboard" ON eco_profiles
  FOR SELECT USING (is_public = TRUE);

-- 2. Ledger: allow admin adjustments -------------------------------------------
ALTER TABLE eco_point_transactions DROP CONSTRAINT IF EXISTS eco_point_transactions_type_check;
ALTER TABLE eco_point_transactions ADD CONSTRAINT eco_point_transactions_type_check
  CHECK (type IN ('recycle_base', 'weight_bonus', 'reward_redemption', 'impact_redemption', 'admin_adjustment'));

DROP POLICY IF EXISTS "admin_all_transactions" ON eco_point_transactions;
CREATE POLICY "admin_all_transactions" ON eco_point_transactions
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
