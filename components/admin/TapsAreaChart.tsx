"use client";

// Separado de app/admin/(dashboard)/page.tsx a propósito: recharts es la
// librería más pesada de todo /admin. Con next/dynamic + ssr:false (ver el
// import en page.tsx) este componente queda en su propio chunk de JS que el
// navegador pide DESPUÉS de pintar las tarjetas de métrica — esas son más
// importantes para la primera impresión y no deberían esperar a que recharts
// termine de parsear/ejecutar.
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function TapsAreaChart({ data }: { data: Array<{ date: string; taps: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="tapsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B5472E" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#B5472E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fill: "rgba(251,247,241,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "rgba(251,247,241,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "#1F1813",
            border: "1px solid rgba(251,247,241,0.1)",
            borderRadius: 10,
            fontSize: 12,
            color: "#FBF7F1",
          }}
          labelStyle={{ color: "rgba(251,247,241,0.5)" }}
        />
        <Area type="monotone" dataKey="taps" stroke="#D9694D" strokeWidth={2} fill="url(#tapsGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
