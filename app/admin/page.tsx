"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search,
  ChevronDown,
  AlertTriangle,
  Download,
  Inbox,
  Pencil,
  Zap,
  MessageCircleWarning,
  Printer,
  X,
  Settings,
} from "lucide-react";
import BoreasBrandmark from "@/components/BoreasBrandmark";
import type { ChipMetricRow, ClientSummaryRow, BillingStatus, ChipMode } from "@/types/database";

const ALERT_THRESHOLD_DAYS = 15;

const MODE_LABEL: Record<ChipMode, string> = {
  review_funnel: "Reseñas",
  instagram: "Instagram",
  pdf_menu: "PDF",
  interactive_menu: "Menú interactivo",
};

const BILLING_LABEL: Record<BillingStatus, string> = {
  al_dia: "Al día",
  pendiente: "Pendiente",
  atrasado: "Atrasado",
};

const BILLING_BADGE_CLASS: Record<BillingStatus, string> = {
  al_dia: "bg-status-positive/10 text-status-positive",
  pendiente: "bg-status-pending/10 text-status-pending",
  atrasado: "bg-status-negative/10 text-status-negative",
};

function chipNeedsAttention(chip: ChipMetricRow): boolean {
  return chip.is_active && chip.days_since_last_tap !== null && chip.days_since_last_tap > ALERT_THRESHOLD_DAYS;
}

function AttentionBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-negative/10 px-2 py-0.5 text-xs text-status-negative">
      <AlertTriangle size={12} />
      Sin actividad hace {days}d
    </span>
  );
}

function QrDownloadButton({ chipCode }: { chipCode: string }) {
  return (
    <a
      href={`/api/chips/${encodeURIComponent(chipCode)}/qr`}
      download={`${chipCode}.png`}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10"
    >
      <Download size={12} /> Descargar QR
    </a>
  );
}

function ChipDetailRow({
  chip,
  selected,
  onToggleSelect,
}: {
  chip: ChipMetricRow;
  selected: boolean;
  onToggleSelect: (chipCode: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(chip.chip_code)}
          aria-label={`Seleccionar ${chip.chip_code} para imprimir`}
          className="h-4 w-4 rounded border-white/20 bg-boreas-navy accent-boreas-cyan"
        />
        <span className="font-mono text-white/80">{chip.chip_code}</span>
        <span className="text-xs text-white/40">{MODE_LABEL[chip.mode]}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            chip.is_active ? "bg-status-positive/10 text-status-positive" : "bg-white/5 text-white/40"
          }`}
        >
          {chip.is_active ? "Activo" : "Pendiente"}
        </span>
        {chipNeedsAttention(chip) && <AttentionBadge days={chip.days_since_last_tap as number} />}
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-white/50">
          {chip.total_taps} taps · {chip.negative_feedbacks} feedback
        </span>
        <Link
          href={`/admin/activar/${encodeURIComponent(chip.chip_code)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10"
        >
          {chip.is_active ? <Pencil size={12} /> : <Zap size={12} />}
          {chip.is_active ? "Editar" : "Activar"}
        </Link>
        <QrDownloadButton chipCode={chip.chip_code} />
      </div>
    </div>
  );
}

function SkeletonChipRow() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 rounded bg-white/10" />
        <div className="h-3 w-20 rounded bg-white/10" />
        <div className="h-4 w-14 rounded-full bg-white/10" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 w-16 rounded bg-white/10" />
        <div className="h-6 w-20 rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

function SkeletonClientCard({ expanded = false }: { expanded?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-boreas-navy">
      <div className="flex flex-col gap-2 px-4 py-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="h-4 w-4 rounded bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded bg-white/10" />
          <div className="h-3 w-14 rounded bg-white/10" />
          <div className="h-4 w-16 rounded-full bg-white/10" />
        </div>
      </div>
      {expanded && (
        <div className="bg-boreas-navy-deep/60">
          <SkeletonChipRow />
          <SkeletonChipRow />
        </div>
      )}
    </div>
  );
}

interface ClientCardProps {
  client: ClientSummaryRow;
  chips: ChipMetricRow[];
  expanded: boolean;
  onToggle: () => void;
  selectedCodes: Set<string>;
  onToggleSelect: (chipCode: string) => void;
}

