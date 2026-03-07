// ═══════════════════════════════════════════
// POST /api/token/research
// AI research briefing — uses all available token data
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { generateResearchBriefing } from "@/lib/ai/research";
import { rateLimit } from "@/lib/middleware/rate-limit";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

// IP-based rate limit (20/hour)
const researchUsage = new Map<
  string,
  { count: number; resetAt: number }
>();

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  const limit = rateLimit(ip, true);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Per-IP 20/hour limit
  const now = Date.now();
  const usage = researchUsage.get(ip);
  if (usage && now < usage.resetAt) {
    if (usage.count >= 20) {
      return NextResponse.json(
        { error: "Research limit: 20 requests per hour" },
        { status: 429 }
      );
    }
    usage.count++;
  } else {
    researchUsage.set(ip, {
      count: 1,
      resetAt: now + 3_600_000,
    });
  }

  const body = await request.json();

  if (!body.address && !body.query) {
    return NextResponse.json(
      { error: "address or query required" },
      { status: 400 }
    );
  }

  try {
    const briefing = await generateResearchBriefing(body);
    return NextResponse.json(briefing);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
