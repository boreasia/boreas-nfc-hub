import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Dashboard de /admin (Resumen). SOLO datos reales, verificados contra el
// esquema real de producción antes de escribir esto:
//   chips(id, client_id, is_active, activated_at, ...)
//   tap_events(id, chip_id, created_at)      — cada toque/escaneo, sin rating
//   feedbacks(id, chip_id, rating, created_at) — SOLO 1-3 estrellas
//   clients(id, business_name)
//
// Lo que NO se muestra, a propósito, porque no existe ningún registro de
// ello (confirmado en vivo, no es un olvido):
//   - "Reseñas enviadas a Google" (4-5 estrellas): el funnel redirige
//     directo, no queda ninguna fila en ninguna tabla. Si en el futuro se
//     corre la migración 0004_rating_events.sql esto se vuelve posible.
//   - Un promedio de calificación "real" 1-5: avgRating de acá es el
//     promedio de feedbacks (1-3★ únicamente) — se devuelve con
//     `partial: true` para que el cliente lo rotule con la salvedad, nunca
//     como "promedio" sin aclarar.
const RANGES = { today: 1, "7d": 7, "30d": 30 } as const;
type RangeKey = keyof typeof RANGES;

function isRangeKey(value: string | null): value is RangeKey {
  return value === "today" || value === "7d" || value === "30d";
}

