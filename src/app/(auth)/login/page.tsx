"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/db/supabase-browser";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth" ? "Authentication failed." : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const next = searchParams.get("next") ?? "/scan";
    router.push(next);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h1 className="text-center font-mono text-lg font-semibold text-text-primary">
        Sign In
      </h1>

      {error && (
        <div className="rounded border border-neon-red/30 bg-neon-red/10 px-3 py-2 text-sm text-neon-red">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-border bg-bg-deep px-3 py-2 text-text-primary placeholder-text-dim outline-none focus:border-neon-green"
          placeholder="you@email.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded border border-border bg-bg-deep px-3 py-2 text-text-primary placeholder-text-dim outline-none focus:border-neon-green"
          placeholder="********"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-neon-green py-2 font-mono font-semibold text-bg-deep transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>

      <p className="text-center text-sm text-text-secondary">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-neon-green hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  );
}
