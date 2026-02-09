-- ═══════════════════════════════════════════
-- MEMESCOPE — Database Schema
-- Run this in the Supabase SQL editor
-- ═══════════════════════════════════════════

-- Saved wallets (user watchlist)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, address)
);

-- Scan history
CREATE TABLE IF NOT EXISTS scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  total_value DECIMAL,
  total_pnl DECIMAL,
  position_count INTEGER,
  scan_data JSONB, -- full scan result cached
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_scans_wallet ON scans(wallet_address);
CREATE INDEX idx_scans_created ON scans(created_at DESC);

-- Holder count snapshots (taken every hour by cron job)
CREATE TABLE IF NOT EXISTS holder_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'SOL',
  holder_count INTEGER NOT NULL,
  top_holder_pct DECIMAL,
  whale_count INTEGER,      -- holders with >1%
  distribution JSONB,       -- {whales, large, medium, small}
  snapshot_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_holder_token ON holder_snapshots(token_address);
CREATE INDEX idx_holder_time ON holder_snapshots(snapshot_at DESC);

-- Safety scan cache (re-check every 5 min)
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
CREATE INDEX idx_safety_token ON safety_scans(token_address);
CREATE UNIQUE INDEX idx_safety_latest ON safety_scans(token_address, chain);

-- User alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'kol_mention', 'safety_drop', 'holder_spike', 'holder_dump'
  token_address TEXT,
  config JSONB, -- threshold settings etc
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- KOL calls tracking
CREATE TABLE IF NOT EXISTS kol_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  kol_username TEXT NOT NULL,
  tweet_id TEXT NOT NULL UNIQUE,
  token_ticker TEXT,
  token_address TEXT,
  sentiment TEXT, -- bullish, bearish, neutral
  price_at_call DECIMAL,
  price_after_1h DECIMAL,
  price_after_24h DECIMAL,
  tweet_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_kol_username ON kol_calls(kol_username);
CREATE INDEX idx_kol_token ON kol_calls(token_address);

-- Enable Row Level Security
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their own wallets" ON wallets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alerts" ON alerts
  FOR ALL USING (auth.uid() = user_id);

-- Public read access for scans and snapshots (no auth needed)
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scans" ON scans FOR SELECT USING (true);

ALTER TABLE holder_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read holder snapshots" ON holder_snapshots FOR SELECT USING (true);

ALTER TABLE safety_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read safety scans" ON safety_scans FOR SELECT USING (true);

ALTER TABLE kol_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read kol calls" ON kol_calls FOR SELECT USING (true);
