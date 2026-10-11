"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { animate, motion } from "framer-motion";
import { Nfc, Zap, MessageCircleWarning, Star, ArrowUp, ArrowDown, TrendingUp, PieChart, Radio } from "lucide-react";

// recharts es la librería más pesada de /admin — separada en su propio
// chunk (components/admin/TapsAreaChart.tsx y ClientDonutChart.tsx), pedida
// después de que las tarjetas de métrica ya pintaron, no antes. ssr:false
// porque de todos modos esta página entera es "use client" con fetch en
// useEffect — no hay nada que ganar renderizándolo en el servidor.
const TapsAreaChart = dynamic(() => import("@/components/admin/TapsAreaChart"), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-[220px] rounded-xl" />,
});
const ClientDonutChart = dynamic(() => import("@/components/admin/ClientDonutChart"), {
  ssr: false,
  loading: () => <div className="skeleton-shimmer h-[200px] rounded-xl" />,
});

interface DashboardData {
  range: string;
  cards: {
    taps: { value: number; deltaPct: number | null };
    activeChips: { value: number; deltaPct: number | null };
    negativeFeedback: { value: number; deltaPct: number | null };
    avgRating: { value: number | null; deltaPct: null; partial: true };
  };
  chart: { window_start: string; taps: string[] };
  clientDistribution: { business_name: string; taps: number }[];
  feed: Array<{ type: "tap" | "feedback"; business_name: string; rating?: number; created_at: string }>;
}

// Mismo lenguaje de color que el resto de /admin (brick/mustard/status.*),
// en el orden en que Recharts va a pintar las porciones del donut — debe
// coincidir con DONUT_COLORS en components/admin/ClientDonutChart.tsx.
const DONUT_COLORS = ["#B5472E", "#E3A72F", "#6B8E4E", "#D9694D", "#8A6D9E", "#5B6B7A"];

