import { InvoiceAmountFields } from "./InvoiceAmountFields";

type Project = { id: string; name: string };

export function InvoiceForm({
  action,
  projects,
  cancelHref,
  submitLabel,
  defaults,
}: {
  action: (formData: FormData) => void;
  projects: Project[];
  cancelHref: string;
  submitLabel: string;
  defaults?: {
    projectId?: string;
    purchaseOrderNumber?: string;
    quoteCode?: string;
    solicitantName?: string;
    description?: string;
    amountNet?: number;
    detractionPercent?: number;
    hesRequested?: boolean;
    hesRequestedDate?: string;
    hesReceived?: boolean;
    invoiceEnteredDate?: string;
    paid?: boolean;
    paidDate?: string;
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
          htmlFor="projectId"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Proyecto
        </label>
        <select
          id="projectId"
          name="projectId"
          defaultValue={defaults?.projectId ?? ""}
          className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        >
          <option value="">Sin proyecto (asignar después)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="purchaseOrderNumber"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            Orden de compra
          </label>
          <input
            id="purchaseOrderNumber"
            name="purchaseOrderNumber"
            type="text"
            placeholder="8070011577 00010"
            defaultValue={defaults?.purchaseOrderNumber}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label
            htmlFor="quoteCode"
            className="mb-1 block text-sm font-medium text-brand-navy"
          >
            N° de cotización
          </label>
          <input
            id="quoteCode"
            name="quoteCode"
            type="text"
            placeholder="COT-ISS-021-2026"
            defaultValue={defaults?.quoteCode}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="solicitantName"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Solicitante
        </label>
        <input
          id="solicitantName"
          name="solicitantName"
          type="text"
          defaultValue={defaults?.solicitantName}
          className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-medium text-brand-navy"
        >
          Descripción *
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          required
          placeholder="VALORIZACIÓN 1 BRAZO PIVOTANTE"
          defaultValue={defaults?.description}
          className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
        />
      </div>

      <InvoiceAmountFields
        initialAmountNet={defaults?.amountNet}
        initialDetractionPercent={defaults?.detractionPercent}
      />

      <div className="space-y-3 rounded-md border border-brand-border p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
          Trámite
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              name="hesRequested"
              defaultChecked={defaults?.hesRequested}
              className="h-4 w-4 rounded border-brand-border"
            />
            Se solicitó HES
          </label>
          <input
            type="date"
            name="hesRequestedDate"
            defaultValue={defaults?.hesRequestedDate}
            className="rounded-md border border-brand-border px-3 py-1.5 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              name="hesReceived"
              defaultChecked={defaults?.hesReceived}
              className="h-4 w-4 rounded border-brand-border"
            />
            HES recibido / factura ingresada
          </label>
          <input
            type="date"
            name="invoiceEnteredDate"
            defaultValue={defaults?.invoiceEnteredDate}
            className="rounded-md border border-brand-border px-3 py-1.5 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-brand-navy">
            <input
              type="checkbox"
              name="paid"
              defaultChecked={defaults?.paid}
              className="h-4 w-4 rounded border-brand-border"
            />
            Ya pagaron
          </label>
          <input
            type="date"
            name="paidDate"
            defaultValue={defaults?.paidDate}
            className="rounded-md border border-brand-border px-3 py-1.5 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
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
