"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import BoreasBrandmark from "@/components/BoreasBrandmark";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `next` es adonde el middleware mandaba al usuario antes de interceptarlo
  // (ver middleware.ts) — volvemos ahí después de loggearse, no siempre a /admin.
  const next = searchParams.get("next") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Usuario o contraseña incorrectos.");
      }

      // router.push no alcanza solo: la cookie recién puesta por el servidor
      // no se refleja en el layout ya renderizado si no se refresca.
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
      setSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-boreas-navy-deep px-6">
      <div
        aria-hidden
        className="glow-orb-brand pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BoreasBrandmark />
          <p className="text-sm text-white/40">Control Center</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
              Usuario
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-status-negative">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username || !password}
            className="focus-gradient btn-gradient-brand mt-2 flex items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold uppercase tracking-wide text-white transition-opacity disabled:opacity-40 enabled:hover:opacity-90 enabled:active:scale-[0.98]"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}

// useSearchParams exige un límite de Suspense para no romper la generación
// estática de Next — esta página es puramente interactiva de todos modos.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
