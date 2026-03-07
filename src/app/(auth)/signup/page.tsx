"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/db/supabase-browser";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const supabase = createSupabaseBrowser();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="font-mono text-lg font-semibold text-neon-green">
          Check your email
        </h1>
        <p className="text-sm text-text-secondary">
          We sent a confirmation link to{" "}
          <span className="text-text-primary">{email}</span>. Click the link to
          activate your account.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-neon-green hover:underline"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h1 className="text-center font-mono text-lg font-semibold text-text-primary">
        Create Account
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

      <div>
        <label className="mb-1 block text-sm text-text-secondary">
          Confirm Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-neon-green hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
