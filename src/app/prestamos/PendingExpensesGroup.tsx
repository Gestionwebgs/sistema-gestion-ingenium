"use client";

import { useState } from "react";
import { createReimbursementAction } from "./actions";

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type PendingExpense = {
  id: string;
  date: string;
  description: string;
  pending: number;
  projectName: string | null;
};

type Reimbursement = {
  id: string;
  date: string;
  amount: number;
  description: string | null;
};

export function PendingExpensesGroup({
  paidToUserId,
  paidToName,
  expenses,
  pendingTotal,
  reimbursements,
}: {
  paidToUserId: string | null;
  paidToName: string;
  expenses: PendingExpense[];
  pendingTotal: number;
  reimbursements: Reimbursement[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const total = expenses
    .filter((e) => checked.has(e.id))
    .reduce((sum, e) => sum + e.pending, 0);

  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-brand-navy">{paidToName}</h3>
        <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
          Saldo pendiente: S/. {formatSoles(pendingTotal)}
        </span>
      </div>

      {expenses.length > 0 ? (
        <form action={createReimbursementAction} className="space-y-3">
          {paidToUserId && (
            <input type="hidden" name="paidToUserId" value={paidToUserId} />
          )}
          <input type="hidden" name="paidToName" value={paidToName} />

          <div className="divide-y divide-brand-border rounded-md border border-brand-border">
            {expenses.map((expense) => (
              <label
                key={expense.id}
                className="flex items-center gap-3 px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="expenseIds"
                  value={expense.id}
                  checked={checked.has(expense.id)}
                  onChange={() => toggle(expense.id)}
                  className="h-4 w-4 shrink-0"
                />
                <span className="w-20 shrink-0 text-xs text-brand-muted">
                  {expense.date}
                </span>
                <span className="flex-1 text-brand-navy">
                  {expense.description}
                  {expense.projectName && (
                    <span className="ml-2 text-xs text-brand-muted">
                      ({expense.projectName})
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-medium text-brand-navy">
                  S/. {formatSoles(expense.pending)}
                </span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <input
                type="date"
                name="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <input
                type="text"
                name="description"
                placeholder="Nota (opcional)"
                className="rounded border border-brand-border px-2 py-1.5 text-xs"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-brand-navy">
                Total: S/. {formatSoles(total)}
              </span>
              <button
                type="submit"
                disabled={checked.size === 0}
                className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy disabled:opacity-40"
              >
                Registrar pago
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-sm text-brand-muted">
          No tiene gastos pendientes de devolver ahora mismo.
        </p>
      )}

      {reimbursements.length > 0 && (
        <div className="mt-4 border-t border-brand-border pt-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
            Abonos realizados
          </h4>
          <div className="divide-y divide-brand-border rounded-md border border-brand-border">
            {reimbursements.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <div>
                  <span className="text-xs text-brand-muted">{r.date}</span>
                  {r.description && (
                    <span className="ml-2 text-brand-navy">{r.description}</span>
                  )}
                </div>
                <span className="font-medium text-brand-navy">
                  S/. {formatSoles(r.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
