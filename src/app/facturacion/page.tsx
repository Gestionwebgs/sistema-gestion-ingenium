import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus } from "lucide-react";
import { ProjectStatusFilters } from "./ProjectStatusFilters";
import {
  invoiceStatus,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
  type InvoiceStatus,
} from "./status";

const formatAmount = (value: number) =>
  `S/. ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date: Date | null) =>
  date ? new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" }) : "—";

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string; estado?: string }>;
}) {
  const { proyecto, estado } = await searchParams;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const [projects, allInvoices] = await Promise.all([
    prisma.project.findMany({
      where: { invoices: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.invoice.findMany({
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ invoiceEnteredDate: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const orphanCount = allInvoices.filter((i) => !i.projectId).length;

  const filtered = allInvoices.filter((i) => {
    if (proyecto === "__SIN_PROYECTO__" && i.projectId) return false;
    if (proyecto && proyecto !== "__SIN_PROYECTO__" && i.projectId !== proyecto) return false;
    if (estado && invoiceStatus(i) !== estado) return false;
    return true;
  });

  const totalsByStatus: Record<InvoiceStatus, { count: number; amount: number }> = {
    SIN_FACTURA: { count: 0, amount: 0 },
    PENDIENTE_PAGO: { count: 0, amount: 0 },
    PAGADO: { count: 0, amount: 0 },
  };
  for (const inv of filtered) {
    const status = invoiceStatus(inv);
    const total = Number(inv.amountNet) + Number(inv.igvAmount);
    totalsByStatus[status].count += 1;
    totalsByStatus[status].amount += total;
  }

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="facturacion"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">Facturación</h1>
            <p className="text-sm text-brand-muted">
              Relación de órdenes/facturas de todos los proyectos — para el
              repaso de fin de mes.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProjectStatusFilters projects={projects} />
            <a
              href="/facturacion/importar"
              className="flex items-center justify-center gap-2 rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Importar desde Excel
            </a>
            <a
              href="/facturacion/nueva"
              className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nueva factura
            </a>
          </div>
        </header>

        {orphanCount > 0 && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Hay {orphanCount} factura{orphanCount === 1 ? "" : "s"} sin
            proyecto asignado todavía.{" "}
            <a href="/facturacion?proyecto=__SIN_PROYECTO__" className="underline">
              Filtrá por &quot;Sin proyecto asignado&quot;
            </a>{" "}
            para editarlas y asignarles un proyecto.
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map((status) => (
            <div
              key={status}
              className="rounded-lg border border-brand-border bg-brand-surface p-4"
            >
              <span
                className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${INVOICE_STATUS_STYLES[status]}`}
              >
                {INVOICE_STATUS_LABELS[status]}
              </span>
              <p className="mt-2 text-lg font-bold text-brand-navy">
                {formatAmount(totalsByStatus[status].amount)}
              </p>
              <p className="text-xs text-brand-muted">
                {totalsByStatus[status].count} factura
                {totalsByStatus[status].count === 1 ? "" : "s"}
              </p>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-muted">
            No hay facturas registradas todavía.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-surface">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
                <tr>
                  <th className="px-3 py-2">Proyecto</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">OC</th>
                  <th className="px-3 py-2">Ingreso</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const status = invoiceStatus(inv);
                  const total = Number(inv.amountNet) + Number(inv.igvAmount);
                  return (
                    <tr key={inv.id} className="border-t border-brand-border align-top">
                      <td className="px-3 py-2 text-brand-navy">
                        {inv.project?.name ?? (
                          <span className="text-amber-600">Sin proyecto</span>
                        )}
                      </td>
                      <td className="max-w-xs px-3 py-2 text-brand-navy">
                        {inv.description}
                        {inv.quoteCode && (
                          <p className="mt-0.5 text-xs text-brand-muted">
                            {inv.quoteCode}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">
                        {inv.purchaseOrderNumber ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">
                        {formatDate(inv.invoiceEnteredDate)}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        {formatAmount(total)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${INVOICE_STATUS_STYLES[status]}`}
                        >
                          {INVOICE_STATUS_LABELS[status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={`/facturacion/${inv.id}/editar`}
                          className="text-xs text-brand-blue hover:underline"
                        >
                          Editar
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
