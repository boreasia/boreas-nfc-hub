import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase";

// Antes el logo del comercio se pegaba como URL a mano — imposible de usar
// bien desde el celular en la visita (no hay forma cómoda de "copiar el link"
// de una foto que acabas de tomar). Esta ruta recibe el archivo directo
// (multipart/form-data) y lo sube al bucket público "logos" de Supabase
// Storage, devolviendo la URL pública para guardar en clients.logo_url.
export const dynamic = "force-dynamic";

const BUCKET = "logos";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, mismo límite configurado en el bucket
const ALLOWED_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa PNG, JPG o WEBP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen pesa más de 5MB." }, { status: 400 });
  }

  const path = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: `No se pudo subir la imagen: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ url: data.publicUrl });
}
