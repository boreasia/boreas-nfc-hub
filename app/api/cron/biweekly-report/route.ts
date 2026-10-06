import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendBiweeklyReportEmail, type StarCounts, type NegativeReviewRow } from "@/lib/email";

export const dynamic = "force-dynamic";

// Reemplaza el resumen semanal por WhatsApp (boreas_resumen_semanal,
// app/api/cron/weekly-summary — eliminado). La alerta inmediata de reseña
// negativa (rating <= 2) sigue siendo WhatsApp, vía app/api/feedback; esta
// ruta NO la toca.
//
// Lee de `feedbacks`, NO de `review_events`: esa tabla nunca se creó en
// producción (el intento, migración 0002, nunca se corrió — confirmado
// contra la base real). Como `feedbacks` solo guarda reseñas de 1-3
// estrellas (las de 4-5 van directo a Google sin quedar registradas), este
// reporte también refleja solo esas, igual que client_summary/overview_stats
// (migración 0003).
//
// Cadencia (ver vercel.json): día 1 y 16 de cada mes, 9am Bogotá
// (0 14 1,16 * * en UTC) — se acerca a "cada 15 días" con fecha fija en vez de
// contar 15 días exactos desde el último envío, que con cron estándar no es
// confiable.
//
// Autenticación: igual que el cron anterior — Vercel manda
// `Authorization: Bearer <CRON_SECRET>` automáticamente. No está en el
// matcher de middleware.ts (usa este secreto propio, no el Basic Auth de
// /admin). Se puede disparar a mano con el mismo bearer para probar sin
// esperar al día 1/16.

interface ClientBucket {
  business_name: string;
  owner_email: string | null;
  total: number;
  sum: number;
  star_counts: StarCounts;
  negatives: NegativeReviewRow[];
}

const WINDOW_DAYS = 15;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const windowEnd = new Date();
  const windowStart = new Date(windowEnd.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("rating, created_at, chips(client_id, clients(business_name, owner_email))")
    .gte("created_at", windowStart.toISOString());

  if (error) {
    console.error("[cron/biweekly-report] error consultando feedbacks:", error.message);
    return NextResponse.json({ error: "No se pudieron cargar las reseñas." }, { status: 500 });
  }

  // Mismo enfoque de agrupar en JS que el cron anterior (weekly-summary): el
  // volumen quincenal sigue siendo de decenas/cientos de filas, no justifica
  // una vista SQL aparte.
  const buckets = new Map<string, ClientBucket>();

  type EmbeddedChip = {
    client_id: string | null;
    clients: { business_name: string; owner_email: string | null } | null;
  } | null;

  for (const row of data ?? []) {
    // PostgREST resuelve la relación many-to-one feedbacks→chips como objeto.
    const chip = (row.chips as unknown) as EmbeddedChip;
    const clientId = chip?.client_id;
    if (!clientId || !chip?.clients) continue;

    let bucket = buckets.get(clientId);
    if (!bucket) {
      bucket = {
        business_name: chip.clients.business_name,
        owner_email: chip.clients.owner_email,
        total: 0,
        sum: 0,
        star_counts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        negatives: [],
      };
      buckets.set(clientId, bucket);
    }

    const rating = row.rating as 1 | 2 | 3 | 4 | 5;
    bucket.total += 1;
    bucket.sum += rating;
    bucket.star_counts[rating] += 1;
    if (rating <= 2) {
      bucket.negatives.push({ rating, created_at: row.created_at });
    }
  }

  let sent = 0;
  const skippedNoEmail: string[] = [];
  const errors: Array<{ client_id: string; business_name: string; error: string }> = [];
  const summary: Array<{
    client_id: string;
    business_name: string;
    total: number;
    average: number;
    star_counts: StarCounts;
    negatives: number;
  }> = [];

  for (const [clientId, bucket] of buckets) {
    const average = bucket.sum / bucket.total;
    summary.push({
      client_id: clientId,
      business_name: bucket.business_name,
      total: bucket.total,
      average: Number(average.toFixed(2)),
      star_counts: bucket.star_counts,
      negatives: bucket.negatives.length,
    });

    if (!bucket.owner_email) {
      // Dato nuevo (owner_email) que muchos comercios todavía no tienen
      // cargado — no debe tumbar el cron, solo quedar loggeado para saber a
      // quién pedírselo.
      console.warn(
        `[cron/biweekly-report] "${bucket.business_name}" (${clientId}) no tiene owner_email; se saltó.`
      );
      skippedNoEmail.push(bucket.business_name);
      continue;
    }

    // Ordenamos las negativas más recientes primero para el correo.
    const negativesSorted = [...bucket.negatives].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const result = await sendBiweeklyReportEmail({
      to: bucket.owner_email,
      businessName: bucket.business_name,
      windowStart,
      windowEnd,
      total: bucket.total,
      average,
      starCounts: bucket.star_counts,
      negatives: negativesSorted,
    });

    if (result.ok) {
      sent += 1;
    } else {
      errors.push({ client_id: clientId, business_name: bucket.business_name, error: result.error ?? "unknown" });
    }
  }

  return NextResponse.json({
    ok: true,
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    clients_with_activity: buckets.size,
    sent,
    skipped_no_email: skippedNoEmail,
    errors,
    summary,
  });
}
