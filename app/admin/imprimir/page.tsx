"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";

// Hoja imprimible con varios QR a la vez: el flujo de venta real es imprimir
// lotes de 10-30 chips antes de salir a visitar comercios, y descargar un QR
// a la vez (como hace QrDownloadButton en /admin) no alcanza para eso.
function PrintGrid() {
  const searchParams = useSearchParams();
  const codes = (searchParams.get("codes") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-boreas-navy-deep print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
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

      {codes.length === 0 ? (
        <p className="text-sm text-black/50">No se seleccionó ningún chip.</p>
      ) : (
        <div className="grid grid-cols-3 gap-6 print:grid-cols-3 print:gap-4">
          {codes.map((code) => (
            <div
              key={code}
              className="flex flex-col items-center gap-2 break-inside-avoid rounded-lg border border-black/10 p-4 print:border-black/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/chips/${encodeURIComponent(code)}/qr`}
                alt={code}
                className="h-auto w-full max-w-[220px]"
              />
              <span className="font-mono text-sm text-black">{code}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default function ImprimirPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <PrintGrid />
    </Suspense>
  );
}
