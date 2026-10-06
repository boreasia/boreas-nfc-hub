import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Evita que Next.js cachee el fetch interno de supabase-js (mismo motivo que
// api/chips/metrics y api/clients/summary).
export const dynamic = "force-dynamic";
export const revalidate = 0;

// overview_stats es una vista SQL de una sola fila (ver schema.sql / migración
// 0003_email_required_stats.sql) que no está tipada en Database.Tables; se
// consulta igual, solo sin autocompletado estricto (mismo patrón que
// chip_metrics/client_summary en las rutas vecinas).
export async function GET() {
  const { data, error } = await (supabaseAdmin as any)
    .from("overview_stats")
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[stats/overview] error:", error.message);
    return NextResponse.json({ error: "No se pudieron cargar las estadísticas." }, { status: 500 });
  }

  // Sin filas en ninguna tabla (instalación nueva), overview_stats igual
  // devuelve una fila con los count/avg en 0/null por cómo está armada la
  // vista (subselects escalares, no agregados sobre un join vacío).
  return NextResponse.json({ stats: data });
}
