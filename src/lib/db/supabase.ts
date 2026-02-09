// ═══════════════════════════════════════════
// Supabase Database Client
// ═══════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client-side (browser) — uses anon key, respects RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side — uses service role key, bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ── Database Schema (run in Supabase SQL editor) ──
//
// See docs/database-schema.sql for the full schema.
// Key tables:
//   - users: auth + profile
//   - wallets: saved wallet addresses
//   - scans: scan history
//   - holder_snapshots: hourly holder count snapshots
//   - safety_scans: cached safety scan results
//   - alerts: user alert preferences
