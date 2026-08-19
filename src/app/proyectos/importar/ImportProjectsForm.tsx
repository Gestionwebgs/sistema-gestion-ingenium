"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  parseProjectExcelAction,
  importProjectsAction,
  type ParseState,
  type ParsedProjectSheet,
} from "./actions";

const EMPTY_PARSE_STATE: ParseState = { sheets: [], error: null };

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ImportProjectsForm({
  businessLines,
}: {
  businessLines: { id: string; name: string }[];
}) {
  const [state, formAction, isParsing] = useActionState(
    parseProjectExcelAction,
    EMPTY_PARSE_STATE
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [businessLineBySheet, setBusinessLineBySheet] = useState<
    Record<number, string>
  >({});
  const [isImporting, startImport] = useTransition();
  const [importError, setImportError] = useState<string | null>(null);

  const sheets = state.sheets;

  // Cuando llega un nuevo resultado de análisis, selecciona todo por
  // defecto (una sola vez por análisis, no en cada render — si no, sería
  // imposible desmarcar todos los checkboxes a mano).
  useEffect(() => {
    setSelected(new Set(sheets.map((_, i) => i)));
    setBusinessLineBySheet({});
  }, [sheets]);

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleImport() {
    setImportError(null);
    const payload = Array.from(selected).map((i) => {
      const sheet = sheets[i];
      const businessLineId = businessLineBySheet[i] ?? businessLines[0]?.id ?? "";
      return { ...sheet, businessLineId };
    });

    if (payload.some((p) => !p.businessLineId)) {
      setImportError("Elige una línea de negocio para cada proyecto seleccionado.");
      return;
    }

    startImport(async () => {
      try {
        await importProjectsAction(payload);
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : "No se pudo importar."
        );
      }
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
            Busca hojas con el formato de ficha de proyecto (celda A1 =
            &quot;Proyecto:&quot;) — como las que ya usan para PAMOLSA, OC,
            etc. Puede tener varias hojas de proyecto en un mismo archivo.
          </p>
        </div>

        <button
          type="submit"
          disabled={isParsing}
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy disabled:opacity-50"
        >
          {isParsing ? "Analizando..." : "Analizar archivo"}
        </button>

        {state.error && (
          <p className="text-sm text-red-600">{state.error}</p>
        )}
      </form>

      {sheets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-brand-navy">
            Se detectaron {sheets.length} proyecto
            {sheets.length === 1 ? "" : "s"} — revisa antes de importar
          </h2>

          {sheets.map((sheet, i) => (
            <PreviewCard
              key={sheet.sheetName}
              sheet={sheet}
              index={i}
              checked={selected.has(i)}
              onToggle={() => toggle(i)}
              businessLines={businessLines}
              businessLineId={businessLineBySheet[i] ?? ""}
              onBusinessLineChange={(id) =>
                setBusinessLineBySheet((prev) => ({ ...prev, [i]: id }))
              }
            />
          ))}

          {importError && (
            <p className="text-sm text-red-600">{importError}</p>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting || selected.size === 0}
            className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy disabled:opacity-50"
          >
            {isImporting
              ? "Importando..."
              : `Importar ${selected.size} proyecto${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewCard({
  sheet,
  checked,
  onToggle,
  businessLines,
  businessLineId,
  onBusinessLineChange,
}: {
  sheet: ParsedProjectSheet;
  index: number;
  checked: boolean;
  onToggle: () => void;
  businessLines: { id: string; name: string }[];
  businessLineId: string;
  onBusinessLineChange: (id: string) => void;
}) {
  const totalGastos = sheet.gastos.reduce((s, g) => s + g.amount, 0);
  const totalAbonos = sheet.abonos.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-brand-navy">
              {sheet.name}
            </p>
            <span className="text-xs text-brand-muted">
              (hoja &quot;{sheet.sheetName}&quot;)
            </span>
          </div>
          <p className="text-xs text-brand-muted">
            {sheet.clientBusinessName ?? "Sin cliente"}
            {sheet.location ? ` · ${sheet.location}` : ""}
            {sheet.clientRuc ? ` · RUC ${sheet.clientRuc}` : ""}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <p className="text-brand-muted">Monto sin IGV</p>
              <p className="font-medium text-brand-navy">
                S/. {formatSoles(sheet.orderAmountNoIgv)}
              </p>
            </div>
            <div>
              <p className="text-brand-muted">Gastos a importar</p>
              <p className="font-medium text-brand-navy">
                {sheet.gastos.length} (S/. {formatSoles(totalGastos)})
              </p>
            </div>
            <div>
              <p className="text-brand-muted">Abonos a importar</p>
              <p className="font-medium text-brand-navy">
                {sheet.abonos.length} (S/. {formatSoles(totalAbonos)})
              </p>
            </div>
            <div>
              <label className="text-brand-muted">Línea de negocio *</label>
              <select
                value={businessLineId}
                onChange={(e) => onBusinessLineChange(e.target.value)}
                className="mt-0.5 w-full rounded border border-brand-border bg-white px-2 py-1 text-xs text-brand-navy"
              >
                <option value="">Elegir...</option>
                {businessLines.map((bl) => (
                  <option key={bl.id} value={bl.id}>
                    {bl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {sheet.warnings.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {sheet.warnings.map((w) => (
                <li key={w} className="text-xs text-amber-600">
                  ⚠ {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
