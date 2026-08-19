"use client";

import { useActionState, useTransition } from "react";
import {
  parsePendientesExcelAction,
  importPendientesAction,
  type ParseState,
} from "./actions";

const EMPTY_STATE: ParseState = { tasks: [], contacts: [], warnings: [], error: null };

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  CERRADO: "Cerrado",
};

export function ImportPendientesForm() {
  const [state, formAction, isParsing] = useActionState(
    parsePendientesExcelAction,
    EMPTY_STATE
  );
  const [isImporting, startImport] = useTransition();

  const groups = new Map<string, number>();
  for (const t of state.tasks) {
    const key = `${t.section === "PROYECTOS" ? "Proyectos" : "Gestión interna"} · ${t.groupName}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  function handleImport() {
    startImport(async () => {
      await importPendientesAction(state.tasks, state.contacts);
    });
  }

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
      >
        <div>
          <label
            htmlFor="file"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Archivo Excel (.xlsx)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".xlsx"
            required
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy file:mr-3 file:rounded file:border-0 file:bg-brand-blue file:px-3 file:py-1.5 file:text-white"
          />
          <p className="mt-1 text-xs text-brand-muted">
            Busca hojas cuyo nombre incluya &quot;PENDIENTE&quot; (para las
            tareas) o &quot;CONTACTO&quot; (para el directorio).
          </p>
        </div>

        <button
          type="submit"
          disabled={isParsing}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy disabled:opacity-50"
        >
          {isParsing ? "Analizando..." : "Analizar archivo"}
        </button>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>

      {(state.tasks.length > 0 || state.contacts.length > 0) && (
        <div className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
          <h2 className="text-sm font-semibold text-brand-navy">
            Se encontraron {state.tasks.length} pendientes y{" "}
            {state.contacts.length} contactos
          </h2>

          {state.warnings.length > 0 && (
            <ul className="space-y-0.5">
              {state.warnings.map((w) => (
                <li key={w} className="text-xs text-amber-600">
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}

          {groups.size > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                Pendientes por grupo
              </h3>
              <ul className="space-y-1 text-sm text-brand-navy">
                {Array.from(groups.entries()).map(([group, count]) => (
                  <li key={group} className="flex justify-between">
                    <span>{group}</span>
                    <span className="text-brand-muted">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.tasks.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-brand-blue">
                Ver el detalle de cada pendiente
              </summary>
              <div className="mt-2 max-h-80 overflow-y-auto rounded border border-brand-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 text-left uppercase text-brand-muted">
                    <tr>
                      <th className="px-2 py-1">Grupo</th>
                      <th className="px-2 py-1">Tarea</th>
                      <th className="px-2 py-1">Responsable</th>
                      <th className="px-2 py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.tasks.map((t, i) => (
                      <tr key={i} className="border-t border-brand-border">
                        <td className="px-2 py-1 text-brand-muted">{t.groupName}</td>
                        <td className="px-2 py-1 text-brand-navy">{t.task}</td>
                        <td className="px-2 py-1 text-brand-muted">
                          {t.responsibleName ?? "—"}
                        </td>
                        <td className="px-2 py-1 text-brand-muted">
                          {STATUS_LABELS[t.status]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {state.contacts.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-brand-blue">
                Ver el detalle de cada contacto
              </summary>
              <ul className="mt-2 space-y-1">
                {state.contacts.map((c, i) => (
                  <li key={i} className="text-xs text-brand-navy">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-brand-muted"> — {c.companyName}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy disabled:opacity-50"
          >
            {isImporting
              ? "Importando..."
              : `Importar ${state.tasks.length} pendientes y ${state.contacts.length} contactos`}
          </button>
        </div>
      )}
    </div>
  );
}
