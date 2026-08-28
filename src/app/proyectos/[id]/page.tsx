import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { getFileSignedUrl } from "@/lib/s3";
import { addExpenseAction, addIncomeAction, addInvoiceAction } from "./actions";
import {
  invoiceStatus,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_STYLES,
} from "@/app/facturacion/status";

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  EFECTIVO: "Efectivo",
  YAPE_PLIN: "Yape/Plin",
  TRANSFERENCIA: "Transferencia",
  TARJETA: "Tarjeta",
  OTRO: "Otro",
};

export default async function ProyectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [project, users] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        clientContact: true,
        businessLine: true,
        expenses: {
          orderBy: { date: "asc" },
          include: {
            paidByUser: { select: { name: true } },
            createdByUser: { select: { name: true } },
            attachments: true,
          },
        },
        incomes: { orderBy: { date: "asc" } },
        invoices: { orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  // Un solo link firmado por gasto (el primer comprobante adjunto), para no
  // recargar la tabla de gastos si en el futuro se permite más de uno.
  const attachmentUrlByExpenseId = Object.fromEntries(
    await Promise.all(
      project.expenses
        .filter((e) => e.attachments.length > 0)
        .map(async (e) => [
          e.id,
          await getFileSignedUrl(e.attachments[0].fileKey),
        ])
    )
  ) as Record<string, string>;

  const orderAmountNoIgv = Number(project.orderAmountNoIgv);
  const igvAmount = Number(project.igvAmount);
  const montoTotal = orderAmountNoIgv + igvAmount;
  const monthlyTaxPercent = Number(project.monthlyTaxPercent);
  const annualRentPercent = Number(project.annualRentPercent);
  const impuestoMensual = montoTotal * monthlyTaxPercent;
  const rentaAnual = montoTotal * annualRentPercent;
  const saldoPositivo = orderAmountNoIgv - impuestoMensual - rentaAnual;

  const totalGastos = project.expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  const totalAbonos = project.incomes.reduce(
    (sum, i) => sum + Number(i.amount),
    0
  );
  const ganancia = saldoPositivo - totalGastos;

  const addExpense = addExpenseAction.bind(null, project.id);
  const addIncome = addIncomeAction.bind(null, project.id);
  const addInvoice = addInvoiceAction.bind(null, project.id);

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a
              href="/proyectos"
              className="text-sm text-brand-blue hover:underline"
            >
              ← Proyectos
            </a>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              {project.name}
            </h1>
            <p className="text-sm text-brand-muted">
              {project.businessLine.name}
              {project.location ? ` · ${project.location}` : ""}
            </p>
          </div>
          <a
            href={`/proyectos/${project.id}/editar`}
            className="shrink-0 rounded-md border border-brand-border px-3 py-1.5 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
          >
            Editar
          </a>
        </header>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard label="Cliente" value={project.client?.businessName ?? "—"} />
          <InfoCard
            label="Contacto"
            value={project.clientContact?.name ?? "—"}
          />
          <InfoCard label="RUC" value={project.client?.ruc ?? "—"} />
          <InfoCard
            label="Responsable por Ingenium"
            value={project.responsibleName ?? "—"}
          />
          <InfoCard
            label="Orden de compra"
            value={project.purchaseOrderNumber ?? "—"}
          />
          <InfoCard
            label="Fechas"
            value={`${project.startDate ? formatDate(project.startDate) : "—"} / ${project.endDate ? formatDate(project.endDate) : "—"}`}
          />
        </div>

        <div className="mb-8 rounded-lg border border-brand-border bg-brand-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-brand-navy">
            Control financiero
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MoneyStat label="Monto sin IGV" value={orderAmountNoIgv} />
            <MoneyStat label="IGV" value={igvAmount} />
            <MoneyStat label="Monto total" value={montoTotal} highlight />
            <MoneyStat label="Saldo positivo" value={saldoPositivo} highlight />
            <MoneyStat
              label={`Impuesto mensual (${(monthlyTaxPercent * 100).toFixed(0)}%)`}
              value={impuestoMensual}
            />
            <MoneyStat
              label={`Renta anual (${(annualRentPercent * 100).toFixed(0)}%)`}
              value={rentaAnual}
            />
            <MoneyStat label="Total gastos" value={totalGastos} />
            <MoneyStat label="Total abonos" value={totalAbonos} />
          </div>
          <div className="mt-4 border-t border-brand-border pt-4">
            <MoneyStat label="Ganancia" value={ganancia} highlight big />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-brand-navy">
              Registro de gastos
            </h2>
            <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {project.expenses.map((expense) => (
                    <tr key={expense.id} className="border-t border-brand-border">
                      <td className="px-3 py-2 text-brand-muted">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-3 py-2 text-brand-navy">
                        {expense.description}
                        {expense.operationCode && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-brand-muted">
                            {expense.operationCode}
                          </span>
                        )}
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brand-blue">
                          {expense.paidByName ?? expense.paidByUser?.name ?? expense.createdByUser.name}
                        </span>
                        <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-brand-muted">
                          {expense.paymentSource === "PERSONAL"
                            ? "Personal"
                            : "Empresa"}
                        </span>
                        {expense.paymentMethod && (
                          <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-brand-muted">
                            {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        S/. {formatSoles(Number(expense.amount))}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {attachmentUrlByExpenseId[expense.id] && (
                          <a
                            href={attachmentUrlByExpenseId[expense.id]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mr-2 text-xs text-brand-blue hover:underline"
                          >
                            Ver comprobante
                          </a>
                        )}
                        <a
                          href={`/gastos/${expense.id}/editar`}
                          className="text-xs text-brand-blue hover:underline"
                        >
                          Editar
                        </a>
                      </td>
                    </tr>
                  ))}
                  {project.expenses.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-3 py-6 text-center text-sm text-brand-muted"
                      >
                        Aún no hay gastos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <form
                action={addExpense}
                className="flex flex-wrap items-center gap-2 border-t border-brand-border p-3"
              >
                <input
                  type="date"
                  name="date"
                  required
                  className="w-[9.5rem] shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <input
                  type="text"
                  name="description"
                  placeholder="Descripción"
                  required
                  className="min-w-[8rem] flex-1 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <input
                  type="text"
                  name="operationCode"
                  placeholder="N° comprobante"
                  title="N° de comprobante/factura, para ubicarlo en el reporte mensual"
                  className="w-[8rem] shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <select
                  name="paidByUserId"
                  defaultValue={session!.user.id}
                  title="Responsable de la compra"
                  className="shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="paidByNameManual"
                  placeholder="Otro (nombre, si no está en la lista)"
                  title="Si la persona no tiene cuenta en el sistema, escribe su nombre aquí en vez de elegirlo arriba"
                  className="min-w-[10rem] shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <select
                  name="paymentSource"
                  className="shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                >
                  <option value="EMPRESA">Empresa</option>
                  <option value="PERSONAL">Personal</option>
                </select>
                <select
                  name="paymentMethod"
                  defaultValue=""
                  title="Método de pago"
                  className="shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                >
                  <option value="">Método (opcional)</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="YAPE_PLIN">Yape / Plin</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="OTRO">Otro</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  placeholder="Monto"
                  required
                  className="w-20 shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <input
                  type="file"
                  name="file"
                  accept="image/*,.pdf"
                  title="Comprobante (foto o PDF), opcional"
                  className="min-w-[10rem] shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy"
                >
                  Agregar
                </button>
              </form>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-brand-navy">
              Registro de abonos
            </h2>
            <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {project.incomes.map((income) => (
                    <tr key={income.id} className="border-t border-brand-border">
                      <td className="px-3 py-2 text-brand-muted">
                        {formatDate(income.date)}
                      </td>
                      <td className="px-3 py-2 text-brand-navy">
                        {income.description}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        S/. {formatSoles(Number(income.amount))}
                      </td>
                    </tr>
                  ))}
                  {project.incomes.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-sm text-brand-muted"
                      >
                        Aún no hay abonos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <form
                action={addIncome}
                className="flex flex-wrap items-center gap-2 border-t border-brand-border p-3"
              >
                <input
                  type="date"
                  name="date"
                  required
                  className="w-[9.5rem] shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <input
                  type="text"
                  name="description"
                  placeholder="Descripción"
                  required
                  className="min-w-[8rem] flex-1 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  placeholder="Monto"
                  required
                  className="w-20 shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy"
                >
                  Agregar
                </button>
              </form>
            </div>
          </section>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-brand-navy">
            Facturación (órdenes / valorizaciones)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-surface">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
                <tr>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">OC</th>
                  <th className="px-3 py-2 text-right">Monto neto</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {project.invoices.map((inv) => {
                  const status = invoiceStatus(inv);
                  const total = Number(inv.amountNet) + Number(inv.igvAmount);
                  return (
                    <tr key={inv.id} className="border-t border-brand-border">
                      <td className="px-3 py-2 text-brand-navy">
                        {inv.description}
                        {inv.quoteCode && (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-brand-muted">
                            {inv.quoteCode}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">
                        {inv.purchaseOrderNumber ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        S/. {formatSoles(Number(inv.amountNet))}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        S/. {formatSoles(total)}
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
                {project.invoices.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-sm text-brand-muted"
                    >
                      Aún no hay facturas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <form
              action={addInvoice}
              className="flex flex-wrap items-center gap-2 border-t border-brand-border p-3"
            >
              <input
                type="text"
                name="description"
                placeholder="Descripción (ej. Valorización 1)"
                required
                className="min-w-[10rem] flex-1 rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <input
                type="text"
                name="purchaseOrderNumber"
                placeholder="N° OC"
                className="w-32 shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <input
                type="text"
                name="quoteCode"
                placeholder="N° cotización"
                className="w-36 shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                name="amountNet"
                placeholder="Monto neto"
                required
                className="w-28 shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="shrink-0 rounded bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy"
              >
                Agregar
              </button>
            </form>
            <p className="border-t border-brand-border px-3 py-2 text-xs text-brand-muted">
              Después de agregar, editá cada fila para completar HES,
              detracción, fecha de pago, etc.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
      <p className="text-xs uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-brand-navy">{value}</p>
    </div>
  );
}

function MoneyStat({
  label,
  value,
  highlight,
  big,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  big?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p
        className={
          big
            ? "mt-1 text-2xl font-bold text-brand-navy"
            : highlight
              ? "mt-1 text-base font-semibold text-brand-navy"
              : "mt-1 text-sm text-brand-navy"
        }
      >
        S/. {formatSoles(value)}
      </p>
    </div>
  );
}
