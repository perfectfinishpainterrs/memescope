// ═══════════════════════════════════════════
// POST /api/token/research
// AI research briefing — auth required, 5/hour limit
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { generateResearchBriefing } from "@/lib/ai/research";
import { createSupabaseServer } from "@/lib/db/supabase-server";
import { rateLimit } from "@/lib/middleware/rate-limit";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

// Per-user hourly rate limit for research (5/hour)
const researchUsage = new Map<
  string,
  { count: number; resetAt: number }
>();

export async function POST(request: NextRequest) {
  // General rate limit
  const ip = getIp(request);
  const limit = rateLimit(ip, true);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Auth required
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Per-user 5/hour limit
  const now = Date.now();
  const usage = researchUsage.get(user.id);
  if (usage && now < usage.resetAt) {
    if (usage.count >= 5) {
      return NextResponse.json(
        { error: "Research limit: 5 requests per hour" },
        { status: 429 }
      );
    }
    usage.count++;
  } else {
    researchUsage.set(user.id, {
      count: 1,
      resetAt: now + 3_600_000,
    });
  }

  const { query } = await request.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "query string required" },
      { status: 400 }
    );
  }

  try {
    const briefing = await generateResearchBriefing(query);
    return NextResponse.json(briefing);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
