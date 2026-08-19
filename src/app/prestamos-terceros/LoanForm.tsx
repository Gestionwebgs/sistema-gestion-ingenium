type User = { id: string; name: string };

export function LoanForm({
  action,
  users,
  cancelHref,
  submitLabel,
  defaults,
}: {
  action: (formData: FormData) => void;
  users: User[];
  cancelHref: string;
  submitLabel: string;
  defaults?: {
    lenderName?: string;
    borrowerUserId?: string;
    amount?: number;
    currency?: string;
    interestAmount?: number;
    interestCurrency?: string;
    bankCommission?: number;
    bankCommissionCurrency?: string;
    loanDate?: string;
    dueDate?: string;
    notes?: string;
  };
}) {
  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
    >
      <div>
        <label
          htmlFor="lenderName"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Prestamista *
        </label>
        <input
          id="lenderName"
          name="lenderName"
          type="text"
          required
          defaultValue={defaults?.lenderName}
          className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <div>
        <label
          htmlFor="borrowerUserId"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          A nombre de
        </label>
        <select
          id="borrowerUserId"
          name="borrowerUserId"
          defaultValue={defaults?.borrowerUserId ?? ""}
          className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="">Empresa (general)</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="amount"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Monto *
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaults?.amount}
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
            defaultValue={defaults?.currency ?? "PEN"}
            className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="PEN">Soles (S/.)</option>
            <option value="USD">Dólares ($)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="interestAmount"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Interés
          </label>
          <input
            id="interestAmount"
            name="interestAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.interestAmount}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label
            htmlFor="interestCurrency"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Moneda del interés
          </label>
          <select
            id="interestCurrency"
            name="interestCurrency"
            defaultValue={defaults?.interestCurrency ?? "PEN"}
            className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="PEN">Soles (S/.)</option>
            <option value="USD">Dólares ($)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="loanDate"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Fecha del préstamo *
          </label>
          <input
            id="loanDate"
            name="loanDate"
            type="date"
            required
            defaultValue={defaults?.loanDate}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label
            htmlFor="dueDate"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Fecha de pago
          </label>
          <input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaults?.dueDate}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            defaultValue={defaults?.bankCommission}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label
            htmlFor="bankCommissionCurrency"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Moneda de la comisión
          </label>
          <select
            id="bankCommissionCurrency"
            name="bankCommissionCurrency"
            defaultValue={defaults?.bankCommissionCurrency ?? "PEN"}
            className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="PEN">Soles (S/.)</option>
            <option value="USD">Dólares ($)</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Notas
        </label>
        <input
          id="notes"
          name="notes"
          type="text"
          defaultValue={defaults?.notes}
          className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <a
          href={cancelHref}
          className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
        >
          Cancelar
        </a>
        <button
          type="submit"
          className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
