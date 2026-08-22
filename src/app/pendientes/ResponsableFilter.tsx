"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function ResponsableFilter({ options }: { options: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("responsable") ?? "";

  return (
    <select
      value={current}
      onChange={(e) => {
        const value = e.target.value;
        const params = new URLSearchParams(searchParams.toString());
        if (value) params.set("responsable", value);
        else params.delete("responsable");
        const query = params.toString();
        router.push(`/pendientes${query ? `?${query}` : ""}`);
      }}
      className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
    >
      <option value="">Todos los responsables</option>
      {options.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
