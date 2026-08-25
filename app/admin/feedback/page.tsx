"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircleWarning, Star } from "lucide-react";
import type { Client } from "@/types/database";

interface FeedbackRow {
  id: string;
  chip_id: string;
  rating: number;
  comment: string | null;
  customer_contact: string | null;
  created_at: string;
  chips: {
    chip_code: string;
    client_id: string | null;
    clients: { business_name: string } | null;
  } | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function RatingBadge({ rating }: { rating: number }) {
  const color = rating <= 2 ? "bg-red-400/10 text-red-400" : "bg-amber-400/10 text-amber-400";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      <Star size={12} />
      {rating}/5
    </span>
  );
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data.clients ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const url = selectedClientId
      ? `/api/feedback/list?client_id=${encodeURIComponent(selectedClientId)}`
      : "/api/feedback/list";

    fetch(url)
      .then((res) => res.json())
      .then((data) => setFeedbacks(data.feedbacks ?? []))
      .catch(() => setError("No se pudieron cargar los feedbacks."))
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  return (
    <main className="min-h-screen bg-boreas-navy-deep px-5 py-8">
      <div className="mx-auto max-w-2xl">
      <header className="mb-6 flex items-center gap-3">
        <Link
          href="/admin"
          aria-label="Volver al panel"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-boreas-violet">Panel</p>
          <h1 className="mt-1 text-lg font-semibold text-white">Feedback negativo</h1>
        </div>
      </header>

      <section className="mb-6">
        <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
          Filtrar por comercio
        </label>
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
        >
          <option value="">Todos los comercios</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.business_name}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-white/40">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </div>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : feedbacks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-boreas-navy px-4 py-10 text-center">
          <MessageCircleWarning size={24} className="text-white/30" />
          <p className="text-sm text-white/40">No hay feedback registrado todavía.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="rounded-xl border border-white/10 bg-boreas-navy px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingBadge rating={fb.rating} />
                  <span className="text-sm font-medium text-white">
                    {fb.chips?.clients?.business_name ?? "Comercio desconocido"}
                  </span>
                  <span className="font-mono text-xs text-white/40">{fb.chips?.chip_code}</span>
                </div>
                <span className="text-xs text-white/40">{formatDate(fb.created_at)}</span>
              </div>

              {fb.comment && <p className="mt-2 text-sm text-white/70">{fb.comment}</p>}

              {fb.customer_contact && (
                <p className="mt-2 text-xs text-white/40">Contacto: {fb.customer_contact}</p>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </main>
  );
}
