"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
import LogoUploadField from "@/components/LogoUploadField";
import type { Client, BillingStatus } from "@/types/database";

interface ClientEditFormProps {
  client: Client;
}

const BILLING_OPTIONS: { value: BillingStatus; label: string }[] = [
  { value: "al_dia", label: "Al día" },
  { value: "pendiente", label: "Pendiente" },
  { value: "atrasado", label: "Atrasado" },
];

export default function ClientEditForm({ client }: ClientEditFormProps) {
  const router = useRouter();

  const [businessName, setBusinessName] = useState(client.business_name);
  const [ownerEmail, setOwnerEmail] = useState(client.owner_email ?? "");
  const [ownerWhatsapp, setOwnerWhatsapp] = useState(client.owner_whatsapp ?? "");
  const [logoUrl, setLogoUrl] = useState(client.logo_url ?? "");
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(client.billing_status);
  const [monthlyFee, setMonthlyFee] = useState(client.monthly_fee?.toString() ?? "");
  const [nextBillingDate, setNextBillingDate] = useState(client.next_billing_date ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!businessName.trim() || !ownerEmail.trim()) {
      setError("Nombre del comercio y correo son obligatorios.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName,
          owner_email: ownerEmail,
          owner_whatsapp: ownerWhatsapp || null,
          logo_url: logoUrl || null,
          billing_status: billingStatus,
          monthly_fee: monthlyFee ? Number(monthlyFee) : null,
          next_billing_date: nextBillingDate || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "No se pudo guardar el comercio.");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-boreas-ink px-5 py-8">
      <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          aria-label="Volver al panel"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-boreas-cream/10 bg-boreas-cream/5 text-boreas-cream/60 hover:bg-boreas-cream/10"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-boreas-brick-bright">Editar comercio</p>
          <h1 className="mt-1 text-lg font-semibold text-boreas-cream">{client.business_name}</h1>
        </div>
      </header>

      <section className="mb-6 flex flex-col gap-3">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            Nombre del comercio
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            Correo del dueño
          </label>
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="dueño@negocio.com"
            className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream placeholder:text-boreas-cream/50 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
          />
          <p className="mt-1.5 text-[11px] text-boreas-cream/40">
            Ahí llegan la alerta de reseña negativa y el reporte quincenal.
          </p>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            WhatsApp del dueño (opcional)
          </label>
          <input
            value={ownerWhatsapp}
            onChange={(e) => setOwnerWhatsapp(e.target.value)}
            placeholder="+57 300 000 0000"
            className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream placeholder:text-boreas-cream/50 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
          />
        </div>
        <LogoUploadField value={logoUrl} onChange={setLogoUrl} />
      </section>

      <section className="mb-6 flex flex-col gap-3">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            Estado de facturación
          </label>
          <select
            value={billingStatus}
            onChange={(e) => setBillingStatus(e.target.value as BillingStatus)}
            className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
          >
            {BILLING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            Tarifa mensual (opcional)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream placeholder:text-boreas-cream/50 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            Próxima fecha de cobro (opcional)
          </label>
          <input
            type="date"
            value={nextBillingDate}
            onChange={(e) => setNextBillingDate(e.target.value)}
            className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
          />
        </div>
      </section>

      {error && <p className="mb-4 text-sm text-status-negative">{error}</p>}
      {success && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-boreas-mustard">
          <CheckCircle2 size={14} /> Comercio actualizado.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={submitting}
        className="focus-gradient btn-gradient-brand flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold uppercase tracking-wide text-boreas-cream transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Guardar cambios
      </button>
      </div>
    </main>
  );
}
