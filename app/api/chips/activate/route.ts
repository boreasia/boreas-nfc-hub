import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { ChipMode } from "@/types/database";

interface ActivatePayload {
  chip_id: string;
  chip_code?: string;
  mode: ChipMode;
  destination_url?: string | null;
  client:
    | { id: string }
    | { business_name: string; owner_whatsapp: string; logo_url?: string | null };
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
  let clientId: string;

  if ("id" in client) {
    clientId = client.id;
  } else {
    if (!client.business_name?.trim() || !client.owner_whatsapp?.trim()) {
      return NextResponse.json(
        { error: "business_name y owner_whatsapp son obligatorios para un comercio nuevo." },
        { status: 400 }
      );
    }

    const { data: newClient, error: clientError } = await supabaseAdmin
      .from("clients")
      .insert({
        business_name: client.business_name.trim(),
        owner_whatsapp: client.owner_whatsapp.trim(),
        logo_url: client.logo_url ?? null,
      })
      .select()
      .single();

    if (clientError || !newClient) {
      console.error("[chips/activate] error creando cliente:", clientError?.message);
      return NextResponse.json({ error: "No se pudo crear el comercio." }, { status: 500 });
    }

    clientId = newClient.id;
  }

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
