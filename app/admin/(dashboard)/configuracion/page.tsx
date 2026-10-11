import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";

export const metadata: Metadata = { title: "Configuración · Boreas NFC Hub" };

// Server Component: solo lee PRESENCIA de variables de entorno (true/false),
// nunca su valor — así esta página puede mostrar qué está conectado sin
// arriesgar filtrar ningún secreto al cliente. Es la única cosa "real" que
// hay para mostrar en una página de Configuración hoy: no existen settings
// editables desde la UI (todo vive en env vars de Vercel/.env.local).
const INTEGRATIONS = [
  {
    label: "WhatsApp Cloud API (Meta)",
    helper: "Alerta inmediata de reseña negativa por WhatsApp.",
    configured: Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN),
  },
  {
    label: "Resend (correo)",
    helper: "Alerta de reseña negativa y reporte quincenal por correo.",
    configured: Boolean(process.env.RESEND_API_KEY),
  },
  {
    label: "Make.com (webhook)",
    helper: "Respaldo/otros canales para el feedback negativo.",
    configured: Boolean(process.env.MAKE_WEBHOOK_URL),
  },
  {
    label: "Vercel Cron",
    helper: "Autentica la llamada automática al reporte quincenal.",
    configured: Boolean(process.env.CRON_SECRET),
  },
  {
    label: "Login de administrador",
    helper: "Credenciales propias (reemplazó Basic Auth).",
    configured: Boolean(process.env.ADMIN_USER && process.env.ADMIN_PASSWORD),
  },
];

export default function ConfiguracionPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-cormorant text-2xl font-semibold text-boreas-cream">Configuración</h1>
      <p className="mt-1 text-sm text-boreas-cream/50">
        Estado de las integraciones. Los valores viven en variables de entorno — acá no se editan, solo se
        confirma si están puestas.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        {INTEGRATIONS.map((item) => (
          <div
            key={item.label}
            className="glass-panel-soft flex items-center gap-3 rounded-2xl px-4 py-3.5"
          >
            {item.configured ? (
              <CheckCircle2 size={18} className="shrink-0 text-status-positive" />
            ) : (
              <XCircle size={18} className="shrink-0 text-boreas-cream/30" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-boreas-cream">{item.label}</p>
              <p className="truncate text-xs text-boreas-cream/45">{item.helper}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                item.configured ? "bg-status-positive/10 text-status-positive" : "bg-boreas-cream/5 text-boreas-cream/40"
              }`}
            >
              {item.configured ? "Configurado" : "No configurado"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
