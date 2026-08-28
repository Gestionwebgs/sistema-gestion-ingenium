import { QuoteAmountFields } from "./QuoteAmountFields";

const STAGE_LABELS: Record<string, string> = {
  ENVIADA: "Enviada",
  EN_EVALUACION: "En evaluación",
  OC_RECIBIDA: "OC recibida",
  PAGADA: "Pagada",
  RECHAZADA: "Rechazada",
};

export function QuoteForm({
  action,
  clientNames,
  cancelHref,
  submitLabel,
  defaults,
}: {
  action: (formData: FormData) => void;
  clientNames: string[];
  cancelHref: string;
  submitLabel: string;
  defaults?: {
    clientName?: string;
    contactName?: string;
    code?: string;
    project?: string;
    amountNoIgv?: number;
    stage?: string;
    quoteDate?: string;
    notes?: string;
  };
}) {
  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="clientName"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Cliente *
          </label>
          <input
            id="clientName"
            name="clientName"
            type="text"
            required
            list="clientNameOptions"
            defaultValue={defaults?.clientName}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
          <datalist id="clientNameOptions">
            {clientNames.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <label
            htmlFor="code"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            N° de cotización *
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            placeholder="ISS-021-2026"
            defaultValue={defaults?.code}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contactName"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Usuario / contacto
        </label>
        <input
          id="contactName"
          name="contactName"
          type="text"
          placeholder="Ing. Christian Florian — Área de Proyectos"
          defaultValue={defaults?.contactName}
          className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <div>
        <label
          htmlFor="project"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Proyecto *
        </label>
        <textarea
          id="project"
          name="project"
          rows={2}
          required
          defaultValue={defaults?.project}
          className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <QuoteAmountFields initialAmount={defaults?.amountNoIgv} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="stage"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Etapa
          </label>
          <select
            id="stage"
            name="stage"
            defaultValue={defaults?.stage ?? "ENVIADA"}
            className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            {Object.entries(STAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="quoteDate"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Fecha de la cotización
          </label>
          <input
            id="quoteDate"
            name="quoteDate"
            type="date"
            defaultValue={defaults?.quoteDate}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Notas (N° de OC, estado de la valorización, etc.)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
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
