"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "EN_CURSO", label: "En curso" },
  { value: "CERRADO", label: "Cerrado" },
];

export function StatusFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("estado") ?? "";

  return (
    <select
      value={current}
      onChange={(e) => {
        const value = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set("estado", value);
        else params.delete("estado");
        const query = params.toString();
        router.push(`/pendientes${query ? `?${query}` : ""}`);
      }}
      className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
    >
      <option value="">Todos los estados</option>
      {STATUS_OPTIONS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
