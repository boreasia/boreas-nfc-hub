/**
 * Cliente mínimo de la WhatsApp Cloud API de Meta (sin intermediario tipo
 * Twilio/Make). Se usa desde el servidor:
 *   - app/api/feedback/route.ts       → alerta inmediata de reseña 1-2 estrellas
 *   - app/api/cron/weekly-summary/... → resumen semanal por comercio
 *
 * Los mensajes son "business-initiated" (fuera de la ventana de 24h), así que
 * Meta OBLIGA a usar una plantilla pre-aprobada; no se puede mandar texto
 * libre. Los nombres de plantilla y las credenciales vienen por env para que
 * el código no dependa de cómo se llamen en Meta Business Manager.
 *
 * Prerrequisito de producción: verificar el número de Boreas en Meta Business
 * Manager y aprobar las plantillas. En desarrollo se usa el modo de pruebas de
 * Meta con números de test.
 */

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || "es";
const DEFAULT_COUNTRY_CODE = process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || "57";

interface SendTemplateOptions {
  /** Número de destino en crudo (se normaliza aquí adentro). */
  to: string;
  /** Nombre de la plantilla aprobada en Meta. */
  template: string;
  /** Textos que reemplazan {{1}}, {{2}}, ... del body de la plantilla. */
  bodyParams: string[];
}

/**
 * Normaliza un número a formato MSISDN que espera la Cloud API (solo dígitos,
 * con código de país, sin "+"). Mismo criterio que InteractiveMenu.tsx
 * (`whatsappNumber.replace(/\D/g, "")`) más el prefijo de país cuando el
 * número viene local (10 dígitos = móvil Colombia).
 */
export function normalizeMsisdn(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  return digits;
}

/**
 * Envía un mensaje de plantilla por WhatsApp. Nunca lanza: devuelve
 * `{ ok, error }` para que quien lo llame decida si loguear o marcar `notified`.
 */
export async function sendWhatsAppTemplate({
  to,
  template,
  bodyParams,
}: SendTemplateOptions): Promise<{ ok: boolean; error?: string }> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn(
      "[whatsapp] WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN no configurados; no se envió el mensaje."
    );
    return { ok: false, error: "whatsapp_not_configured" };
  }

  const msisdn = normalizeMsisdn(to);
  if (!msisdn) {
    return { ok: false, error: "invalid_recipient" };
  }

  const body = {
    messaging_product: "whatsapp",
    to: msisdn,
    type: "template",
    template: {
      name: template,
      language: { code: TEMPLATE_LANG },
      components: [
        {
          type: "body",
          parameters: bodyParams.map((text) => ({ type: "text", text })),
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[whatsapp] Meta respondió", res.status, detail);
      return { ok: false, error: `meta_${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[whatsapp] error llamando a la Cloud API:", err);
    return { ok: false, error: "network_error" };
  }
}