export async function GET(request: NextRequest) {
  const rangeParam = request.nextUrl.searchParams.get("range");
  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "7d";
  const days = RANGES[range];

  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevWindowStart = new Date(windowStart.getTime() - days * 24 * 60 * 60 * 1000);
  const chartWindowStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Antes esto era 4 round-trips secuenciales (tarjetas → gráfica → mapas de
  // cliente → feed en vivo). Son todas consultas independientes entre sí, así
  // que van en UN solo Promise.all — el tiempo total pasa a ser el de la
  // consulta más lenta, no la suma de las 4 tandas.
  //
  // "Top clientes por taps" ya NO trae toda la tabla tap_events para sumar en
  // JS (crecía sin límite): client_summary (vista SQL, migración 0003) ya
  // trae total_taps agregado por Postgres — se pide una sola vez, ordenada.
  const [
    tapsNow,
    tapsPrev,
    feedbacksNow,
    feedbacksPrev,
    activatedNow,
    activatedPrev,
    activeChipsTotal,
    chartTapsRes,
    clientSummaryRes,
    chipsRes,
    clientsRes,
    recentTapsRes,
    recentFeedbacksRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("tap_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", windowStart.toISOString()),
    supabaseAdmin
      .from("tap_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", prevWindowStart.toISOString())
      .lt("created_at", windowStart.toISOString()),
    supabaseAdmin
      .from("feedbacks")
      .select("rating", { count: "exact" })
      .gte("created_at", windowStart.toISOString()),
    supabaseAdmin
      .from("feedbacks")
      .select("rating", { count: "exact" })
      .gte("created_at", prevWindowStart.toISOString())
      .lt("created_at", windowStart.toISOString()),
    supabaseAdmin
      .from("chips")
      .select("id", { count: "exact", head: true })
      .gte("activated_at", windowStart.toISOString()),
    supabaseAdmin
      .from("chips")
      .select("id", { count: "exact", head: true })
      .gte("activated_at", prevWindowStart.toISOString())
      .lt("activated_at", windowStart.toISOString()),
    supabaseAdmin.from("chips").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin
      .from("tap_events")
      .select("created_at")
      .gte("created_at", chartWindowStart.toISOString())
      .order("created_at", { ascending: true }),
    // client_summary no está tipada en Database.Tables (vista SQL) — mismo
    // patrón `as any` que app/api/clients/summary.
    (supabaseAdmin as any)
      .from("client_summary")
      .select("business_name, total_taps")
      .order("total_taps", { ascending: false }),
    supabaseAdmin.from("chips").select("id, client_id"),
    supabaseAdmin.from("clients").select("id, business_name"),
    supabaseAdmin.from("tap_events").select("chip_id, created_at").order("created_at", { ascending: false }).limit(15),
    supabaseAdmin
      .from("feedbacks")
      .select("chip_id, rating, created_at")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const chartTaps = chartTapsRes.data;
  if (chartTapsRes.error) {
    console.error("[stats/dashboard] error cargando serie de taps:", chartTapsRes.error.message);
  }

  const allChips = chipsRes.data;
  const allClients = clientsRes.data;
  const recentTaps = recentTapsRes.data;
  const recentFeedbacks = recentFeedbacksRes.data;

  const feedbackRatingsNow = (feedbacksNow.data ?? []).map((f) => f.rating);
  const avgRatingNow =
    feedbackRatingsNow.length > 0
      ? feedbackRatingsNow.reduce((a, b) => a + b, 0) / feedbackRatingsNow.length
      : null;

  function delta(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? null : 0; // sin base para % — se omite, no se inventa un "+100%"
    return ((current - previous) / previous) * 100;
  }

  const cards = {
    taps: { value: tapsNow.count ?? 0, deltaPct: delta(tapsNow.count ?? 0, tapsPrev.count ?? 0) },
    activeChips: { value: activeChipsTotal.count ?? 0, deltaPct: delta(activatedNow.count ?? 0, activatedPrev.count ?? 0) },
    negativeFeedback: {
      value: feedbacksNow.count ?? 0,
      deltaPct: delta(feedbacksNow.count ?? 0, feedbacksPrev.count ?? 0),
    },
    avgRating: {
      value: avgRatingNow,
      deltaPct: null as number | null, // promedios no se restan en %, solo se muestra el valor
      partial: true, // SIEMPRE true: solo cubre 1-3★, ver comentario de archivo
    },
  };

  // --- Top clientes por taps: directo de client_summary (ya agregado por
  // Postgres), nada que sumar en JS. ---
  const sortedClients = ((clientSummaryRes.data ?? []) as { business_name: string; total_taps: number }[])
    .filter((c) => c.total_taps > 0)
    .map((c) => ({ business_name: c.business_name, taps: c.total_taps }));

  const topClients = sortedClients.slice(0, 5);
  const othersTotal = sortedClients.slice(5).reduce((sum, c) => sum + c.taps, 0);
  const clientDistribution = othersTotal > 0 ? [...topClients, { business_name: "Otros", taps: othersTotal }] : topClients;

  // --- Registro en vivo: últimos taps (visita genérica, sin calificación —
  // no se puede saber si terminó en reseña a Google o no) + últimos
  // feedbacks negativos interceptados, mezclados por fecha. Para esto sí
  // hace falta el mapeo chip_id→cliente (client_summary ya viene agregado,
  // no sirve para atribuir un evento individual). ---
  const clientNameById = new Map((allClients ?? []).map((c) => [c.id, c.business_name]));
  const clientIdByChipId = new Map((allChips ?? []).map((c) => [c.id, c.client_id]));

  type FeedEvent = { type: "tap" | "feedback"; business_name: string; rating?: number; created_at: string };

  const feed: FeedEvent[] = [
    ...(recentTaps ?? []).map((t) => ({
      type: "tap" as const,
      business_name: clientNameById.get(clientIdByChipId.get(t.chip_id) ?? "") ?? "Comercio sin asignar",
      created_at: t.created_at,
    })),
    ...(recentFeedbacks ?? []).map((f) => ({
      type: "feedback" as const,
      business_name: clientNameById.get(clientIdByChipId.get(f.chip_id) ?? "") ?? "Comercio sin asignar",
      rating: f.rating,
      created_at: f.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  return NextResponse.json({
    range,
    window_start: windowStart.toISOString(),
    cards,
    chart: {
      window_start: chartWindowStart.toISOString(),
      taps: (chartTaps ?? []).map((t) => t.created_at),
    },
    clientDistribution,
    feed,
  });
}
