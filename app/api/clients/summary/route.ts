import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Evita que Next.js cachee el fetch interno de supabase-js: esta ruta debe
// reflejar siempre el estado actual de la base (ver app/api/chips/metrics/route.ts).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  // client_summary es una vista SQL (ver schema.sql) que no está tipada en
  // Database.Tables; se consulta igual, solo sin autocompletado estricto.
  const { data, error } = await (supabaseAdmin as any)
    .from("client_summary")
    .select("*")
    .order("business_name", { ascending: true });

  if (error) {
    console.error("[clients/summary] error:", error.message);
    return NextResponse.json({ error: "No se pudieron cargar los comercios." }, { status: 500 });
  }

  return NextResponse.json({ clients: data });
}
