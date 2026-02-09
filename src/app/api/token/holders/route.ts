// ═══════════════════════════════════════════
// GET /api/token/holders?address=...
// Returns holder count, distribution, trend
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { getTokenHolders } from "@/lib/blockchain/solana";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Token address required" },
      { status: 400 }
    );
  }

  try {
    const holderData = await getTokenHolders(address);

    // TODO: Add holder history from snapshots in DB
    // TODO: Calculate inflow/outflow from comparing snapshots
    // TODO: Classify holder buckets (whale, large, med, small)

    return NextResponse.json(holderData);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
