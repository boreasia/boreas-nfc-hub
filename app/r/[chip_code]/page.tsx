import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import ReviewFunnel from "@/components/ReviewFunnel";
import InteractiveMenu from "@/components/InteractiveMenu";
import BoreasBrandmark from "@/components/BoreasBrandmark";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { chip_code: string };
}

async function registerTapEvent(chipId: string) {
  const headersList = headers();
  const userAgent = headersList.get("user-agent") ?? "unknown";

  // Fire-and-forget: no bloqueamos el render por esto. Si falla, no debe
  // tumbar la experiencia del cliente final.
  supabaseAdmin
    .from("tap_events")
    .insert({ chip_id: chipId, user_agent: userAgent })
    .then(({ error }) => {
      if (error) console.error("[tap_events] error registrando evento:", error.message);
    });
}

export default async function ChipRouterPage({ params }: PageProps) {
  const { chip_code } = params;

  const { data: chip, error } = await supabaseAdmin
    .from("chips")
    .select("*, clients(*)")
    .eq("chip_code", chip_code)
    .maybeSingle();

  // Caso 1: el chip_code no existe en la base de datos.
  // Esto no debería pasar si el lote se pre-generó con scripts/generate-chips.mjs,
  // pero lo cubrimos para no romper la experiencia si alguien escanea un QR viejo.
  if (error || !chip) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-boreas-navy-deep px-6 text-center">
        <BoreasBrandmark />
        <div>
          <h1 className="text-2xl font-semibold text-white">Este código no está registrado</h1>
          <p className="mt-2 text-sm text-white/50">
            Código: <span className="font-mono text-white/80">{chip_code}</span>
          </p>
        </div>
      </main>
    );
  }

  await registerTapEvent(chip.id);

  // Caso 2: chip inactivo o sin comercio asignado → pantalla neutra pública.
  // IMPORTANTE: esta ruta es pública y sin autenticación (middleware.ts solo
  // protege /admin/:path*), así que NUNCA debe exponer aquí el formulario de
  // activación (Instalador Express) — cualquiera que toque/escanee el chip
  // antes de la visita comercial podría auto-activarlo con datos arbitrarios.
  // La única forma de activar un chip es desde /admin, protegido por Basic Auth.
  if (!chip.is_active || !chip.client_id) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-boreas-navy-deep px-6 text-center">
        <BoreasBrandmark />
        <div>
          <h1 className="text-2xl font-semibold text-white">Este código está en proceso de instalación</h1>
          <p className="mt-2 text-sm text-white/50">
            Código: <span className="font-mono text-white/80">{chip_code}</span>
          </p>
          <p className="mt-4 text-sm text-white/40">Vuelve a intentarlo más tarde.</p>
        </div>
      </main>
    );
  }

  // Caso 3: chip activo, se decide según el modo.
  switch (chip.mode) {
    case "instagram":
    case "pdf_menu": {
      if (!chip.destination_url) {
        return (
          <main className="flex min-h-screen items-center justify-center bg-boreas-navy-deep px-6 text-center">
            <p className="text-white/70">
              Este chip está activo pero no tiene una URL de destino configurada.
            </p>
          </main>
        );
      }
      redirect(chip.destination_url);
    }

    case "review_funnel": {
      const client = chip.clients;
      return (
        <ReviewFunnel
          chipId={chip.id}
          businessName={client?.business_name ?? "este negocio"}
          logoUrl={client?.logo_url ?? null}
          destinationUrl={chip.destination_url ?? "#"}
        />
      );
    }

    case "interactive_menu": {
      const client = chip.clients;
      return (
        <InteractiveMenu
          chipId={chip.id}
          businessName={client?.business_name ?? "este negocio"}
          logoUrl={client?.logo_url ?? null}
          menuPdfUrl={chip.menu_pdf_url ?? chip.destination_url}
          whatsappNumber={client?.owner_whatsapp ?? ""}
        />
      );
    }

    default:
      return (
        <main className="flex min-h-screen items-center justify-center bg-boreas-navy-deep px-6 text-center">
          <p className="text-white/70">Modo de chip no reconocido.</p>
        </main>
      );
  }
}
