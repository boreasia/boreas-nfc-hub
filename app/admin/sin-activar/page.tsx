"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Inbox, Printer, X } from "lucide-react";
import { ChipDetailRow, SkeletonChipRow, compareChipCode } from "@/components/admin/shared";
import type { ChipMetricRow } from "@/types/database";

// Inventario de chips todavía sin asignar a un comercio. Antes vivía como
// una sección más al final de la portada de /admin; ahora es su propia
// vista, enlazada desde ahí.
export default function SinActivarPage() {
  const [chipMetrics, setChipMetrics] = useState<ChipMetricRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [filter, setFilter] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/chips/metrics")
      .then((res) => res.json())
      .then((data) => setChipMetrics(data.metrics ?? []))
      .catch(() => setDataError("No se pudieron cargar los chips."))
      .finally(() => setLoadingData(false));
  }, []);

  const unassignedChips = useMemo(
    () => [...chipMetrics].filter((chip) => !chip.client_id).sort(compareChipCode),
    [chipMetrics]
  );

  const normalizedFilter = filter.trim().toLowerCase();

  const filteredChips = useMemo(() => {
    if (!normalizedFilter) return unassignedChips;
    return unassignedChips.filter((chip) => chip.chip_code.toLowerCase().includes(normalizedFilter));
  }, [unassignedChips, normalizedFilter]);

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
    <main
      className={`relative min-h-[100dvh] bg-boreas-navy-deep px-5 py-8 ${
        selectedCodes.size > 0 ? "pb-20" : ""
      }`}
    >
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
            <p className="text-xs uppercase tracking-[0.2em] text-boreas-violet-bright">Panel</p>
            <h1 className="mt-1 text-lg font-semibold text-white">NFC sin activar</h1>
          </div>
        </header>

        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por código de chip…"
          className="mb-4 w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white placeholder:text-white/50 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
        />

        {loadingData ? (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <SkeletonChipRow />
            <SkeletonChipRow />
            <SkeletonChipRow />
          </div>
        ) : dataError ? (
          <p className="text-sm text-status-negative">{dataError}</p>
        ) : filteredChips.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-boreas-navy px-4 py-10 text-center">
            <Inbox size={24} className="text-white/30" />
            <p className="text-sm font-medium text-white/70">
              {normalizedFilter ? `Ningún chip coincide con "${filter}".` : "No hay chips sin activar."}
            </p>
            {!normalizedFilter && (
              <p className="text-sm text-white/40">Todo el inventario generado ya está instalado.</p>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-boreas-navy">
            <div className="flex items-center gap-2 bg-white/[0.03] px-4 py-3">
              <Inbox size={14} className="text-white/40" />
              <span className="text-sm font-medium text-white/70">
                Chips sin activar ({filteredChips.length})
              </span>
            </div>
            {filteredChips.map((chip) => (
              <ChipDetailRow
                key={chip.chip_id}
                chip={chip}
                selected={selectedCodes.has(chip.chip_code)}
                onToggleSelect={toggleSelectChip}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCodes.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-boreas-navy-deep/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
            <span className="text-sm text-white/70">{selectedCodes.size} chip(s) seleccionados</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCodes(new Set())}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/60 hover:bg-white/10"
              >
                <X size={12} /> Limpiar
              </button>
              <a
                href={printHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-boreas-violet px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                <Printer size={14} /> Imprimir QR
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
