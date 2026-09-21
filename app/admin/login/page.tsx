// app/admin/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle, Lock } from "lucide-react";
import { createClient, isSupabaseConfigured } from "../../utils/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configured) return;

    setIsLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Deliberately not distinguishing "no such user" from "wrong password".
      setError(
        signInError.message === "Invalid login credentials"
          ? "Those credentials were not recognised."
          : signInError.message,
      );
      setIsLoading(false);
      return;
    }

    // refresh() re-runs middleware and server components so the new session
    // cookie is picked up before we navigate.
    router.replace(next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-ink)] text-white">
            <Lock size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Admin sign in
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Cosy Crest management
          </p>
        </div>

        {!configured && (
          <div className="mb-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>
              Supabase is not configured <strong>in this build</strong>, so there
              is nothing to sign in to. Add your keys to{" "}
              <code className="font-mono text-xs">.env.local</code> and then
              rebuild — <code className="font-mono text-xs">NEXT_PUBLIC_*</code>{" "}
              values are baked in at build time, so an already-running server
              will never pick them up. See{" "}
              <code className="font-mono text-xs">SETUP.md</code>.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]"
        >
          {error && (
            <div className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <label className="eyebrow mb-2 block">Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-5 w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-ink)]"
          />

          <label className="eyebrow mb-2 block">Password</label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mb-6 w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-ink)]"
          />

          <button
            type="submit"
            disabled={isLoading || !configured}
            className="btn-ink flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)]">
          <Loader2 className="animate-spin text-[var(--color-muted)]" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