function ClientCard({ client, chips, expanded, onToggle, selectedCodes, onToggleSelect }: ClientCardProps) {
  const hasAlert = chips.some(chipNeedsAttention);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-boreas-navy">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`chips-${client.client_id}`}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-white/[0.03]"
      >
        <div className="flex items-center justify-between">
          <span className="font-medium text-white">{client.business_name}</span>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/comercios/${client.client_id}/editar`}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Editar ${client.business_name}`}
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white/70"
            >
              <Settings size={14} />
            </Link>
            <ChevronDown
              size={16}
              className={`text-white/40 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span>{client.active_chips} chips activos</span>
          <span>·</span>
          <span>{client.total_taps} taps</span>
          <span
            className={`rounded-full px-2 py-0.5 ${BILLING_BADGE_CLASS[client.billing_status]}`}
          >
            {BILLING_LABEL[client.billing_status]}
          </span>
          {hasAlert && (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-negative/10 px-2 py-0.5 text-status-negative">
              <AlertTriangle size={12} /> Requiere atención
            </span>
          )}
        </div>
      </button>

      <div
        id={`chips-${client.client_id}`}
        aria-hidden={!expanded}
        className={`overflow-hidden bg-boreas-navy-deep/60 transition-all duration-300 ease-in-out ${
          expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {chips.length === 0 ? (
          <p className="px-4 py-3 text-sm text-white/40">Este comercio no tiene chips vinculados.</p>
        ) : (
          chips.map((chip) => (
            <ChipDetailRow
              key={chip.chip_id}
              chip={chip}
              selected={selectedCodes.has(chip.chip_code)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [chipCodeInput, setChipCodeInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

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
      .catch(() => setDataError("No se pudieron cargar los datos del panel."))
      .finally(() => setLoadingData(false));
  }, []);

  async function handleSearch() {
    const code = chipCodeInput.trim();
    if (!code) return;
    setSearching(true);
    setSearchError(null);

    try {
      const res = await fetch(`/api/chips/lookup?chip_code=${encodeURIComponent(code)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Chip no encontrado.");
      }
      const data = await res.json();
      router.push(`/admin/activar/${encodeURIComponent(data.chip.chip_code)}`);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Error inesperado.");
      setSearching(false);
    }
  }

  const chipsByClient = useMemo(() => {
    const map = new Map<string, ChipMetricRow[]>();
    for (const chip of chipMetrics) {
      if (!chip.client_id) continue;
      const bucket = map.get(chip.client_id) ?? [];
      bucket.push(chip);
      map.set(chip.client_id, bucket);
    }
    return map;
  }, [chipMetrics]);

  const unassignedChips = useMemo(
    () => chipMetrics.filter((chip) => !chip.client_id),
    [chipMetrics]
  );

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

  const filteredUnassignedChips = useMemo(() => {
    if (!normalizedFilter) return unassignedChips;
    return unassignedChips.filter((chip) => chip.chip_code.toLowerCase().includes(normalizedFilter));
  }, [unassignedChips, normalizedFilter]);

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
    <main className={`min-h-screen bg-boreas-navy-deep px-5 py-8 ${selectedCodes.size > 0 ? "pb-20" : ""}`}>
      <header className="mb-4 flex items-center justify-between">
        <BoreasBrandmark />
        <h1 className="font-cormorant text-2xl font-semibold text-white">Control Center</h1>
      </header>
      <div className="mb-4 h-0.5 w-full bg-gradient-to-r from-boreas-cyan to-boreas-violet" />

      <div className="mb-6 flex justify-end">
        <Link
          href="/admin/feedback"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10"
        >
          <MessageCircleWarning size={14} /> Ver feedback negativo
        </Link>
      </div>

      <section className="mb-8">
        <label className="mb-2 block text-xs uppercase tracking-wide text-white/40">
          Activar chip por código
        </label>
        <div className="flex gap-2">
          <input
            value={chipCodeInput}
            onChange={(e) => setChipCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="BOREAS-001"
            className="flex-1 rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 font-mono text-base text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="flex items-center justify-center rounded-xl bg-boreas-violet px-4 text-white disabled:opacity-40"
          >
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          </button>
        </div>
        {searchError && <p className="mt-2 text-sm text-red-400">{searchError}</p>}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/40">Comercios</h2>
        </div>

        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por comercio o código de chip…"
          className="mb-4 w-full rounded-xl border border-white/10 bg-boreas-navy px-4 py-3 text-base text-white placeholder:text-white/30 focus:border-boreas-cyan focus:outline-none focus:ring-1 focus:ring-boreas-cyan"
        />

        {loadingData ? (
          <div className="flex flex-col gap-3">
            <SkeletonClientCard expanded />
            <SkeletonClientCard />
            <SkeletonClientCard />
          </div>
        ) : dataError ? (
          <p className="text-sm text-red-400">{dataError}</p>
        ) : clients.length === 0 && unassignedChips.length === 0 ? (
          <p className="text-sm text-white/40">
            Aún no hay chips generados. Corre <code className="text-white/60">scripts/generate-chips.mjs</code>{" "}
            para crear el primer lote.
          </p>
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
              <p className="text-sm text-white/40">Ningún comercio coincide con &quot;{filter}&quot;.</p>
            )}

            {filteredUnassignedChips.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-boreas-navy">
                <div className="flex items-center gap-2 bg-white/[0.03] px-4 py-3">
                  <Inbox size={14} className="text-white/40" />
                  <span className="text-sm font-medium text-white/70">
                    Chips sin activar ({filteredUnassignedChips.length})
                  </span>
                </div>
                {filteredUnassignedChips.map((chip) => (
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
        )}
      </section>

      {selectedCodes.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between gap-3 border-t border-white/10 bg-boreas-navy-deep/95 px-5 py-3 backdrop-blur">
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
      )}
    </main>
  );
}
