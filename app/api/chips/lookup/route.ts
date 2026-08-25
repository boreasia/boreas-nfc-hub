import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const chipCode = request.nextUrl.searchParams.get("chip_code")?.trim();

  if (!chipCode) {
    return NextResponse.json({ error: "chip_code es obligatorio." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("chips")
    .select("*, clients(*)")
    .eq("chip_code", chipCode)
    .maybeSingle();

  if (error) {
    console.error("[chips/lookup] error:", error.message);
    return NextResponse.json({ error: "Error consultando el chip." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Chip no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ chip: data });
}
