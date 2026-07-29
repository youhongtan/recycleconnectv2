-- RecycleConnect Supabase Schema
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)

-- EcoProfile (one per user)
CREATE TABLE IF NOT EXISTS eco_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  xp INTEGER DEFAULT 0,
  eco_points INTEGER DEFAULT 0,
  items_recycled INTEGER DEFAULT 0,
  plastic_saved_kg REAL DEFAULT 0,
  co2_reduced_kg REAL DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  display_name TEXT DEFAULT 'Eco Hero',
  email TEXT,
  redeemed_rewards TEXT[] DEFAULT '{}',
  favourite_centres TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RecycleLog
CREATE TABLE IF NOT EXISTS recycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  material TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  weight_kg REAL DEFAULT 0,
  notes TEXT,
  centre_id UUID,
  centre_name TEXT,
  eco_points_earned INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'qr_checkin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RecyclingCentre
CREATE TABLE IF NOT EXISTS recycling_centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  lat REAL,
  lng REAL,
  hours TEXT,
  contact TEXT,
  website TEXT,
  photo_url TEXT,
  materials TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'Community Point',
  pays_cash BOOLEAN DEFAULT FALSE,
  reward_points BOOLEAN DEFAULT FALSE,
  home_collection BOOLEAN DEFAULT FALSE,
  qr_code_id TEXT,
  rating REAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL,
  centre_name TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  user_name TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  eco_points_cost INTEGER NOT NULL DEFAULT 100,
  image_url TEXT,
  category TEXT DEFAULT 'Eco Product',
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'daily' CHECK (type IN ('daily', 'weekly')),
  target INTEGER DEFAULT 5,
  metric TEXT DEFAULT 'items_recycled',
  xp_reward INTEGER DEFAULT 50,
  eco_points_reward INTEGER DEFAULT 20,
  badge TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User roles (separate table for admin role management)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage: ensure uploads bucket exists (run separately if bucket already created)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('uploads', 'uploads', TRUE, FALSE, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for uploads bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_upload_images" ON storage.objects;
CREATE POLICY "public_upload_images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'uploads');

DROP POLICY IF EXISTS "public_read_images" ON storage.objects;
CREATE POLICY "public_read_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

-- Indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_eco_profiles_user_id ON eco_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_recycle_logs_user_id ON recycle_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recycle_logs_material ON recycle_logs(material);
CREATE INDEX IF NOT EXISTS idx_recycling_centres_city ON recycling_centres(city);
CREATE INDEX IF NOT EXISTS idx_recycling_centres_materials ON recycling_centres USING GIN(materials);
CREATE INDEX IF NOT EXISTS idx_reviews_centre_id ON reviews(centre_id);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(active);
CREATE INDEX IF NOT EXISTS idx_rewards_available ON rewards(available);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);

-- Row Level Security (safe to re-run)
ALTER TABLE eco_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recycling_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policies: drop then create to allow re-runs
DROP POLICY IF EXISTS "users_read_own_profile" ON eco_profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON eco_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON eco_profiles;
DROP POLICY IF EXISTS "admin_all_eco_profiles" ON eco_profiles;
CREATE POLICY "users_read_own_profile" ON eco_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_profile" ON eco_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_profile" ON eco_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admin_all_eco_profiles" ON eco_profiles FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "users_read_own_logs" ON recycle_logs;
DROP POLICY IF EXISTS "users_insert_own_logs" ON recycle_logs;
DROP POLICY IF EXISTS "admin_all_recycle_logs" ON recycle_logs;
CREATE POLICY "users_read_own_logs" ON recycle_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_logs" ON recycle_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_all_recycle_logs" ON recycle_logs FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "public_read_centres" ON recycling_centres;
DROP POLICY IF EXISTS "admin_all_centres" ON recycling_centres;
CREATE POLICY "public_read_centres" ON recycling_centres FOR SELECT USING (TRUE);
CREATE POLICY "admin_all_centres" ON recycling_centres FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "public_read_rewards" ON rewards;
DROP POLICY IF EXISTS "admin_all_rewards" ON rewards;
CREATE POLICY "public_read_rewards" ON rewards FOR SELECT USING (TRUE);
CREATE POLICY "admin_all_rewards" ON rewards FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "public_read_challenges" ON challenges;
DROP POLICY IF EXISTS "admin_all_challenges" ON challenges;
CREATE POLICY "public_read_challenges" ON challenges FOR SELECT USING (TRUE);
CREATE POLICY "admin_all_challenges" ON challenges FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "public_read_reviews" ON reviews;
DROP POLICY IF EXISTS "users_insert_reviews" ON reviews;
CREATE POLICY "public_read_reviews" ON reviews FOR SELECT USING (TRUE);
CREATE POLICY "users_insert_reviews" ON reviews FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "users_insert_feedback" ON feedback;
CREATE POLICY "users_insert_feedback" ON feedback FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "admin_read_feedback" ON feedback;
CREATE POLICY "admin_read_feedback" ON feedback FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "admin_delete_feedback" ON feedback;
CREATE POLICY "admin_delete_feedback" ON feedback FOR DELETE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "users_read_own_role" ON user_roles;
DROP POLICY IF EXISTS "admin_read_all_roles" ON user_roles;
DROP POLICY IF EXISTS "admin_update_roles" ON user_roles;
CREATE POLICY "users_read_own_role" ON user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_read_all_roles" ON user_roles FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "admin_update_roles" ON user_roles FOR UPDATE USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Auto-create eco_profile and user_role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.eco_profiles (user_id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Eco Hero'), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
