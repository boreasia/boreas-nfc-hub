"use client";

// Piezas de UI compartidas entre app/admin/page.tsx (portada con
// estadísticas), app/admin/negocios/page.tsx y app/admin/sin-activar/page.tsx
// — antes vivían todas dentro de app/admin/page.tsx, pero al separar esa
// página en tres (portada + negocios + chips sin activar) dejaron de tener
// un solo lugar natural. Esto es solo presentación/helpers, sin fetch propio:
// cada página sigue trayendo sus datos y pasándolos por props, igual que antes.

import Link from "next/link";
import { AlertTriangle, ChevronDown, Download, Pencil, Settings, Star, Zap, MessageCircleWarning } from "lucide-react";
import type { ChipMetricRow, ClientSummaryRow, BillingStatus, ChipMode } from "@/types/database";

export const ALERT_THRESHOLD_DAYS = 15;

export const MODE_LABEL: Record<ChipMode, string> = {
  review_funnel: "Reseñas",
  instagram: "Instagram",
  pdf_menu: "PDF",
  interactive_menu: "Menú interactivo",
};

export const BILLING_LABEL: Record<BillingStatus, string> = {
  al_dia: "Al día",
  pendiente: "Pendiente",
  atrasado: "Atrasado",
};

export const BILLING_BADGE_CLASS: Record<BillingStatus, string> = {
  al_dia: "bg-status-positive/10 text-status-positive",
  pendiente: "bg-status-pending/10 text-status-pending",
  atrasado: "bg-status-negative/10 text-status-negative",
};

export function chipNeedsAttention(chip: ChipMetricRow): boolean {
  return chip.is_active && chip.days_since_last_tap !== null && chip.days_since_last_tap > ALERT_THRESHOLD_DAYS;
}

// Los códigos se generan en lotes, así que el orden de inserción en la base
// no es secuencial. Ordenamos por el número embebido en el chip_code
// (BOREAS-2 antes que BOREAS-10) en vez de alfabéticamente.
function chipCodeSortKey(chipCode: string): number {
  const match = chipCode.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
}

export function compareChipCode(a: ChipMetricRow, b: ChipMetricRow): number {
  const diff = chipCodeSortKey(a.chip_code) - chipCodeSortKey(b.chip_code);
  return diff !== 0 ? diff : a.chip_code.localeCompare(b.chip_code);
}

export function AttentionBadge({ days }: { days: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-status-negative/10 px-2 py-0.5 text-xs text-status-negative">
      <AlertTriangle size={12} />
      Sin actividad hace {days}d
    </span>
  );
}

export function QrDownloadButton({ chipCode }: { chipCode: string }) {
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

export function ChipDetailRow({
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

export function SkeletonChipRow() {
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

export function SkeletonClientCard({ expanded = false }: { expanded?: boolean }) {
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

export function ClientCard({ client, chips, expanded, onToggle, selectedCodes, onToggleSelect }: ClientCardProps) {
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
          {client.total_reviews > 0 && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-boreas-cyan">
                <Star size={11} className="fill-boreas-cyan" />
                {client.average_rating?.toFixed(1)} ({client.total_reviews})
              </span>
            </>
          )}
          <span className={`rounded-full px-2 py-0.5 ${BILLING_BADGE_CLASS[client.billing_status]}`}>
            {BILLING_LABEL[client.billing_status]}
          </span>
          {client.negative_reviews > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-negative/10 px-2 py-0.5 text-status-negative">
              <MessageCircleWarning size={11} /> {client.negative_reviews} negativas
            </span>
          )}
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
