import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Evita que Next.js cachee el fetch interno de supabase-js: esta ruta debe
// reflejar siempre el estado actual de la base, no una respuesta memorizada
// de la primera vez que se llamó (App Router cachea fetch() por defecto).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // chip_metrics es una vista SQL (ver schema.sql) que no está tipada en
  // Database.Tables; se consulta igual, solo sin autocompletado estricto.
  const { data, error } = await (supabaseAdmin as any)
    .from("chip_metrics")
    .select("*")
    .order("total_taps", { ascending: false });

  if (error) {
    console.error("[chips/metrics] error:", error.message);
    return NextResponse.json({ error: "No se pudieron cargar las métricas." }, { status: 500 });
  }

  return NextResponse.json({ metrics: data });
}
