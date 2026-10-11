"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Printer, Sparkles, X } from "lucide-react";
import {
  ClientCard,
  SkeletonClientCard,
  compareChipCode,
} from "@/components/admin/shared";
import type { ChipMetricRow, ClientSummaryRow } from "@/types/database";

// Lista de comercios con sus chips y sus propias estadísticas (taps,
// reseñas, promedio, negativas). Antes vivía mezclada con "chips sin
// activar" en la portada de /admin; ahora es su propia vista, enlazada
// desde ahí.
export default function NegociosPage() {
  const [clients, setClients] = useState<ClientSummaryRow[]>([]);
  const [chipMetrics, setChipMetrics] = useState<ChipMetricRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [filter, setFilter] = useState("");
  const [expandedClientIds, setExpandedClientIds] = useState<Set<string>>(new Set());
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/clients/summary").then((res) => res.json()),
      fetch("/api/chips/metrics").then((res) => res.json()),
    ])
      .then(([clientsData, metricsData]) => {
        setClients(clientsData.clients ?? []);
        setChipMetrics(metricsData.metrics ?? []);
      })
      .catch(() => setDataError("No se pudieron cargar los datos de negocios."))
      .finally(() => setLoadingData(false));
  }, []);

  const sortedChipMetrics = useMemo(() => [...chipMetrics].sort(compareChipCode), [chipMetrics]);

  const chipsByClient = useMemo(() => {
    const map = new Map<string, ChipMetricRow[]>();
    for (const chip of sortedChipMetrics) {
      if (!chip.client_id) continue;
      const bucket = map.get(chip.client_id) ?? [];
      bucket.push(chip);
      map.set(chip.client_id, bucket);
    }
    return map;
  }, [sortedChipMetrics]);

  const normalizedFilter = filter.trim().toLowerCase();

  // Si el filtro coincide con un código de chip dentro de un comercio
  // colapsado, lo expandimos automáticamente para mostrar el match en vez de
  // obligar a abrirlo a mano. Solo agrega expansiones, nunca las quita, para
  // no pisar lo que el usuario ya abrió manualmente.
  useEffect(() => {
    if (!normalizedFilter) return;
    setExpandedClientIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const [clientId, chips] of chipsByClient) {
        if (next.has(clientId)) continue;
        const hasMatch = chips.some((chip) => chip.chip_code.toLowerCase().includes(normalizedFilter));
        if (hasMatch) {
          next.add(clientId);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [normalizedFilter, chipsByClient]);

  const filteredClients = useMemo(() => {
    if (!normalizedFilter) return clients;
    return clients.filter((client) => {
      if (client.business_name.toLowerCase().includes(normalizedFilter)) return true;
      const chips = chipsByClient.get(client.client_id) ?? [];
      return chips.some((chip) => chip.chip_code.toLowerCase().includes(normalizedFilter));
    });
  }, [clients, chipsByClient, normalizedFilter]);

  function toggleClient(clientId: string) {
    setExpandedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  function toggleSelectChip(chipCode: string) {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(chipCode)) next.delete(chipCode);
      else next.add(chipCode);
      return next;
    });
  }

  const printHref = `/admin/imprimir?codes=${encodeURIComponent(Array.from(selectedCodes).join(","))}`;

  return (
    <div className={`relative ${selectedCodes.size > 0 ? "pb-16" : ""}`}>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 font-cormorant text-2xl font-semibold text-boreas-cream">Clientes</h1>

        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por comercio o código de chip…"
          className="mb-4 w-full rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-3 text-base text-boreas-cream placeholder:text-boreas-cream/50 focus:border-boreas-mustard focus:outline-none focus:ring-1 focus:ring-boreas-mustard"
        />

        {loadingData ? (
          <div className="flex flex-col gap-3">
            <SkeletonClientCard expanded />
            <SkeletonClientCard />
            <SkeletonClientCard />
          </div>
        ) : dataError ? (
          <p className="text-sm text-status-negative">{dataError}</p>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-10 text-center">
            <Sparkles size={24} className="text-boreas-cream/30" />
            <p className="text-sm font-medium text-boreas-cream/70">Todavía no hay comercios activados</p>
            <p className="text-sm text-boreas-cream/40">
              Activa tu primer chip desde{" "}
              <Link href="/admin" className="text-boreas-mustard hover:underline">
                Resumen
              </Link>{" "}
              y va a aparecer acá.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.client_id}
                client={client}
                chips={chipsByClient.get(client.client_id) ?? []}
                expanded={expandedClientIds.has(client.client_id)}
                onToggle={() => toggleClient(client.client_id)}
                selectedCodes={selectedCodes}
                onToggleSelect={toggleSelectChip}
              />
            ))}

            {filteredClients.length === 0 && normalizedFilter && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-boreas-cream/10 bg-boreas-surface px-4 py-10 text-center">
                <Sparkles size={20} className="text-boreas-cream/30" />
                <p className="text-sm text-boreas-cream/50">Ningún comercio coincide con &quot;{filter}&quot;.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCodes.size > 0 && (
        <div className="glass-bar fixed inset-x-0 bottom-0 z-10 md:left-60">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
            <span className="text-sm text-boreas-cream/70">{selectedCodes.size} chip(s) seleccionados</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCodes(new Set())}
                className="inline-flex items-center gap-1.5 rounded-lg border border-boreas-cream/10 px-3 py-2 text-xs font-medium text-boreas-cream/60 hover:bg-boreas-cream/10"
              >
                <X size={12} /> Limpiar
              </button>
              <a
                href={printHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-boreas-brick px-4 py-2 text-xs font-semibold text-boreas-cream hover:opacity-90"
              >
                <Printer size={14} /> Imprimir QR
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
