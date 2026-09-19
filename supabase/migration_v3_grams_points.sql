-- RecycleConnect V2 — Grams points system, transactions, bulk messaging
-- Run in Supabase SQL Editor AFTER migration.sql + migration_school_pickup.sql.
-- ALL changes are additive (no drops/alters of existing columns) so the shared
-- project keeps working for older clients. Safe to run multiple times.

-- 1. Grams bookkeeping on recycle logs (+ idempotency key) ------------------
ALTER TABLE recycle_logs ADD COLUMN IF NOT EXISTS weight_g NUMERIC;
ALTER TABLE recycle_logs ADD COLUMN IF NOT EXISTS points_base INTEGER DEFAULT 0;
ALTER TABLE recycle_logs ADD COLUMN IF NOT EXISTS points_bonus INTEGER DEFAULT 0;
ALTER TABLE recycle_logs ADD COLUMN IF NOT EXISTS client_submission_id TEXT;
-- Postgres treats NULLs as distinct, so one submission id can never pay twice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_recycle_logs_client_sub
  ON recycle_logs (client_submission_id);

-- 2. Eco Point transaction ledger --------------------------------------------
CREATE TABLE IF NOT EXISTS eco_point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('recycle_base', 'weight_bonus', 'reward_redemption', 'impact_redemption')),
  reason TEXT NOT NULL DEFAULT '',
  recycling_log_id UUID REFERENCES recycle_logs(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_user_created ON eco_point_transactions(user_id, created_at DESC);

ALTER TABLE eco_point_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_tx" ON eco_point_transactions;
CREATE POLICY "users_read_own_tx" ON eco_point_transactions
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "users_insert_own_tx" ON eco_point_transactions;
CREATE POLICY "users_insert_own_tx" ON eco_point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "admin_read_all_tx" ON eco_point_transactions;
CREATE POLICY "admin_read_all_tx" ON eco_point_transactions
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 3. Reward kinds: eco vs impact ------------------------------------------------
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS reward_kind TEXT NOT NULL DEFAULT 'eco'
  CHECK (reward_kind IN ('eco', 'impact'));
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS impact_note TEXT;
-- Unique names let price updates upsert safely (old seed used DELETE+INSERT).
CREATE UNIQUE INDEX IF NOT EXISTS uq_rewards_name ON rewards (name);

-- 4. Bulk requests: ownership, review fields, real-centre recommendation ------
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS vehicle_size TEXT;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS qty_unit TEXT;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS est_weight_kg NUMERIC;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS weight_unknown BOOLEAN DEFAULT FALSE;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS volume_desc TEXT;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS centre_source TEXT NOT NULL DEFAULT 'auto'
  CHECK (centre_source IN ('auto', 'admin'));
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS admin_note TEXT;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS rec_matched_materials TEXT[] DEFAULT '{}';
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS rec_distance_km REAL;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS rec_source TEXT NOT NULL DEFAULT 'auto'
  CHECK (rec_source IN ('auto', 'admin'));
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS rec_at TIMESTAMPTZ;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS rec_pickup_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE school_pickup_requests ADD COLUMN IF NOT EXISTS rec_verified BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_school_pickup_user ON school_pickup_requests(user_id, created_at DESC);

-- Users can read their OWN requests (admins keep full access via existing policies).
DROP POLICY IF EXISTS "users_read_own_pickup" ON school_pickup_requests;
CREATE POLICY "users_read_own_pickup" ON school_pickup_requests
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Per-request user/admin conversation ---------------------------------------
CREATE TABLE IF NOT EXISTS school_pickup_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES school_pickup_requests(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pickup_msg_request ON school_pickup_messages(request_id, created_at ASC);

ALTER TABLE school_pickup_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own_messages" ON school_pickup_messages;
CREATE POLICY "users_read_own_messages" ON school_pickup_messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM school_pickup_requests r
    WHERE r.id = request_id AND r.user_id = auth.uid()
  ));
DROP POLICY IF EXISTS "users_insert_own_messages" ON school_pickup_messages;
CREATE POLICY "users_insert_own_messages" ON school_pickup_messages
  FOR INSERT WITH CHECK (
    sender = 'user' AND EXISTS (
      SELECT 1 FROM school_pickup_requests r
      WHERE r.id = request_id AND r.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "admin_all_messages" ON school_pickup_messages;
CREATE POLICY "admin_all_messages" ON school_pickup_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
