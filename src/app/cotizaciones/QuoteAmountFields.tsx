"use client";

import { useState } from "react";

const IGV_RATE = 0.18;

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function QuoteAmountFields({
  initialAmount = 0,
}: {
  initialAmount?: number;
}) {
  const [amount, setAmount] = useState(initialAmount);
  const igv = Math.round(amount * IGV_RATE * 100) / 100;
  const total = amount + igv;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <label
          htmlFor="amountNoIgv"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Monto sin IGV (S/.) *
        </label>
        <input
          id="amountNoIgv"
          name="amountNoIgv"
          type="number"
          step="0.01"
          min="0"
          required
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
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
        <p className="mb-1 text-sm font-medium text-brand-navy">Monto total</p>
        <p className="rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm font-semibold text-brand-navy">
          S/. {formatSoles(total)}
        </p>
      </div>
    </div>
  );
}
