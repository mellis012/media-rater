-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Profiles table: extends auth.users with a public username
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  rating NUMERIC(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  image TEXT,
  parent_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, item_id)
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone can read, only owner can update
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Ratings: anyone can read, only owner can write
CREATE POLICY "ratings_select" ON ratings FOR SELECT USING (true);
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ratings_update" ON ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ratings_delete" ON ratings FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- Trigger: auto-create a profile stub when a new user signs up
-- Runs as SECURITY DEFINER so it bypasses RLS even when the
-- user isn't fully authenticated yet (e.g. email confirmation).
-- The username is left NULL here; the user sets it via the app.
-- ============================================================

-- Allow username to be temporarily null for trigger-created rows
ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
