import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveClientId, type ClientRef } from "@/lib/resolveClient";
import type { ChipMode } from "@/types/database";

interface ActivatePayload {
  chip_id: string;
  chip_code?: string;
  mode: ChipMode;
  destination_url?: string | null;
  client: ClientRef;
}

const VALID_MODES: ChipMode[] = ["review_funnel", "instagram", "pdf_menu", "interactive_menu"];

export async function POST(request: NextRequest) {
  let body: ActivatePayload;

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

  // 1. Resolver el client_id: o usamos uno existente, o creamos uno nuevo.
  const resolved = await resolveClientId(client);
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const clientId = resolved.clientId;

  // 2. Activar el chip: vincular client_id, mode, destination_url, is_active=true.
  const { data: updatedChip, error: chipError } = await supabaseAdmin
    .from("chips")
    .update({
      client_id: clientId,
      mode,
      destination_url: destination_url ?? null,
      is_active: true,
      activated_at: new Date().toISOString(),
    })
    .eq("id", chip_id)
    .select()
    .single();

  if (chipError || !updatedChip) {
    console.error("[chips/activate] error activando chip:", chipError?.message);
    return NextResponse.json({ error: "No se pudo activar el chip." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, chip: updatedChip });
}
