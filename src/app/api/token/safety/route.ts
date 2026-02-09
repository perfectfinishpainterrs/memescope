// ═══════════════════════════════════════════
// GET /api/token/safety?address=...&chain=SOL
// Returns scam scanner results for a token
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { calculateSafetyScore } from "@/lib/scoring/safety";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const chain = request.nextUrl.searchParams.get("chain") || "SOL";

  if (!address) {
    return NextResponse.json(
      { error: "Token address required" },
      { status: 400 }
    );
  }

  try {
    const safetyData = await calculateSafetyScore(address, chain);
    return NextResponse.json(safetyData);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
