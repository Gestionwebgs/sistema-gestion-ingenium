"use client";

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// Paleta categórica validada (CVD-safe, orden fijo — no se reordena por dato).
const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#4a3aa7", // violet
];
const STATUS_GOOD = "#2a78d6";
const STATUS_CRITICAL = "#d03b3b";
const INK_SECONDARY = "#52514e";
const GRIDLINE = "#e1e0d9";

const formatSoles = (value: number) =>
  `S/. ${value.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type GastoSlice = { name: string; value: number };
type GananciaBar = { name: string; ganancia: number };

export function GastosPorProyectoChart({ data }: { data: GastoSlice[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-brand-muted">
        Sin gastos registrados todavía.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          strokeWidth={2}
          stroke="#ffffff"
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={CATEGORICAL[i % CATEGORICAL.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatSoles(Number(value))}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${GRIDLINE}`,
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: INK_SECONDARY }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function GananciaPorProyectoChart({ data }: { data: GananciaBar[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-64 items-center justify-center text-sm text-brand-muted">
        Sin proyectos todavía.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={GRIDLINE} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: INK_SECONDARY }}
          axisLine={{ stroke: GRIDLINE }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: INK_SECONDARY }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatSoles(v)}
          width={70}
        />
        <Tooltip
          formatter={(value) => formatSoles(Number(value))}
          contentStyle={{
            fontSize: 12,
            borderRadius: 8,
            border: `1px solid ${GRIDLINE}`,
          }}
        />
        <Bar dataKey="ganancia" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={entry.ganancia >= 0 ? STATUS_GOOD : STATUS_CRITICAL}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
