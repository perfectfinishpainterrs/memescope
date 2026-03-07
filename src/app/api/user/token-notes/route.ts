// ═══════════════════════════════════════════
// GET + POST /api/user/token-notes
// Manage notes for watchlist tokens via the
// watchlist table's `label` field
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

// GET /api/user/token-notes?token_address=...
export async function GET(request: NextRequest) {
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

  const tokenAddress = request.nextUrl.searchParams.get("token_address");
  if (!tokenAddress) {
    return NextResponse.json(
      { error: "token_address query param required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("watchlist")
      .select("id, token_address, chain, label")
      .eq("user_id", user.id)
      .eq("token_address", tokenAddress)
      .single();

    if (error) throw error;

    return NextResponse.json({
      token_address: data.token_address,
      chain: data.chain,
      note: data.label || "",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST /api/user/token-notes
// Body: { token_address, chain?, note }
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

  const { token_address, note } = await request.json();

  if (!token_address) {
    return NextResponse.json(
      { error: "token_address is required" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("watchlist")
      .update({ label: note || null })
      .eq("user_id", user.id)
      .eq("token_address", token_address)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      token_address: data.token_address,
      chain: data.chain,
      note: data.label || "",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
