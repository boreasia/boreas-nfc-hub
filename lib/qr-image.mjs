/**
 * lib/qr-image.mjs
 *
 * Fuente única de verdad para generar el PNG de un chip: el código QR con el
 * número del chip impreso como texto centrado debajo, todo en una sola imagen.
 *
 * Lo usan tanto el script de generación en lote (scripts/generate-chips.mjs,
 * que guarda el buffer a disco) como la ruta de API en producción
 * (app/api/chips/[chip_code]/qr/route.ts, que lo sirve como response).
 *
 * Es .mjs (no .ts) a propósito: el script corre con `node` a secas, sin loader
 * de TypeScript, así que no podría importar un módulo .ts. Los tipos van por
 * JSDoc.
 *
 * NÚMERO COMO VECTOR, NO COMO TEXTO: el runtime Linux serverless de Vercel no
 * logra descubrir fuentes (ni con @font-face + data URI: librsvg usa Pango, que
 * depende de fontconfig para encontrar CUALQUIER fuente, y ahí no está
 * configurado). Resultado: el <text> salía como □□□. La solución definitiva es
 * no renderizar texto: los dígitos 0-9 de Inter Bold están pre-convertidos a
 * paths SVG en lib/digit-paths.mjs (ver scripts/generate-digit-paths.mjs), y
 * acá se compone el número dibujando un <path> por dígito. El SVG resultante no
 * tiene <text> ni font-family: son solo formas fijas que librsvg dibuja igual
 * en cualquier entorno.
 */

import QRCode from "qrcode";
import sharp from "sharp";
import { DIGIT_METRICS, DIGIT_PATHS } from "./digit-paths.mjs";

const QR_SIZE = 600;

// Color oscuro de la paleta de marca definitiva: boreas.navy-deep en
// tailwind.config.ts.
const QR_DARK = "#0A1520";
const QR_LIGHT = "#FFFFFF";

// Espacio extra entre dígitos, además del avance natural del glifo.
const TRACKING = 2;

/**
 * Construye el markup SVG del número (uno o más <path>, ya posicionados) para
 * incrustar en el lienzo, centrado en una banda de `bandHeight` px que empieza
 * en y=`bandTop`.
 *
 * @param {string} label   solo dígitos, ej. "007"
 * @param {number} bandTop  y donde empieza la banda del texto
 * @param {number} bandHeight  alto de la banda
 * @returns {string} fragmento de <path> ... </path>
 */
function renderNumberPaths(label, bandTop, bandHeight) {
  const chars = [...label].filter((c) => DIGIT_PATHS[c]);

  const totalWidth =
    chars.reduce((sum, c) => sum + DIGIT_PATHS[c].advance, 0) +
    TRACKING * Math.max(0, chars.length - 1);

  // Los paths de digit-paths.mjs tienen la baseline en y=0 y el cuerpo del
  // dígito entre `top` (negativo, arriba) y `bottom` (~0). Centramos esa caja
  // vertical en el centro de la banda.
  const glyphMidY = (DIGIT_METRICS.top + DIGIT_METRICS.bottom) / 2;
  const baselineY = bandTop + bandHeight / 2 - glyphMidY;

  let cursorX = (QR_SIZE - totalWidth) / 2;
  const parts = [];
  for (const c of chars) {
    const { d, advance } = DIGIT_PATHS[c];
    parts.push(
      `<path d="${d}" transform="translate(${cursorX.toFixed(2)} ${baselineY.toFixed(2)})" fill="${QR_DARK}"/>`
    );
    cursorX += advance + TRACKING;
  }
  return parts.join("");
}

/**
 * Genera el PNG final de un chip (QR + número superpuesto) y lo devuelve como
 * Buffer. Quien llama decide si lo guarda a disco o lo sirve como response.
 *
 * @param {string} chipCode  ej. "BOREAS-002"
 * @param {string} url       destino que codifica el QR, ej. "https://…/r/BOREAS-002"
 * @returns {Promise<Buffer>} PNG con el QR arriba y el número centrado debajo
 */
export async function renderChipQr(chipCode, url) {
  const qrBuffer = await QRCode.toBuffer(url, {
    width: QR_SIZE,
    margin: 2,
    color: { dark: QR_DARK, light: QR_LIGHT },
  });

  // Solo el número, sin el prefijo "BOREAS-".
  const label = chipCode.replace(/^.*?-/, "");

  const fontSize = DIGIT_METRICS.fontSize; // 72 — coincide con la escala de los paths
  const labelBand = Math.round(fontSize * 1.6); // aire arriba y abajo del texto
  const totalHeight = QR_SIZE + labelBand;

  const numberPaths = renderNumberPaths(label, QR_SIZE, labelBand);

  const overlaySvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIZE}" height="${totalHeight}">${numberPaths}</svg>`
  );

  return sharp({
    create: {
      width: QR_SIZE,
      height: totalHeight,
      channels: 4,
      background: QR_LIGHT,
    },
  })
    .composite([
      { input: qrBuffer, top: 0, left: 0 },
      { input: overlaySvg, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}
