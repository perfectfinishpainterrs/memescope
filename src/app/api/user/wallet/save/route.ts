// ═══════════════════════════════════════════
// POST /api/user/wallet/save
// Save a wallet address to user's collection
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/db/supabase-server";
import { rateLimit } from "@/lib/middleware/rate-limit";

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

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { address, chain, label } = await request.json();

  if (!address) {
    return NextResponse.json(
      { error: "Wallet address required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("saved_wallets")
      .insert({
        user_id: user.id,
        address,
        chain: chain || "SOL",
        label: label || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
