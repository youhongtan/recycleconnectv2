-- RecycleConnect V2 — fix admin RLS infinite recursion.
--
-- ROOT CAUSE: every admin policy checked
--   EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() ...)
-- but user_roles itself is RLS-protected, so evaluating ANY admin policy
-- re-enters user_roles RLS forever. PostgREST answers HTTP 500, the app gets
-- no profile/role, and pages crash. (The old project hit this before and
-- fixed it the same way.)
--
-- FIX: a SECURITY DEFINER helper that reads user_roles bypassing RLS, used
-- by every admin policy. No recursion possible. Safe to run multiple times.
-- Run in any project showing HTTP 500 on eco_profiles / user_roles reads.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- eco_profiles
DROP POLICY IF EXISTS "admin_all_eco_profiles" ON eco_profiles;
CREATE POLICY "admin_all_eco_profiles" ON eco_profiles
  FOR ALL USING (public.is_admin());

-- recycle_logs
DROP POLICY IF EXISTS "admin_all_recycle_logs" ON recycle_logs;
CREATE POLICY "admin_all_recycle_logs" ON recycle_logs
  FOR ALL USING (public.is_admin());

-- recycling_centres
DROP POLICY IF EXISTS "admin_all_centres" ON recycling_centres;
CREATE POLICY "admin_all_centres" ON recycling_centres
  FOR ALL USING (public.is_admin());

-- rewards
DROP POLICY IF EXISTS "admin_all_rewards" ON rewards;
CREATE POLICY "admin_all_rewards" ON rewards
  FOR ALL USING (public.is_admin());

-- challenges
DROP POLICY IF EXISTS "admin_all_challenges" ON challenges;
CREATE POLICY "admin_all_challenges" ON challenges
  FOR ALL USING (public.is_admin());

-- feedback
DROP POLICY IF EXISTS "admin_read_feedback" ON feedback;
CREATE POLICY "admin_read_feedback" ON feedback
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "admin_delete_feedback" ON feedback;
CREATE POLICY "admin_delete_feedback" ON feedback
  FOR DELETE USING (public.is_admin());

-- user_roles (the table that caused the recursion)
DROP POLICY IF EXISTS "admin_read_all_roles" ON user_roles;
CREATE POLICY "admin_read_all_roles" ON user_roles
  FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "admin_update_roles" ON user_roles;
CREATE POLICY "admin_update_roles" ON user_roles
  FOR UPDATE USING (public.is_admin());

-- school_pickup_requests (if the table exists)
DO $$
BEGIN
  IF to_regclass('public.school_pickup_requests') IS NOT NULL THEN
    DROP POLICY IF EXISTS "admin_read_school_pickup" ON school_pickup_requests;
    CREATE POLICY "admin_read_school_pickup" ON school_pickup_requests
      FOR SELECT USING (public.is_admin());
    DROP POLICY IF EXISTS "admin_update_school_pickup" ON school_pickup_requests;
    CREATE POLICY "admin_update_school_pickup" ON school_pickup_requests
      FOR UPDATE USING (public.is_admin());
    DROP POLICY IF EXISTS "admin_delete_school_pickup" ON school_pickup_requests;
    CREATE POLICY "admin_delete_school_pickup" ON school_pickup_requests
      FOR DELETE USING (public.is_admin());
  END IF;
END $$;

-- school_pickup_messages (if the table exists)
DO $$
BEGIN
  IF to_regclass('public.school_pickup_messages') IS NOT NULL THEN
    DROP POLICY IF EXISTS "admin_all_messages" ON school_pickup_messages;
    CREATE POLICY "admin_all_messages" ON school_pickup_messages
      FOR ALL USING (public.is_admin());
  END IF;
END $$;

-- eco_point_transactions (if the table exists)
DO $$
BEGIN
  IF to_regclass('public.eco_point_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "admin_read_all_tx" ON eco_point_transactions;
    CREATE POLICY "admin_read_all_tx" ON eco_point_transactions
      FOR SELECT USING (public.is_admin());
    DROP POLICY IF EXISTS "admin_all_transactions" ON eco_point_transactions;
    CREATE POLICY "admin_all_transactions" ON eco_point_transactions
      FOR ALL USING (public.is_admin());
  END IF;
END $$;
