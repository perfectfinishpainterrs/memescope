// ═══════════════════════════════════════════
// POST /api/token/research
// AI research briefing — uses all available token data
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { generateResearchBriefing } from "@/lib/ai/research";
import { rateLimit } from "@/lib/middleware/rate-limit";
import { checkAiLimit } from "@/lib/middleware/ai-limit";

function getIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function POST(request: NextRequest) {
  const ip = getIp(request);
  const limit = rateLimit(ip, true);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }

  // Auth + daily AI limit (10/day per user)
  const aiLimit = await checkAiLimit();
  if (!aiLimit.allowed) return aiLimit.error!;

  const body = await request.json();

  if (!body.address && !body.query) {
    return NextResponse.json(
      { error: "address or query required" },
      { status: 400 }
    );
  }

  try {
    const briefing = await generateResearchBriefing(body);
    return NextResponse.json({ ...briefing, aiRemaining: aiLimit.remaining });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
