import { LoanAmountFields } from "./LoanAmountFields";

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
    borrowerUserId?: string;
    amount?: number;
    currency?: string;
    interestRate?: number;
    bankCommission?: number;
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

      <LoanAmountFields
        initialAmount={defaults?.amount}
        initialCurrency={defaults?.currency}
        initialInterestRate={defaults?.interestRate}
        initialBankCommission={defaults?.bankCommission}
      />

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
