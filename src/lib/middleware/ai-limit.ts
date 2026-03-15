// ═══════════════════════════════════════════
// AI Usage Limiter
// 10 AI calls per user per day (UTC reset)
// Requires authenticated Supabase user
// ═══════════════════════════════════════════

import { createSupabaseServer } from "@/lib/db/supabase-server";
import { NextResponse } from "next/server";

const DAILY_LIMIT = 10;

// In-memory tracking: userId -> { count, dateKey }
// This is a fast path to avoid hitting Supabase on every call.
// Resets on server restart (safe — just means users get a fresh count).
const usage = new Map<string, { count: number; dateKey: string }>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // "2026-03-14"
}

interface AiLimitResult {
  allowed: boolean;
  userId: string | null;
  remaining: number;
  error?: NextResponse;
}

/**
 * Check if the authenticated user can make an AI call.
 * Returns { allowed, userId, remaining } or an error response.
 */
export async function checkAiLimit(): Promise<AiLimitResult> {
  // 1. Auth check
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      allowed: false,
      userId: null,
      remaining: 0,
      error: NextResponse.json(
        { error: "Sign in to use AI analysis", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    };
  }

  // 2. Check daily usage
  const today = todayKey();
  const entry = usage.get(user.id);

  if (!entry || entry.dateKey !== today) {
    // New day or first request — reset
    usage.set(user.id, { count: 1, dateKey: today });
    return { allowed: true, userId: user.id, remaining: DAILY_LIMIT - 1 };
  }

  if (entry.count >= DAILY_LIMIT) {
    return {
      allowed: false,
      userId: user.id,
      remaining: 0,
      error: NextResponse.json(
        {
          error: `Daily AI limit reached (${DAILY_LIMIT}/day). Resets at midnight UTC.`,
          code: "AI_LIMIT_REACHED",
          limit: DAILY_LIMIT,
          resetAt: `${today}T24:00:00Z`,
        },
        { status: 429 }
      ),
    };
  }

  entry.count++;
  const remaining = DAILY_LIMIT - entry.count;
  return { allowed: true, userId: user.id, remaining };
}
