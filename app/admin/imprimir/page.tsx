import { Suspense } from "react";
import type { Metadata } from "next";
import PrintGrid from "@/components/PrintGrid";

export const metadata: Metadata = {
  title: "Imprimir QR · Boreas NFC Hub",
};

export default function ImprimirPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white" />}>
      <PrintGrid />
    </Suspense>
  );
}
