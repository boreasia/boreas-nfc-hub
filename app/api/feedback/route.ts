import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

interface FeedbackPayload {
  chip_id: string;
  rating: number;
  comment?: string;
  customer_contact?: string | null;
}

export async function POST(request: NextRequest) {
  let body: FeedbackPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { chip_id, rating, comment, customer_contact } = body;

  if (!chip_id || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "chip_id y rating (1-5) son obligatorios." }, { status: 400 });
  }

  // Esta tabla es para captura privada de feedback NEGATIVO (1-3 estrellas,
  // ver comment en schema.sql sobre `feedbacks`) — un rating alto se redirige
  // directo a la reseña pública y nunca debería llegar aquí. El gate en
  // ReviewFunnel.tsx (solo llama a este endpoint si rating < 4) es UX, no
  // seguridad: sin este chequeo, cualquiera podía insertar rating 4-5 llamando
  // al endpoint directo.
  if (rating > 3) {
    return NextResponse.json(
      { error: "Este endpoint solo acepta feedback negativo (rating 1-3)." },
      { status: 400 }
    );
  }

  // 1. Traemos el chip + comercio para saber a quién notificar.
  const { data: chip, error: chipError } = await supabaseAdmin
    .from("chips")
    .select("*, clients(*)")
    .eq("id", chip_id)
    .maybeSingle();

  if (chipError || !chip) {
    return NextResponse.json({ error: "Chip no encontrado." }, { status: 404 });
  }

  // 2. Guardamos el feedback.
  const { data: feedback, error: insertError } = await supabaseAdmin
    .from("feedbacks")
    .insert({
      chip_id,
      rating,
      comment: comment ?? null,
      customer_contact: customer_contact ?? null,
    })
    .select()
    .single();

  if (insertError || !feedback) {
    console.error("[feedback] error insertando:", insertError?.message);
    return NextResponse.json({ error: "No se pudo guardar el feedback." }, { status: 500 });
  }

  // 3. Disparamos el webhook de Make (no bloquea la respuesta al usuario final
  //    si falla; el feedback ya quedó guardado en la base de datos).
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

  if (makeWebhookUrl) {
    const client = chip.clients;
    fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_name: client?.business_name ?? "Comercio sin nombre",
        owner_whatsapp: client?.owner_whatsapp ?? null,
        owner_email: client?.owner_email ?? null,
        chip_code: chip.chip_code,
        rating,
        comment: comment ?? "",
        customer_contact: customer_contact ?? null,
        feedback_id: feedback.id,
        created_at: feedback.created_at,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          await supabaseAdmin.from("feedbacks").update({ notified: true }).eq("id", feedback.id);
        } else {
          console.error("[feedback] Make respondió con status", res.status);
        }
      })
      .catch((err) => console.error("[feedback] error llamando webhook Make:", err));
  } else {
    console.warn("[feedback] MAKE_WEBHOOK_URL no está configurado; no se notificó al comercio.");
  }

  return NextResponse.json({ ok: true, feedback_id: feedback.id });
}
