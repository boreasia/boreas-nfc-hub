/**
 * Cliente mínimo de Resend para el reporte quincenal por correo
 * (app/api/cron/biweekly-report). Reemplaza el resumen semanal por WhatsApp
 * (boreas_resumen_semanal) — la alerta inmediata de reseña negativa sigue
 * siendo WhatsApp (lib/whatsapp.ts), esto NO la toca.
 *
 * Se eligió Resend por ser lo más simple de integrar en Next.js/Vercel y
 * tener tier gratuito de sobra para este volumen (quincenal, un correo por
 * comercio activo).
 *
 * Prerrequisito de producción: verificar un dominio propio en Resend y
 * configurar RESEND_FROM_EMAIL con ese dominio. Sin dominio verificado, Resend
 * solo permite enviar desde su remitente de pruebas `onboarding@resend.dev`
 * (bandeja de todos modos entregable, útil para la prueba real inicial) —
 * confirma en tu dashboard de Resend si esa cuenta de pruebas también
 * restringe a QUÉ destinatarios puede llegar antes de asumir que ya funciona
 * para todos los clientes.
 */

import { Resend } from "resend";

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Boreas NFC Hub <onboarding@resend.dev>";

export interface StarCounts {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface NegativeReviewRow {
  rating: number;
  created_at: string;
}

interface SendBiweeklyReportOptions {
  to: string;
  businessName: string;
  windowStart: Date;
  windowEnd: Date;
  total: number;
  average: number;
  starCounts: StarCounts;
  negatives: NegativeReviewRow[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Arma el HTML del reporte. Simple a propósito: texto claro + una tabla,
 * estilos inline (los clientes de correo ignoran <style> con frecuencia), sin
 * librerías de maquetación de email.
 */
function renderReportHtml(opts: SendBiweeklyReportOptions): string {
  const { businessName, windowStart, windowEnd, total, average, starCounts, negatives } = opts;

  const starRows = ([5, 4, 3, 2, 1] as const)
    .map(
      (star) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${star} ⭐</td>
          <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;text-align:right;">${starCounts[star]}</td>
        </tr>`
    )
    .join("");

  const negativesHtml =
    negatives.length === 0
      ? `<p style="color:#555;">No hubo reseñas de 1-2 estrellas en este periodo. ✅</p>`
      : `
        <table style="width:100%;border-collapse:collapse;margin-top:8px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #999;">Fecha</th>
              <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #999;">Calificación</th>
            </tr>
          </thead>
          <tbody>
            ${negatives
              .map(
                (n) => `
              <tr>
                <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${formatDateTime(n.created_at)}</td>
                <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">${n.rating} ⭐</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#7B4FBF;margin-bottom:4px;">
      Boreas NFC Hub · Reporte quincenal
    </p>
    <h1 style="font-size:20px;margin:0 0 4px;">${escapeHtml(businessName)}</h1>
    <p style="color:#555;margin:0 0 20px;">
      Periodo: ${formatDate(windowStart)} — ${formatDate(windowEnd)}
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">Total de reseñas</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:bold;">${total}</td>
      </tr>
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">Calificación promedio</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:bold;">${average.toFixed(1)} / 5</td>
      </tr>
    </table>

    <h2 style="font-size:15px;margin:0 0 8px;">Desglose por estrella</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      ${starRows}
    </table>

    <h2 style="font-size:15px;margin:0 0 8px;">Reseñas negativas (1-2 estrellas) del periodo</h2>
    ${negativesHtml}

    <p style="color:#999;font-size:11px;margin-top:28px;">
      Reporte automático generado por Boreas NFC Hub. La alerta inmediata de reseña
      negativa por WhatsApp sigue funcionando igual — esto es solo el resumen del
      periodo.
    </p>
  </div>`;
}

/**
 * Envía el reporte quincenal por correo. Nunca lanza: devuelve `{ ok, error }`
 * para que el cron pueda seguir con el siguiente cliente sin caerse (mismo
 * patrón que sendWhatsAppTemplate en lib/whatsapp.ts).
 */
export async function sendBiweeklyReportEmail(
  opts: SendBiweeklyReportOptions
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY no configurado; no se envió el reporte.");
    return { ok: false, error: "resend_not_configured" };
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: `Boreas · Reporte quincenal de ${opts.businessName}`,
      html: renderReportHtml(opts),
    });

    if (error) {
      console.error("[email] Resend respondió con error:", error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] error llamando a Resend:", err);
    return { ok: false, error: "network_error" };
  }
}

// ---------------------------------------------------------------------------
// Alerta puntual por correo — una reseña de 1-2 estrellas (app/api/feedback).
// Mismo umbral y mismo momento que la alerta de WhatsApp (lib/whatsapp.ts);
// se envían en paralelo, ninguna reemplaza a la otra. Reusa RESEND_API_KEY /
// RESEND_FROM_EMAIL, ya configurados para el reporte quincenal arriba — no
// agrega envs nuevas.
// ---------------------------------------------------------------------------

interface SendNegativeReviewAlertOptions {
  to: string;
  businessName: string;
  rating: number;
  comment: string | null;
  customerContact: string | null;
  chipCode: string;
}

function renderNegativeAlertHtml(opts: SendNegativeReviewAlertOptions): string {
  const { businessName, rating, comment, customerContact, chipCode } = opts;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
    <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#7B4FBF;margin-bottom:4px;">
      Boreas NFC Hub · Alerta de reseña
    </p>
    <h1 style="font-size:20px;margin:0 0 4px;">${escapeHtml(businessName)}</h1>
    <p style="margin:0 0 20px;">
      Nueva calificación: <strong>${rating} ⭐</strong> (chip ${escapeHtml(chipCode)})
    </p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;vertical-align:top;width:120px;">Comentario</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">
          ${comment ? escapeHtml(comment) : "<em>(sin comentario)</em>"}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">Contacto del cliente</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e5e5e5;">
          ${customerContact ? escapeHtml(customerContact) : "<em>no dejó contacto</em>"}
        </td>
      </tr>
    </table>

    <p style="color:#999;font-size:11px;margin-top:28px;">
      Alerta automática generada por Boreas NFC Hub. También recibiste esta alerta por
      WhatsApp; el reporte quincenal por correo trae el acumulado del periodo.
    </p>
  </div>`;
}

/**
 * Envía la alerta puntual de reseña negativa. Nunca lanza: devuelve
 * `{ ok, error }` (mismo patrón que sendBiweeklyReportEmail / sendWhatsAppTemplate).
 */
export async function sendNegativeReviewAlertEmail(
  opts: SendNegativeReviewAlertOptions
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY no configurado; no se envió la alerta.");
    return { ok: false, error: "resend_not_configured" };
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: `⚠️ Reseña de ${opts.rating} estrella${opts.rating === 1 ? "" : "s"} en ${opts.businessName}`,
      html: renderNegativeAlertHtml(opts),
    });

    if (error) {
      console.error("[email] Resend respondió con error:", error.message);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] error llamando a Resend:", err);
    return { ok: false, error: "network_error" };
  }
}
