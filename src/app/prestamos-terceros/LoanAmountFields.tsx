"use client";

import { useState } from "react";

const formatMoney = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : "S/."} ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function LoanAmountFields({
  initialAmount = 0,
  initialCurrency = "PEN",
  initialInterestRate,
  initialBankCommission = 0,
}: {
  initialAmount?: number;
  initialCurrency?: string;
  initialInterestRate?: number;
  initialBankCommission?: number;
}) {
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState(initialCurrency);
  const [interestRate, setInterestRate] = useState(initialInterestRate ?? 0);
  const [bankCommission, setBankCommission] = useState(initialBankCommission);

  const interestAmount = Math.round(amount * (interestRate / 100) * 100) / 100;
  const totalToPay = amount + interestAmount + (bankCommission || 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="amount"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Monto prestado *
          </label>
          <input
            id="amount"
            name="amount"
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
          <label
            htmlFor="currency"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Moneda
          </label>
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="PEN">Soles (S/.)</option>
            <option value="USD">Dólares ($)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="interestRate"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Tasa de interés (%)
          </label>
          <input
            id="interestRate"
            name="interestRate"
            type="number"
            step="0.01"
            min="0"
            value={interestRate || ""}
            onChange={(e) => setInterestRate(Number(e.target.value) || 0)}
            placeholder="Ej. 15"
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-brand-navy">
            Interés calculado
          </p>
          <p className="rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-muted">
            {formatMoney(interestAmount, currency)}
          </p>
        </div>
        <div>
          <label
            htmlFor="bankCommission"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Comisión del banco
          </label>
          <input
            id="bankCommission"
            name="bankCommission"
            type="number"
            step="0.01"
            min="0"
            value={bankCommission || ""}
            onChange={(e) => setBankCommission(Number(e.target.value) || 0)}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
      </div>

      {/* La comisión y el interés se guardan en la misma moneda del préstamo
          — coincide con cómo se ve en la práctica (no suelen ser en moneda
          distinta al monto prestado). */}
      <input type="hidden" name="interestCurrency" value={currency} />
      <input type="hidden" name="bankCommissionCurrency" value={currency} />

      <div className="rounded-md border border-brand-blue/30 bg-blue-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-blue">
          Total a pagar
        </p>
        <p className="text-lg font-bold text-brand-navy">
          {formatMoney(totalToPay, currency)}
        </p>
      </div>
    </div>
  );
}
