/**
 * lib/qr-image.mjs
 *
 * Fuente única de verdad para generar el PNG de un chip: el código QR con el
 * número del chip impreso como texto centrado debajo, todo en una sola imagen.
 *
 * Lo usan tanto el script de generación en lote (scripts/generate-chips.mjs,
 * que guarda el buffer a disco) como la ruta de API en producción
 * (app/api/chips/[chip_code]/qr/route.ts, que lo sirve como response). Antes
 * cada uno tenía su propia copia y los colores estaban desincronizados.
 *
 * Es .mjs (no .ts) a propósito: el script corre con `node` a secas, sin loader
 * de TypeScript, así que no podría importar un módulo .ts. Los tipos van por
 * JSDoc.
 *
 * `qrcode` no sabe dibujar texto, así que componemos con sharp: renderizamos el
 * QR a buffer, lo pegamos sobre un lienzo blanco un poco más alto y
 * superponemos un SVG con el número.
 */

import QRCode from "qrcode";
import sharp from "sharp";

const QR_SIZE = 600;

// Color oscuro de la paleta de marca definitiva: boreas.navy-deep en
// tailwind.config.ts. Unifica el #0D0D12 que usaba el script y el #0A1520 del
// fallback de la ruta.
const QR_DARK = "#0A1520";
const QR_LIGHT = "#FFFFFF";

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

  const fontSize = Math.round(QR_SIZE * 0.12); // ~12% de la altura del QR
  const labelBand = Math.round(fontSize * 1.6); // aire arriba y abajo del texto
  const totalHeight = QR_SIZE + labelBand;
  const baseline = QR_SIZE + Math.round(labelBand / 2 + fontSize * 0.35);

  const textSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${QR_SIZE}" height="${totalHeight}">
      <text x="${QR_SIZE / 2}" y="${baseline}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" letter-spacing="2" fill="${QR_DARK}">${label}</text>
    </svg>`
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
      { input: textSvg, top: 0, left: 0 },
    ])
    .png()
    .toBuffer();
}
