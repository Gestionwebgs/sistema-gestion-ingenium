"use client";

import { useActionState, useTransition } from "react";
import {
  parseInvoicesExcelAction,
  importInvoicesAction,
  type ParseState,
} from "./actions";
import { invoiceStatus, INVOICE_STATUS_LABELS } from "../status";

const EMPTY_STATE: ParseState = { invoices: [], warnings: [], error: null };

const formatAmount = (value: number) =>
  `S/. ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function ImportInvoicesForm() {
  const [state, formAction, isParsing] = useActionState(
    parseInvoicesExcelAction,
    EMPTY_STATE
  );
  const [isImporting, startImport] = useTransition();

  function handleImport() {
    startImport(async () => {
      await importInvoicesAction(state.invoices);
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

      {state.invoices.length > 0 && (
        <div className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
          <h2 className="text-sm font-semibold text-brand-navy">
            Se encontraron {state.invoices.length} facturas
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

          <details className="text-sm">
            <summary className="cursor-pointer text-brand-blue">
              Ver el detalle de cada factura
            </summary>
            <div className="mt-2 max-h-80 overflow-y-auto rounded border border-brand-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-gray-50 text-left uppercase text-brand-muted">
                  <tr>
                    <th className="px-2 py-1">OC</th>
                    <th className="px-2 py-1">Descripción</th>
                    <th className="px-2 py-1 text-right">Monto neto</th>
                    <th className="px-2 py-1">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {state.invoices.map((inv, i) => (
                    <tr key={i} className="border-t border-brand-border">
                      <td className="px-2 py-1 text-brand-muted">
                        {inv.purchaseOrderNumber ?? "—"}
                      </td>
                      <td className="px-2 py-1 text-brand-navy">{inv.description}</td>
                      <td className="px-2 py-1 text-right text-brand-navy">
                        {formatAmount(inv.amountNet)}
                      </td>
                      <td className="px-2 py-1 text-brand-muted">
                        {INVOICE_STATUS_LABELS[invoiceStatus(inv)]}
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
            {isImporting ? "Importando..." : `Importar ${state.invoices.length} facturas`}
          </button>
        </div>
      )}
    </div>
  );
}