// DD/MM/YY numérico (13/09/26) en vez de "13 sept" — pedido explícito, para
// el eje de "Taps en el tiempo".
function formatShortDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} d`;
}

function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion) {
      el.textContent = value.toFixed(decimals);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.8,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => {
        if (el) el.textContent = v.toFixed(decimals);
      },
    });
    return () => controls.stop();
  }, [value, decimals, prefersReducedMotion]);

  return <span ref={ref} className="tabular-nums" />;
}

function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct === null) return <span className="text-xs text-boreas-cream/35">sin dato previo</span>;
  const isUp = deltaPct >= 0;
  const Icon = isUp ? ArrowUp : ArrowDown;
  const color = isUp ? "text-status-positive" : "text-status-negative";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon size={11} />
      {Math.abs(deltaPct).toFixed(0)}%
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  decimals = 0,
  delta,
  note,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  decimals?: number;
  delta?: number | null;
  note?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.32, 0.72, 0, 1] }}
      whileHover={{ y: -4 }}
      className="glass-panel rounded-2xl p-4"
    >
      <div className="flex items-center gap-2 text-boreas-cream/45">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none text-boreas-cream">
        <CountUp value={value} decimals={decimals} />
      </p>
      <div className="mt-2 flex items-center gap-2">
        {delta !== undefined && <DeltaBadge deltaPct={delta} />}
        {note && <span className="text-xs text-boreas-cream/35">{note}</span>}
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return <div className="glass-panel skeleton-shimmer h-[104px] rounded-2xl" />;
}

// Mismo lenguaje que el resto de /admin (FeedbackPanel, Clientes, Chips):
// ícono en círculo + mensaje + explicación de qué hace falta para que deje
// de estar vacío — nunca solo una línea de texto centrada.
function CardEmptyState({
  icon,
  title,
  subtitle,
  minHeight,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  minHeight: number;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center" style={{ minHeight }}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-boreas-cream/5 text-boreas-cream/30">
        {icon}
      </div>
      <p className="text-sm font-medium text-boreas-cream/60">{title}</p>
      <p className="max-w-[220px] text-xs text-boreas-cream/35">{subtitle}</p>
    </div>
  );
}

const RANGE_LABEL: Record<string, string> = { today: "hoy", "7d": "los últimos 7 días", "30d": "los últimos 30 días" };

function AdminResumenContent() {
  const searchParams = useSearchParams();
  const range = searchParams.get("range") ?? "7d";

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/stats/dashboard?range=${range}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setError("No se pudo cargar el dashboard."))
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const buckets = new Map<string, number>();
    for (const iso of data.chart.taps) {
      const d = new Date(iso);
      let key: string;
      if (bucket === "daily") {
        key = formatShortDate(d);
      } else {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = formatShortDate(weekStart);
      }
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([date, taps]) => ({ date, taps }));
  }, [data, bucket]);

  const donutTotal = useMemo(
    () => (data?.clientDistribution ?? []).reduce((sum, c) => sum + c.taps, 0),
    [data]
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-cormorant text-2xl font-semibold text-boreas-cream">Resumen</h1>
          <p className="mt-0.5 text-sm text-boreas-cream/45">Datos de {RANGE_LABEL[range] ?? "los últimos 7 días"}.</p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-status-negative">{error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {loading || !data ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <MetricCard
                  index={0}
                  icon={<Nfc size={14} />}
                  label="Taps totales"
                  value={data.cards.taps.value}
                  delta={data.cards.taps.deltaPct}
                />
                <MetricCard
                  index={1}
                  icon={<Zap size={14} />}
                  label="Chips activos"
                  value={data.cards.activeChips.value}
                  delta={data.cards.activeChips.deltaPct}
                  note="total"
                />
                <MetricCard
                  index={2}
                  icon={<MessageCircleWarning size={14} />}
                  label="Feedback negativo"
                  value={data.cards.negativeFeedback.value}
                  delta={data.cards.negativeFeedback.deltaPct}
                />
                <MetricCard
                  index={3}
                  icon={<Star size={14} />}
                  label="Promedio (1-3★)"
                  value={data.cards.avgRating.value ?? 0}
                  decimals={1}
                  note="solo feedback con comentario"
                />
              </>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="glass-panel rounded-2xl p-4 md:p-5"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-boreas-cream">Taps en el tiempo</h2>
                <div className="flex items-center gap-1 rounded-lg border border-boreas-cream/10 bg-boreas-surface p-0.5">
                  {(["daily", "weekly"] as const).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBucket(b)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                        bucket === b
                          ? "bg-boreas-brick text-white"
                          : "text-boreas-cream/50 hover:bg-boreas-cream/5 hover:text-boreas-cream/80"
                      }`}
                    >
                      {b === "daily" ? "Diario" : "Semanal"}
                    </button>
                  ))}
                </div>
              </div>

              {loading || !data ? (
                <div className="skeleton-shimmer h-[220px] rounded-xl" />
              ) : chartData.length === 0 ? (
                <CardEmptyState
                  minHeight={220}
                  icon={<TrendingUp size={18} />}
                  title="Sin actividad reciente"
                  subtitle="Los taps de los últimos 60 días van a aparecer acá apenas alguien toque un chip."
                />
              ) : (
                <TapsAreaChart data={chartData} />
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="glass-panel rounded-2xl p-4 md:p-5"
            >
              <h2 className="mb-3 text-sm font-semibold text-boreas-cream">Taps por cliente</h2>
              {loading || !data ? (
                // Altura aproximada al resultado real (donut + leyenda) para
                // no saltar de layout cuando llegan los datos — antes el
                // skeleton era un rectángulo de 220px pero el contenido real
                // (donut + lista de clientes) mide bastante más.
                <div className="flex flex-col gap-3">
                  <div className="skeleton-shimmer h-[200px] rounded-xl" />
                  <div className="flex flex-col gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="skeleton-shimmer h-3 rounded bg-boreas-cream/10" style={{ width: `${70 - i * 10}%` }} />
                    ))}
                  </div>
                </div>
              ) : donutTotal === 0 ? (
                <CardEmptyState
                  minHeight={260}
                  icon={<PieChart size={18} />}
                  title="Todavía no hay taps"
                  subtitle="La distribución por cliente va a aparecer acá apenas haya actividad."
                />
              ) : (
                <div>
                  {/* relative/absolute acotados a esta caja de 200px exacta —
                      antes envolvían también la leyenda de abajo, así que el
                      overlay se centraba en (200px + leyenda) y "TAPS"
                      terminaba pintado sobre el anillo en vez de en el
                      agujero del donut. */}
                  <div className="relative h-[200px]">
                    <ClientDonutChart data={data.clientDistribution} />
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-xl font-semibold text-boreas-cream">{donutTotal}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-boreas-cream/40">taps</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {data.clientDistribution.map((c, i) => (
                      <div key={c.business_name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="min-w-0 flex-1 truncate text-boreas-cream/70">{c.business_name}</span>
                        <span className="text-boreas-cream/40">{((c.taps / donutTotal) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
            className="glass-panel mt-4 rounded-2xl p-4 md:p-5"
          >
            <h2 className="mb-3 text-sm font-semibold text-boreas-cream">Registro en vivo</h2>
            {loading || !data ? (
              <div className="flex flex-col gap-2">
                <div className="skeleton-shimmer h-10 rounded-lg" />
                <div className="skeleton-shimmer h-10 rounded-lg" />
                <div className="skeleton-shimmer h-10 rounded-lg" />
              </div>
            ) : data.feed.length === 0 ? (
              <CardEmptyState
                minHeight={140}
                icon={<Radio size={18} />}
                title="Sin actividad todavía"
                subtitle="Cada tap y cada feedback van a aparecer acá apenas pasen, en vivo."
              />
            ) : (
              <div className="flex flex-col divide-y divide-boreas-cream/5">
                {data.feed.map((event, i) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 text-sm">
                    {event.type === "feedback" ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-status-negative/10 text-status-negative">
                        <MessageCircleWarning size={13} />
                      </span>
                    ) : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-boreas-mustard/10 text-boreas-mustard">
                        <Nfc size={13} />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-boreas-cream/80">{event.business_name}</span>
                    {event.type === "feedback" ? (
                      <span className="shrink-0 rounded-full bg-status-negative/10 px-2 py-0.5 text-xs text-status-negative">
                        {event.rating}★ feedback negativo
                      </span>
                    ) : (
                      <span className="shrink-0 text-xs text-boreas-cream/35">visita al NFC</span>
                    )}
                    <span className="shrink-0 text-xs text-boreas-cream/35">{timeAgo(event.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}

// useSearchParams exige un límite de Suspense para no romper la generación
// estática de Next (mismo motivo que app/login/page.tsx).
export default function AdminResumenPage() {
  return (
    <Suspense>
      <AdminResumenContent />
    </Suspense>
  );
}
