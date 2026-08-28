"use client";

import { useActionState, useTransition } from "react";
import {
  parseQuotesExcelAction,
  importQuotesAction,
  type ParseState,
} from "./actions";

const EMPTY_STATE: ParseState = { quotes: [], warnings: [], error: null };

const STAGE_LABELS: Record<string, string> = {
  ENVIADA: "Enviada",
  EN_EVALUACION: "En evaluación",
  OC_RECIBIDA: "OC recibida",
  PAGADA: "Pagada",
  RECHAZADA: "Rechazada",
};

const formatAmount = (value: number) =>
  `S/. ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ImportQuotesForm() {
  const [state, formAction, isParsing] = useActionState(
    parseQuotesExcelAction,
    EMPTY_STATE
  );
  const [isImporting, startImport] = useTransition();

  const byClient = new Map<string, number>();
  for (const q of state.quotes) {
    byClient.set(q.clientName, (byClient.get(q.clientName) ?? 0) + 1);
  }

  function handleImport() {
    startImport(async () => {
      await importQuotesAction(state.quotes);
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

      {state.quotes.length > 0 && (
        <div className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
          <h2 className="text-sm font-semibold text-brand-navy">
            Se encontraron {state.quotes.length} cotizaciones
          </h2>

          <p className="text-xs text-brand-muted">
            La etapa se adivinó a partir del texto de &quot;Estatus&quot; de
            cada fila (que queda completo en Notas) — revísala después de
            importar, no siempre va a estar bien.
          </p>

          {state.warnings.length > 0 && (
            <ul className="space-y-0.5">
              {state.warnings.map((w) => (
                <li key={w} className="text-xs text-amber-600">
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Por cliente
            </h3>
            <ul className="space-y-1 text-sm text-brand-navy">
              {Array.from(byClient.entries()).map(([client, count]) => (
                <li key={client} className="flex justify-between">
                  <span>{client}</span>
                  <span className="text-brand-muted">{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer text-brand-blue">
              Ver el detalle de cada cotización
            </summary>
            <div className="mt-2 max-h-80 overflow-y-auto rounded border border-brand-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 text-left uppercase text-brand-muted">
                  <tr>
                    <th className="px-2 py-1">Cliente</th>
                    <th className="px-2 py-1">N°</th>
                    <th className="px-2 py-1">Proyecto</th>
                    <th className="px-2 py-1 text-right">Sin IGV</th>
                    <th className="px-2 py-1">Etapa</th>
                  </tr>
                </thead>
                <tbody>
                  {state.quotes.map((q, i) => (
                    <tr key={i} className="border-t border-brand-border">
                      <td className="px-2 py-1 text-brand-muted">{q.clientName}</td>
                      <td className="px-2 py-1 text-brand-muted">{q.code}</td>
                      <td className="px-2 py-1 text-brand-navy">{q.project}</td>
                      <td className="px-2 py-1 text-right text-brand-navy">
                        {formatAmount(q.amountNoIgv)}
                      </td>
                      <td className="px-2 py-1 text-brand-muted">
                        {STAGE_LABELS[q.stage]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy disabled:opacity-50"
          >
            {isImporting ? "Importando..." : `Importar ${state.quotes.length} cotizaciones`}
          </button>
        </div>
      )}
    </div>
  );
}
