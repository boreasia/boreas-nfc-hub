/**
 * scripts/generate-digit-paths.mjs
 *
 * Script de una sola vez (NO es parte del build). Lee assets/fonts/Inter-Bold.ttf
 * y extrae el contorno vectorial (path SVG) de cada dígito 0-9, luego escribe
 * lib/digit-paths.mjs con esos paths ya "horneados".
 *
 * Por qué: en el runtime serverless de Vercel, librsvg/Pango no logra descubrir
 * fuentes vía fontconfig ni siquiera con @font-face + data URI, así que el
 * número del chip salía como □□□. Si en el SVG no hay <text> —solo <path> con
 * formas fijas— no hay nada que resolver: se dibuja igual en cualquier lado.
 *
 * Regenerar (solo si se cambia la fuente o FONT_SIZE):
 *   node scripts/generate-digit-paths.mjs
 *
 * Requiere: npm install --save-dev opentype.js
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

// Debe coincidir con el fontSize que usa lib/qr-image.mjs
// (Math.round(QR_SIZE * 0.12) con QR_SIZE = 600).
const FONT_SIZE = 72;
const PRECISION = 2;

const here = path.dirname(fileURLToPath(import.meta.url));
const fontPath = path.resolve(here, "..", "assets/fonts/Inter-Bold.ttf");
const outPath = path.resolve(here, "..", "lib/digit-paths.mjs");

const fontBuffer = fs.readFileSync(fontPath);
// opentype.parse necesita un ArrayBuffer, no un Buffer de Node.
const font = opentype.parse(
  fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength)
);

const digits = {};
let top = Infinity;
let bottom = -Infinity;

for (let d = 0; d <= 9; d += 1) {
  const ch = String(d);
  const glyph = font.charToGlyph(ch);
  // getPath(x, y, fontSize): y es la baseline, coords en espacio de pantalla
  // (y crece hacia abajo). Dígitos no tienen descendente => bottom ~= 0.
  const glyphPath = glyph.getPath(0, 0, FONT_SIZE);
  const bbox = glyphPath.getBoundingBox();
  const advance = (glyph.advanceWidth / font.unitsPerEm) * FONT_SIZE;

  digits[ch] = {
    d: glyphPath.toPathData(PRECISION),
    advance: Number(advance.toFixed(PRECISION)),
  };

  top = Math.min(top, bbox.y1);
  bottom = Math.max(bottom, bbox.y2);
}

const metrics = {
  fontSize: FONT_SIZE,
  // Caja vertical común a los 10 dígitos, relativa a la baseline (top < 0).
  top: Number(top.toFixed(PRECISION)),
  bottom: Number(bottom.toFixed(PRECISION)),
};

const banner = `/**
 * lib/digit-paths.mjs — GENERADO por scripts/generate-digit-paths.mjs. NO EDITAR A MANO.
 *
 * Contornos vectoriales de los dígitos 0-9 de Inter Bold a ${FONT_SIZE}px, en
 * coordenadas SVG con la baseline en y=0. Los usa lib/qr-image.mjs para dibujar
 * el número del chip como <path> fijos, sin <text> ni fuentes en runtime.
 *
 * Regenerar: node scripts/generate-digit-paths.mjs
 */`;

const body = `${banner}

export const DIGIT_METRICS = ${JSON.stringify(metrics, null, 2)};

export const DIGIT_PATHS = ${JSON.stringify(digits, null, 2)};
`;

fs.writeFileSync(outPath, body);

console.log(`✅ ${path.relative(process.cwd(), outPath)} escrito.`);
console.log(`   fontSize=${FONT_SIZE}  top=${metrics.top}  bottom=${metrics.bottom}`);
console.log(`   advances: ${Object.entries(digits).map(([k, v]) => `${k}:${v.advance}`).join("  ")}`);
