"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import BoreasBrandmark from "@/components/BoreasBrandmark";
import type { ChipMode } from "@/types/database";

// Instrucción corta por modo, para que el QR nunca vaya "pelado" sin
// contexto de marca ni de qué hace al escanearlo.
const MODE_INSTRUCTION: Record<ChipMode, string> = {
  review_funnel: "Toca aquí con tu celular para dejarnos tu reseña",
  instagram: "Toca aquí con tu celular para ver nuestro Instagram",
  pdf_menu: "Toca aquí con tu celular para ver el menú",
  interactive_menu: "Toca aquí con tu celular para ver el menú y pedir",
};

// Hoja imprimible con varios QR a la vez: el flujo de venta real es imprimir
// lotes de 10-30 chips antes de salir a visitar comercios, y descargar un QR
// a la vez (como hace QrDownloadButton en /admin) no alcanza para eso.
export default function PrintGrid() {
  const searchParams = useSearchParams();
  const codes = (searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  // /api/chips/metrics ya devuelve el mode de cada chip — lo reutilizamos en
  // vez de agregar un endpoint nuevo solo para esto.
  const [modeByCode, setModeByCode] = useState<Record<string, ChipMode>>({});

  useEffect(() => {
    fetch("/api/chips/metrics")
      .then((res) => res.json())
      .then((data) => {
        const map: Record<string, ChipMode> = {};
        for (const m of data.metrics ?? []) map[m.chip_code] = m.mode;
        setModeByCode(map);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-boreas-navy-deep print:px-0 print:py-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-2 text-sm text-black/60 hover:bg-black/5"
        >
          <ArrowLeft size={14} /> Volver
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-boreas-violet px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Printer size={14} /> Imprimir
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between border-b border-black/10 pb-4">
        <BoreasBrandmark variant="light" size="small" />
        <span className="text-xs uppercase tracking-[0.2em] text-black/40">Lote de códigos QR</span>
      </div>

      {codes.length === 0 ? (
        <p className="text-sm text-black/50">No se seleccionó ningún chip.</p>
      ) : (
        <div className="grid grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
          {codes.map((code) => (
            <div
              key={code}
              className="flex flex-col items-center gap-1.5 break-inside-avoid rounded-lg border border-black/10 p-4 print:border-black/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/chips/${encodeURIComponent(code)}/qr`}
                alt={code}
                className="h-auto w-full max-w-[220px]"
              />
              <span className="font-mono text-sm text-black">{code}</span>
              <span className="text-center text-[11px] leading-tight text-black/60">
                {MODE_INSTRUCTION[modeByCode[code] ?? "review_funnel"]}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
