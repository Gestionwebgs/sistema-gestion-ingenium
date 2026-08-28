"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { INVOICE_STATUS_LABELS } from "./status";

type Project = { id: string; name: string };

export function ProjectStatusFilters({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentProject = searchParams.get("proyecto") ?? "";
  const currentStatus = searchParams.get("estado") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const query = params.toString();
    router.push(`/facturacion${query ? `?${query}` : ""}`);
  }

  return (
    <>
      <select
        value={currentProject}
        onChange={(e) => updateParam("proyecto", e.target.value)}
        className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        <option value="">Todos los proyectos</option>
        <option value="__SIN_PROYECTO__">Sin proyecto asignado</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        value={currentStatus}
        onChange={(e) => updateParam("estado", e.target.value)}
        className="rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
      >
        <option value="">Todos los estados</option>
        {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </>
  );
}
