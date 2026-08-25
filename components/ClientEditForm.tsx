"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Save } from "lucide-react";
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
  const [ownerWhatsapp, setOwnerWhatsapp] = useState(client.owner_whatsapp);
  const [logoUrl, setLogoUrl] = useState(client.logo_url ?? "");
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(client.billing_status);
  const [monthlyFee, setMonthlyFee] = useState(client.monthly_fee?.toString() ?? "");
  const [nextBillingDate, setNextBillingDate] = useState(client.next_billing_date ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    if (!businessName.trim() || !ownerWhatsapp.trim()) {
      setError("Nombre del comercio y WhatsApp son obligatorios.");
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
          owner_whatsapp: ownerWhatsapp,
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
    <main className="min-h-screen bg-boreas-navy-deep px-5 py-8">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          aria-label="Volver al panel"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-boreas-violet">Editar comercio</p>
          <h1 className="mt-1 text-lg font-semibold text-white">{client.business_name}</h1>
        </div>
      </header>

      <section className="mb-6 flex flex-col gap-3">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Nombre del comercio
          </label>
          <input
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            WhatsApp del dueño
          </label>
          <input
            value={ownerWhatsapp}
            onChange={(e) => setOwnerWhatsapp(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Logo (URL, opcional)
          </label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          />
        </div>
      </section>

      <section className="mb-6 flex flex-col gap-3">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Estado de facturación
          </label>
          <select
            value={billingStatus}
            onChange={(e) => setBillingStatus(e.target.value as BillingStatus)}
            className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          >
            {BILLING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Tarifa mensual (opcional)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Próxima fecha de cobro (opcional)
          </label>
          <input
            type="date"
            value={nextBillingDate}
            onChange={(e) => setNextBillingDate(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          />
        </div>
      </section>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {success && (
        <p className="mb-4 flex items-center gap-1.5 text-sm text-boreas-cyan">
          <CheckCircle2 size={14} /> Comercio actualizado.
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-boreas-violet to-boreas-cyan px-4 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_24px_rgba(123,79,191,0.35)] transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Guardar cambios
      </button>
    </main>
  );
}
