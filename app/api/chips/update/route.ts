import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveClientId } from "@/lib/resolveClient";
import type { ChipMode } from "@/types/database";

interface UpdatePayload {
  chip_id: string;
  mode: ChipMode;
  destination_url?: string | null;
  client:
    | { id: string }
    | { business_name: string; owner_whatsapp: string; logo_url?: string | null };
}

const VALID_MODES: ChipMode[] = ["review_funnel", "instagram", "pdf_menu", "interactive_menu"];

// Edita un chip que YA está activo: reasignar comercio, cambiar mode y/o
// destination_url. A diferencia de /api/chips/activate, esto no toca
// is_active ni activated_at — esos solo se fijan la primera vez que el chip
// se instala. Para chips todavía inactivos, usa /api/chips/activate.
export async function POST(request: NextRequest) {
  let body: UpdatePayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { chip_id, mode, destination_url, client } = body;

  if (!chip_id) {
    return NextResponse.json({ error: "chip_id es obligatorio." }, { status: 400 });
  }
  if (!mode || !VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: "mode inválido." }, { status: 400 });
  }
  if (!client) {
    return NextResponse.json({ error: "Se requiere información del comercio." }, { status: 400 });
  }
  if ((mode === "instagram" || mode === "pdf_menu") && !destination_url) {
    return NextResponse.json(
      { error: "destination_url es obligatorio para este modo." },
      { status: 400 }
    );
  }

  const { data: existingChip, error: fetchError } = await supabaseAdmin
    .from("chips")
    .select("id, is_active")
    .eq("id", chip_id)
    .maybeSingle();

  if (fetchError || !existingChip) {
    return NextResponse.json({ error: "Chip no encontrado." }, { status: 404 });
  }
  if (!existingChip.is_active) {
    return NextResponse.json(
      { error: "Este chip aún no está activo. Usa la activación inicial en vez de editar." },
      { status: 400 }
    );
  }

  const resolved = await resolveClientId(client);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const clientId = resolved.clientId;

  const { data: updatedChip, error: chipError } = await supabaseAdmin
    .from("chips")
    .update({
      client_id: clientId,
      mode,
      destination_url: destination_url ?? null,
    })
    .eq("id", chip_id)
    .select()
    .single();

  if (chipError || !updatedChip) {
    console.error("[chips/update] error actualizando chip:", chipError?.message);
    return NextResponse.json({ error: "No se pudo actualizar el chip." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, chip: updatedChip });
}
