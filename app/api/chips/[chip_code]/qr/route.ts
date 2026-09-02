import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { renderChipQr } from "@/lib/qr-image.mjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteParams {
  params: { chip_code: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const chipCode = params.chip_code;

  const { data: chip, error } = await supabaseAdmin
    .from("chips")
    .select("chip_code")
    .eq("chip_code", chipCode)
    .maybeSingle();

  if (error || !chip) {
    return NextResponse.json({ error: "Chip no encontrado." }, { status: 404 });
  }

  // Antes esto buscaba un PNG pre-generado en qr-output/ y solo caía a generar
  // uno si no lo encontraba. Pero qr-output/ está en .gitignore y el filesystem
  // de Vercel es efímero, así que en producción esa carpeta siempre estaba
  // vacía y se servía el fallback sin número. Ahora generamos siempre con la
  // misma función que usa el script de lotes (lib/qr-image.mjs).
  const png = await renderChipQr(chip.chip_code, `${request.nextUrl.origin}/r/${chip.chip_code}`);

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${chip.chip_code}.png"`,
      // El QR de un chip_code no cambia nunca: cachearlo agresivamente evita
      // regenerarlo con sharp en cada descarga / render de la hoja de impresión.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
