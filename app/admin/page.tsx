"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  Building2,
  Inbox,
  MessageCircleWarning,
  LogOut,
  Nfc,
  Star,
  ThumbsDown,
  ChevronRight,
} from "lucide-react";
import BoreasBrandmark from "@/components/BoreasBrandmark";
import type { OverviewStatsRow } from "@/types/database";

// Portada de /admin: accesos directos (negocios / chips sin activar /
// feedback negativo) + estadísticas generales del negocio. El detalle de
// cada lista (comercios con sus propias estadísticas, chips sin activar)
// vive en app/admin/negocios y app/admin/sin-activar — antes todo esto era
// una sola página larga; se separó para que la portada sea un resumen, no un
// scroll infinito.

function OptionCard({
  href,
  icon,
  label,
  helper,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  helper: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-white/10 bg-boreas-navy px-4 py-4 hover:bg-white/[0.03]"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-boreas-cyan/10 text-boreas-cyan">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="truncate text-xs text-white/40">{helper}</p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-white/30" />
    </Link>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-boreas-navy px-4 py-3">
      <div className="flex items-center gap-1.5 text-white/40">
        {icon}
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SkeletonStatTile() {
  return (
    <div className="rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 animate-pulse">
      <div className="h-3 w-16 rounded bg-white/10" />
      <div className="mt-2 h-6 w-10 rounded bg-white/10" />
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [chipCodeInput, setChipCodeInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [stats, setStats] = useState<OverviewStatsRow | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats/overview")
      .then((res) => res.json())
      .then((data) => setStats(data.stats ?? null))
      .catch(() => setStatsError("No se pudieron cargar las estadísticas."))
      .finally(() => setLoadingStats(false));
  }, []);

  async function handleSearch() {
    const code = chipCodeInput.trim();
    if (!code) return;
    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/chips/lookup?chip_code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Chip no encontrado.");
      }
      const data = await res.json();
      router.push(`/admin/activar/${encodeURIComponent(data.chip.chip_code)}`);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Error inesperado.");
      setSearching(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  const averageLabel = stats?.average_rating != null ? stats.average_rating.toFixed(1) : "—";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-boreas-navy-deep px-5 py-8">
      <div
        aria-hidden
        className="glow-orb-brand pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
      />
      <div className="relative z-10 mx-auto max-w-2xl">
        <header className="mb-4 flex items-center justify-between">
          <BoreasBrandmark />
          <div className="flex items-center gap-3">
            <h1 className="font-cormorant text-2xl font-semibold text-white">Control Center</h1>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white/70"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>
        <div className="mb-6 h-0.5 w-full bg-gradient-to-r from-boreas-cyan to-boreas-violet" />

        <section className="mb-8">
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Activar chip por código
          </label>
          <div className="flex gap-2">
            <input
              value={chipCodeInput}
              onChange={(e) => setChipCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="BOREAS-001"
              className="flex-1 rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 font-mono text-base text-white placeholder:text-white/50 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center justify-center rounded-xl bg-boreas-violet px-4 text-white disabled:opacity-40"
            >
              {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
          {searchError && <p className="mt-2 text-sm text-status-negative">{searchError}</p>}
        </section>

        <section className="mb-8 flex flex-col gap-3">
          <OptionCard
            href="/admin/negocios"
            icon={<Building2 size={18} />}
            label="Ver negocios"
            helper="Comercios activos, sus chips y sus estadísticas"
          />
          <OptionCard
            href="/admin/sin-activar"
            icon={<Inbox size={18} />}
            label="Ver NFC sin activar"
            helper="Inventario pendiente de instalar"
          />
          <OptionCard
            href="/admin/feedback"
            icon={<MessageCircleWarning size={18} />}
            label="Ver feedback negativo"
            helper="Comentarios de reseñas de 1-3 estrellas"
          />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
            Estadísticas generales
          </h2>

          {statsError ? (
            <p className="text-sm text-status-negative">{statsError}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {loadingStats || !stats ? (
                <>
                  <SkeletonStatTile />
                  <SkeletonStatTile />
                  <SkeletonStatTile />
                  <SkeletonStatTile />
                  <SkeletonStatTile />
                  <SkeletonStatTile />
                </>
              ) : (
                <>
                  <StatTile icon={<Nfc size={14} />} label="NFC vendidos" value={String(stats.active_chips)} />
                  <StatTile icon={<Inbox size={14} />} label="Sin activar" value={String(stats.pending_chips)} />
                  <StatTile icon={<Building2 size={14} />} label="Negocios" value={String(stats.total_clients)} />
                  <StatTile icon={<Star size={14} />} label="Reseñas hechas" value={String(stats.total_reviews)} />
                  <StatTile icon={<Star size={14} />} label="Promedio" value={averageLabel} />
                  <StatTile
                    icon={<ThumbsDown size={14} />}
                    label="Reseñas negativas"
                    value={String(stats.negative_reviews)}
                  />
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
