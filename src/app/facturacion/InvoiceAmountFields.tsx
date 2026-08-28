"use client";

import { useState } from "react";

const IGV_RATE = 0.18;

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function InvoiceAmountFields({
  initialAmountNet = 0,
  initialDetractionPercent = 12,
}: {
  initialAmountNet?: number;
  initialDetractionPercent?: number;
}) {
  const [amountNet, setAmountNet] = useState(initialAmountNet);
  const [detractionPercent, setDetractionPercent] = useState(initialDetractionPercent);

  const igv = Math.round(amountNet * IGV_RATE * 100) / 100;
  const total = amountNet + igv;
  const detraccion = Math.round(total * (detractionPercent / 100) * 100) / 100;
  const netoACobrar = total - detraccion;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="amountNet"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Monto neto (S/.) *
          </label>
          <input
            id="amountNet"
            name="amountNet"
            type="number"
            step="0.01"
            min="0"
            required
            value={amountNet || ""}
            onChange={(e) => setAmountNet(Number(e.target.value) || 0)}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-brand-navy">IGV (18%)</p>
          <p className="rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-muted">
            S/. {formatSoles(igv)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-brand-navy">Total facturado</p>
          <p className="rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm font-semibold text-brand-navy">
            S/. {formatSoles(total)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="detractionPercent"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Detracción (%)
          </label>
          <input
            id="detractionPercent"
            name="detractionPercent"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={detractionPercent}
            onChange={(e) => setDetractionPercent(Number(e.target.value) || 0)}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-brand-navy">Detracción (retenida)</p>
          <p className="rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-muted">
            S/. {formatSoles(detraccion)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-brand-navy">Neto a cobrar directo</p>
          <p className="rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm font-semibold text-brand-navy">
            S/. {formatSoles(netoACobrar)}
          </p>
        </div>
      </div>
    </div>
  );
}
