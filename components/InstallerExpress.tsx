"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, Zap, Plus, ArrowLeft } from "lucide-react";
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
      if (!ownerWhatsapp.trim()) return "El WhatsApp del dueño es obligatorio.";
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
                  owner_whatsapp: ownerWhatsapp,
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
      <main className="flex min-h-screen flex-col items-center justify-center bg-boreas-navy-deep px-6 text-center">
        <CheckCircle2 size={48} className="text-boreas-cyan" />
        <h1 className="mt-4 text-xl font-semibold text-white">
          {isEditing ? "Chip actualizado" : "Chip activado"}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          <span className="font-mono text-white/80">{chipCode}</span>{" "}
          {isEditing ? "quedó con los nuevos datos." : "ya está en producción."}
        </p>
        <Link
          href="/admin"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 hover:bg-white/10"
        >
          <ArrowLeft size={14} /> Volver al panel
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-boreas-navy-deep px-5 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            aria-label="Volver al panel"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-boreas-violet">
              {isEditing ? "Editar chip" : "Instalador Express"}
            </p>
            <h1 className="mt-1 font-mono text-lg text-white">{chipCode}</h1>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-boreas-cyan/10 ring-1 ring-boreas-cyan/30">
          <Zap size={18} className="text-boreas-cyan" />
        </div>
      </header>

      <section className="mb-6">
        <div className="flex gap-2 rounded-xl bg-boreas-navy p-1">
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "existing" ? "bg-boreas-violet text-white" : "text-white/50"
            }`}
          >
            Comercio existente
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "new" ? "bg-boreas-violet text-white" : "text-white/50"
            }`}
          >
            Nuevo comercio
          </button>
        </div>
      </section>

      {mode === "existing" ? (
        <section className="mb-6">
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            Selecciona un comercio
          </label>
          {loadingClients ? (
            <div className="flex items-center gap-2 text-sm text-white/40">
              <Loader2 size={14} className="animate-spin" /> Cargando…
            </div>
          ) : (
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-sm text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
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
            <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
              Nombre del comercio
            </label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ej: Restaurante LOS34"
              className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
              WhatsApp del dueño
            </label>
            <input
              value={ownerWhatsapp}
              onChange={(e) => setOwnerWhatsapp(e.target.value)}
              placeholder="+57 300 000 0000"
              className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
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
              className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
            />
          </div>
        </section>
      )}

      <section className="mb-6">
        <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
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
                  ? "border-boreas-cyan bg-boreas-cyan/10"
                  : "border-white/10 bg-boreas-navy"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  chipMode === opt.value ? "text-boreas-cyan" : "text-white"
                }`}
              >
                {opt.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-tight text-white/40">{opt.helper}</p>
            </button>
          ))}
        </div>
      </section>

      {(needsDestinationUrl || chipMode === "review_funnel") && (
        <section className="mb-6">
          <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
            {chipMode === "review_funnel"
              ? "URL de Google Reviews (para 4-5 estrellas)"
              : "URL de destino"}
          </label>
          <input
            value={destinationUrl}
            onChange={(e) => setDestinationUrl(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          />
        </section>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        onClick={handleActivate}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-boreas-violet to-boreas-cyan px-4 py-4 text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_24px_rgba(123,79,191,0.35)] transition-opacity disabled:opacity-40 enabled:hover:opacity-90"
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {isEditing ? "Guardar cambios" : "Vincular y activar chip"}
      </button>
    </main>
  );
}
