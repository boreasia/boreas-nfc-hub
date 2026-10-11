"use client";

// Mismo motivo que TapsAreaChart.tsx: recharts en su propio chunk, cargado
// vía next/dynamic con ssr:false desde page.tsx.
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const DONUT_COLORS = ["#B5472E", "#E3A72F", "#6B8E4E", "#D9694D", "#8A6D9E", "#5B6B7A"];

export default function ClientDonutChart({ data }: { data: Array<{ business_name: string; taps: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          dataKey="taps"
          nameKey="business_name"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#1F1813",
            border: "1px solid rgba(251,247,241,0.1)",
            borderRadius: 10,
            fontSize: 12,
            color: "#FBF7F1",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export { DONUT_COLORS };
