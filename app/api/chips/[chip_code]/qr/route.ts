import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import QRCode from "qrcode";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Los QR se generan en lote en qr-output/<PREFIX>-<timestamp>/<chip_code>.png
// (ver scripts/generate-chips.mjs) — no hay una ruta predecible por chip
// porque cada lote tiene su propio folder timestamped, así que hay que
// recorrer qr-output/ buscando el archivo.
function findExistingQr(chipCode: string): string | null {
  const qrOutputDir = path.resolve("qr-output");
  if (!fs.existsSync(qrOutputDir)) return null;

  for (const batch of fs.readdirSync(qrOutputDir)) {
    const candidate = path.join(qrOutputDir, batch, `${chipCode}.png`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

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

  const existingPath = findExistingQr(chipCode);
  const png = existingPath
    ? fs.readFileSync(existingPath)
    : await QRCode.toBuffer(`${request.nextUrl.origin}/r/${chipCode}`, {
        width: 600,
        margin: 2,
        color: { dark: "#0A1520", light: "#FFFFFF" },
      });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${chipCode}.png"`,
    },
  });
}
