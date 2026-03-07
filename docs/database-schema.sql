-- ═══════════════════════════════════════════
-- MEMESCOPE — Database Schema
-- Run this in the Supabase SQL editor
-- ═══════════════════════════════════════════

-- ── Profiles (extends auth.users) ─────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Saved Wallets ─────────────────────────

CREATE TABLE IF NOT EXISTS saved_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, address, chain)
);

-- ── Legacy wallets table (kept for backward compat) ──

CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, address)
);

-- ── Scan Cache ────────────────────────────

CREATE TABLE IF NOT EXISTS scan_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  total_value DECIMAL,
  total_pnl DECIMAL,
  position_count INTEGER,
  scan_data JSONB,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, chain)
);
CREATE INDEX IF NOT EXISTS idx_scan_cache_wallet ON scan_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_scan_cache_cached ON scan_cache(cached_at DESC);

-- ── Scans (historical log) ────────────────

CREATE TABLE IF NOT EXISTS scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  total_value DECIMAL,
  total_pnl DECIMAL,
  position_count INTEGER,
  scan_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scans_wallet ON scans(wallet_address);
CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at DESC);

-- ── Holder Snapshots ──────────────────────

CREATE TABLE IF NOT EXISTS holder_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  holder_count INTEGER NOT NULL,
  top_holder_pct DECIMAL,
  whale_count INTEGER,
  distribution JSONB,
  snapshot_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_holder_token ON holder_snapshots(token_address);
CREATE INDEX IF NOT EXISTS idx_holder_time ON holder_snapshots(snapshot_at DESC);

-- ── Safety Cache ──────────────────────────

CREATE TABLE IF NOT EXISTS safety_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  checks JSONB NOT NULL,
  flags TEXT[] DEFAULT '{}',
  positives TEXT[] DEFAULT '{}',
  deployer_history TEXT,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(token_address, chain)
);
CREATE INDEX IF NOT EXISTS idx_safety_cache_token ON safety_cache(token_address);

-- ── Legacy safety_scans (kept for backward compat) ──

CREATE TABLE IF NOT EXISTS safety_scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  checks JSONB NOT NULL,
  flags TEXT[] DEFAULT '{}',
  positives TEXT[] DEFAULT '{}',
  deployer_history TEXT,
  scanned_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_safety_token ON safety_scans(token_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_safety_latest ON safety_scans(token_address, chain);

-- ── Watchlist ─────────────────────────────

CREATE TABLE IF NOT EXISTS watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token_address, chain)
);

-- ── Scan History (per-user) ───────────────

CREATE TABLE IF NOT EXISTS scan_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  scanned_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scan_history_user ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_time ON scan_history(scanned_at DESC);

-- ── Alerts ────────────────────────────────

CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token_address TEXT,
  chain TEXT NOT NULL DEFAULT 'SOL',
  alert_type TEXT NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'safety_drop', 'holder_drop', 'whale_move')),
  threshold JSONB NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── KOL Calls ─────────────────────────────

CREATE TABLE IF NOT EXISTS kol_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kol_username TEXT NOT NULL,
  tweet_id TEXT NOT NULL UNIQUE,
  token_ticker TEXT,
  token_address TEXT,
  sentiment TEXT,
  price_at_call DECIMAL,
  price_after_1h DECIMAL,
  price_after_24h DECIMAL,
  tweet_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kol_username ON kol_calls(kol_username);
CREATE INDEX IF NOT EXISTS idx_kol_token ON kol_calls(token_address);

-- ═══════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════

-- User-scoped tables: only owner can read/write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

ALTER TABLE saved_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own saved_wallets" ON saved_wallets
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own wallets" ON wallets
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE scan_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own scan_history" ON scan_history
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own alerts" ON alerts
  FOR ALL USING (auth.uid() = user_id);

-- Public read, server write tables
ALTER TABLE scan_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scan_cache" ON scan_cache FOR SELECT USING (true);
CREATE POLICY "Service insert scan_cache" ON scan_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update scan_cache" ON scan_cache FOR UPDATE USING (true);

ALTER TABLE safety_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read safety_cache" ON safety_cache FOR SELECT USING (true);
CREATE POLICY "Service insert safety_cache" ON safety_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update safety_cache" ON safety_cache FOR UPDATE USING (true);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scans" ON scans FOR SELECT USING (true);

ALTER TABLE holder_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read holder snapshots" ON holder_snapshots FOR SELECT USING (true);

ALTER TABLE safety_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read safety scans" ON safety_scans FOR SELECT USING (true);

ALTER TABLE kol_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read kol calls" ON kol_calls FOR SELECT USING (true);
