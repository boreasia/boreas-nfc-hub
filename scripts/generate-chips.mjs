/**
 * scripts/generate-chips.mjs
 *
 * Resuelve el cuello de botella de "programar el QR en el momento":
 * genera un lote de chip_codes ANTES de salir a visitar comercios en frío,
 * los inserta en Supabase con is_active=false, y produce un PNG de QR por
 * cada uno apuntando a https://TU_DOMINIO/r/CHIP-CODE.
 *
 * En la visita, imprimes/pegas la tarjeta física con ese QR o programas el
 * NFC con la misma URL, y activas todo en segundos con /r/[chip_code]
 * (Instalador Express) sin volver a tocar código ni la base de datos.
 *
 * Uso:
 *   node scripts/generate-chips.mjs --count 50 --prefix BOREAS --domain https://boreas-nfc-hub.vercel.app
 *
 * Requiere en el entorno (.env o variables exportadas):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Dependencias:
 *   npm install @supabase/supabase-js qrcode sharp
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { renderChipQr } from "../lib/qr-image.mjs";

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { count: 20, prefix: "BOREAS", domain: "" };

  for (let i = 0; i < args.length; i += 1) {
    const [flag, value] = [args[i], args[i + 1]];
    if (flag === "--count") parsed.count = parseInt(value, 10);
    if (flag === "--prefix") parsed.prefix = value;
    if (flag === "--domain") parsed.domain = value?.replace(/\/$/, "");
  }

  return parsed;
}

async function main() {
  const { count, prefix, domain } = parseArgs();

  if (!domain) {
    console.error("❌ Falta --domain. Ejemplo: --domain https://boreas-nfc-hub.vercel.app");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("❌ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // 1. Determinar el siguiente número disponible para no chocar con lotes previos.
  const { data: existing, error: existingError } = await supabase
    .from("chips")
    .select("chip_code")
    .like("chip_code", `${prefix}-%`);

  if (existingError) {
    console.error("❌ Error consultando chips existentes:", existingError.message);
    process.exit(1);
  }

  const usedNumbers = (existing ?? [])
    .map((row) => parseInt(row.chip_code.replace(`${prefix}-`, ""), 10))
    .filter((n) => !Number.isNaN(n));

  const nextNumber = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

  // 2. Construir el lote nuevo.
  const newChips = Array.from({ length: count }, (_, i) => {
    const number = nextNumber + i;
    const chip_code = `${prefix}-${String(number).padStart(3, "0")}`;
    return { chip_code, mode: "review_funnel", is_active: false };
  });

  console.log(`→ Generando ${count} chips: ${newChips[0].chip_code} … ${newChips[newChips.length - 1].chip_code}`);

  const { data: inserted, error: insertError } = await supabase
    .from("chips")
    .insert(newChips)
    .select();

  if (insertError) {
    console.error("❌ Error insertando chips en Supabase:", insertError.message);
    process.exit(1);
  }

  // 3. Generar un PNG de QR por cada chip, listo para imprimir.
  const outDir = path.resolve("qr-output", `${prefix}-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  for (const chip of inserted) {
    const url = `${domain}/r/${chip.chip_code}`;
    const filePath = path.join(outDir, `${chip.chip_code}.png`);
    const png = await renderChipQr(chip.chip_code, url);
    fs.writeFileSync(filePath, png);
  }

  console.log(`✅ Listo. ${inserted.length} chips creados en Supabase (is_active=false).`);
  console.log(`✅ QRs guardados en: ${outDir}`);
  console.log("→ Imprímelos, pégalos en las tarjetas/exhibidores, y llévalos a tus visitas.");
  console.log("→ Al activarlos desde el Instalador Express, quedan vinculados al comercio en segundos.");
}

main();
