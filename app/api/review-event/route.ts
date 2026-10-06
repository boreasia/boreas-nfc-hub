import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface ReviewEventPayload {
  chip_id: string;
  rating: number;
}

// Registro del historial COMPLETO de calificaciones. Lo llama ReviewFunnel.tsx
// en cada click de estrella (1-5), antes de ramificar a Google (4-5) o al
// formulario privado (1-3). Ruta pública, igual que /api/feedback: la llama el
// cliente final desde /r/[chip_code], no pasa por el middleware de /admin.
//
// El detalle privado de las negativas (comentario, contacto) sigue viviendo en
// `feedbacks` vía /api/feedback; esta tabla es solo el evento de calificación.
export async function POST(request: NextRequest) {
  let body: ReviewEventPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { chip_id, rating } = body;

  if (!chip_id || typeof rating !== "number" || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "chip_id y rating (1-5) son obligatorios." },
      { status: 400 }
    );
  }

  const { data: chip, error: chipError } = await supabaseAdmin
    .from("chips")
    .select("id")
    .eq("id", chip_id)
    .maybeSingle();

  if (chipError || !chip) {
    return NextResponse.json({ error: "Chip no encontrado." }, { status: 404 });
  }

  const { error: insertError } = await supabaseAdmin
    .from("review_events")
    .insert({ chip_id, rating: Math.round(rating), source: "funnel" });

  if (insertError) {
    console.error("[review-event] error insertando:", insertError.message);
    return NextResponse.json({ error: "No se pudo registrar el evento." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
