"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Zap, Plus, ArrowLeft } from "lucide-react";
import LogoUploadField from "@/components/LogoUploadField";
import type { Client, ChipMode } from "@/types/database";

interface InstallerExpressProps {
  chipCode: string;
  chipId: string;
  isEditing?: boolean;
  initialClientId?: string | null;
  initialMode?: ChipMode;
  initialDestinationUrl?: string | null;
}

const MODE_OPTIONS: { value: ChipMode; label: string; helper: string }[] = [
  { value: "review_funnel", label: "Reseñas", helper: "Filtra malas reseñas antes de Google" },
  { value: "instagram", label: "Instagram", helper: "Redirige directo al perfil" },
  { value: "pdf_menu", label: "PDF", helper: "Redirige a un PDF (menú, catálogo, tarifas)" },
  { value: "interactive_menu", label: "Menú interactivo", helper: "Carta con pedido por WhatsApp" },
];

export default function InstallerExpress({
  chipCode,
  chipId,
  isEditing = false,
  initialClientId = null,
  initialMode = "review_funnel",
  initialDestinationUrl = null,
}: InstallerExpressProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  const [mode, setMode] = useState<"existing" | "new">(isEditing ? "existing" : "new");
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId ?? "");

  const [businessName, setBusinessName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerWhatsapp, setOwnerWhatsapp] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [chipMode, setChipMode] = useState<ChipMode>(initialMode);
  const [destinationUrl, setDestinationUrl] = useState(initialDestinationUrl ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []))
      .catch(() => setError("No se pudieron cargar los comercios existentes."))
      .finally(() => setLoadingClients(false));
  }, []);

  const needsDestinationUrl = chipMode === "instagram" || chipMode === "pdf_menu";

  function validate(): string | null {
    if (mode === "existing" && !selectedClientId) return "Selecciona un comercio.";
    if (mode === "new") {
      if (!businessName.trim()) return "El nombre del comercio es obligatorio.";
      if (!ownerEmail.trim()) return "El correo del dueño es obligatorio.";
    }
    if (needsDestinationUrl && !destinationUrl.trim()) {
      return "Esta modalidad necesita una URL de destino.";
    }
    return null;
  }

  async function handleActivate() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(isEditing ? "/api/chips/update" : "/api/chips/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chip_id: chipId,
          chip_code: chipCode,
          mode: chipMode,
          destination_url: destinationUrl || null,
          client:
            mode === "existing"
              ? { id: selectedClientId }
              : {
                  business_name: businessName,
                  owner_email: ownerEmail,
                  owner_whatsapp: ownerWhatsapp || null,
                  logo_url: logoUrl || null,
                },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? (isEditing ? "No se pudo actualizar el chip." : "No se pudo activar el chip."));
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="relative flex min-h-[100dvh] animate-fade-in flex-col items-center justify-center overflow-hidden bg-boreas-ink px-6 text-center">
        <div
          aria-hidden
          className="glow-orb-brand pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        />
        <div className="relative z-10 flex flex-col items-center">
          <CheckCircle2 size={48} className="text-boreas-mustard" />
          <h1 className="mt-4 text-xl font-semibold text-boreas-cream">
            {isEditing ? "Chip actualizado" : "Chip activado"}
          </h1>
          <p className="mt-2 text-sm text-boreas-cream/50">
            <span className="font-mono text-boreas-cream/80">{chipCode}</span>{" "}
            {isEditing ? "quedó con los nuevos datos." : "ya está en producción."}
          </p>
          <Link
            href="/admin"
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-boreas-cream/10 bg-boreas-cream/5 px-4 py-2 text-sm text-boreas-cream/70 hover:bg-boreas-cream/10"
          >
            <ArrowLeft size={14} /> Volver al panel
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-boreas-ink px-5 py-8">
      <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            aria-label="Volver al panel"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-boreas-cream/10 bg-boreas-cream/5 text-boreas-cream/60 hover:bg-boreas-cream/10"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-boreas-brick-bright">
              {isEditing ? "Editar chip" : "Instalador Express"}
            </p>
            <h1 className="mt-1 font-mono text-lg text-boreas-cream">{chipCode}</h1>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-boreas-mustard/10 ring-1 ring-boreas-mustard/30">
          <Zap size={18} className="text-boreas-mustard" />
        </div>
      </header>

      <section className="mb-6">
        <div className="flex gap-2 rounded-xl bg-boreas-surface p-1">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "existing"
                ? "bg-boreas-brick text-boreas-cream"
                : "text-boreas-cream/50 hover:bg-boreas-cream/5 hover:text-boreas-cream/75"
            }`}
          >
            Comercio existente
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "new"
                ? "bg-boreas-brick text-boreas-cream"
                : "text-boreas-cream/50 hover:bg-boreas-cream/5 hover:text-boreas-cream/75"
            }`}
          >
            Nuevo comercio
          </button>
        </div>
      </section>

      {mode === "existing" ? (
        <section className="mb-6">
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            Selecciona un comercio
          </label>
          {loadingClients ? (
            <div className="skeleton-shimmer h-[50px] rounded-xl border border-boreas-cream/10 bg-boreas-surface" />
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
            >
              <option value="">— Elige un comercio —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.business_name}
                </option>
              ))}
            </select>
          )}
        </section>
      ) : (
        <section className="mb-6 flex flex-col gap-3">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
              Nombre del comercio
            </label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej: Restaurante LOS34"
              className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream placeholder:text-boreas-cream/50 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
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
      )}

      <section className="mb-6">
        <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
          Modo del chip
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setChipMode(opt.value)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                chipMode === opt.value
                  ? "border-boreas-mustard bg-boreas-mustard/10"
                  : "border-boreas-cream/10 bg-boreas-surface hover:border-boreas-cream/20 hover:bg-boreas-cream/5"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  chipMode === opt.value ? "text-boreas-mustard" : "text-boreas-cream"
                }`}
              >
                {opt.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-boreas-cream/40">{opt.helper}</p>
            </button>
          ))}
        </div>
      </section>

      {(needsDestinationUrl || chipMode === "review_funnel") && (
        <section className="mb-6">
          <label className="mb-2 block text-xs uppercase tracking-wide text-boreas-cream/40">
            {chipMode === "review_funnel"
              ? "URL de Google Reviews (para 4-5 estrellas)"
              : "URL de destino"}
          </label>
          <input
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream placeholder:text-boreas-cream/30 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
          />
        </section>
      )}

      {error && <p className="mb-4 text-sm text-status-negative">{error}</p>}

      <button
        type="button"
        onClick={handleActivate}
        disabled={submitting}
        className="focus-gradient btn-gradient-brand flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 text-sm font-bold uppercase tracking-wide text-boreas-cream transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {isEditing ? "Guardar cambios" : "Vincular y activar chip"}
      </button>
      </div>
    </main>
  );
}
