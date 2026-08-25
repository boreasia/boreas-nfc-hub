import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Respaldo visual del feedback negativo dentro del Hub: hoy solo se notifica
// por webhook a Make.com y no queda nada consultable si ese webhook falla o
// si alguien lo revisa días después.
export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("client_id");

  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("*, chips(chip_code, client_id, clients(business_name))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[feedback/list] error:", error.message);
    return NextResponse.json({ error: "No se pudieron cargar los feedbacks." }, { status: 500 });
  }

  const feedbacks = clientId
    ? (data ?? []).filter((f) => f.chips?.client_id === clientId)
    : data ?? [];

  return NextResponse.json({ feedbacks });
}
