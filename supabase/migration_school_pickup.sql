-- RecycleConnect V2 — School bulk recycling pickup requests
-- Run this in your Supabase SQL Editor AFTER migration.sql.
-- Safe to run multiple times (uses IF NOT EXISTS / DROP POLICY IF EXISTS).

CREATE TABLE IF NOT EXISTS school_pickup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  school_address TEXT NOT NULL,
  materials TEXT[] DEFAULT '{}',
  quantity TEXT NOT NULL DEFAULT '',
  pickup_date DATE,
  notes TEXT,
  matched_centre_id UUID,
  matched_centre_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_pickup_created ON school_pickup_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_pickup_status ON school_pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_school_pickup_materials ON school_pickup_requests USING GIN(materials);

ALTER TABLE school_pickup_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a request (schools may not have accounts yet).
DROP POLICY IF EXISTS "public_insert_school_pickup" ON school_pickup_requests;
CREATE POLICY "public_insert_school_pickup" ON school_pickup_requests
  FOR INSERT WITH CHECK (TRUE);

-- Only admins can read/update (contact details are sensitive).
DROP POLICY IF EXISTS "admin_read_school_pickup" ON school_pickup_requests;
CREATE POLICY "admin_read_school_pickup" ON school_pickup_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "admin_update_school_pickup" ON school_pickup_requests;
CREATE POLICY "admin_update_school_pickup" ON school_pickup_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_school_pickup" ON school_pickup_requests;
CREATE POLICY "admin_delete_school_pickup" ON school_pickup_requests
  FOR DELETE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
