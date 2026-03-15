// ═══════════════════════════════════════════
// POST /api/auth/wallet
// Sign in with Solana wallet signature
// Creates Supabase user on first connect
// ═══════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client — can create users and generate sessions
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(request: NextRequest) {
  try {
    const { publicKey, signature, message } = await request.json();

    if (!publicKey || !signature || !message) {
      return NextResponse.json(
        { error: "publicKey, signature, and message are required" },
        { status: 400 }
      );
    }

    // Verify the message format (prevent replay attacks)
    // Expected: "Sign in to MEMESCOPE\nWallet: <pubkey>\nTimestamp: <unix>"
    const lines = message.split("\n");
    const timestampLine = lines.find((l: string) => l.startsWith("Timestamp:"));
    if (!timestampLine) {
      return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
    }

    const timestamp = parseInt(timestampLine.split(":")[1]?.trim(), 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
      return NextResponse.json(
        { error: "Signature expired. Please try again." },
        { status: 400 }
      );
    }

    // Verify Ed25519 signature
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = new Uint8Array(Buffer.from(signature, "base64"));
    const publicKeyBytes = new Uint8Array(Buffer.from(publicKey, "base64"));

    const valid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!valid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Use wallet address as email (deterministic, unique)
    const walletAddress = new PublicKey(publicKeyBytes).toBase58();
    const walletEmail = `${walletAddress}@wallet.memescope.app`;
    const walletPassword = `wallet_${walletAddress}_${SUPABASE_SERVICE_KEY.slice(-8)}`;

    // Try to sign in existing user first
    const { data: signInData, error: signInError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: walletEmail,
        password: walletPassword,
      });

    if (signInData?.session) {
      return NextResponse.json({
        session: signInData.session,
        user: signInData.user,
        walletAddress,
        isNew: false,
      });
    }

    // User doesn't exist — create them
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: walletEmail,
        password: walletPassword,
        email_confirm: true, // Auto-confirm — no email verification needed
        user_metadata: {
          wallet_address: walletAddress,
          auth_method: "wallet",
        },
      });

    if (createError) {
      console.error("Failed to create wallet user:", createError);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Sign in the newly created user
    const { data: newSession, error: sessionError } =
      await supabaseAdmin.auth.signInWithPassword({
        email: walletEmail,
        password: walletPassword,
      });

    if (sessionError || !newSession?.session) {
      console.error("Failed to create session:", sessionError);
      return NextResponse.json(
        { error: "Account created but sign-in failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session: newSession.session,
      user: newSession.user,
      walletAddress,
      isNew: true,
    });
  } catch (err: any) {
    console.error("Wallet auth error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
