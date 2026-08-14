import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { addExpenseAction, addIncomeAction } from "./actions";

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

export default async function ProyectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      clientContact: true,
      businessLine: true,
      expenses: { orderBy: { date: "asc" } },
      incomes: { orderBy: { date: "asc" } },
    },
  });

  if (!project) notFound();

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

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6">
          <a
            href="/"
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
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase text-brand-muted">
                          {expense.paymentSource === "PERSONAL"
                            ? expense.paidByName || "Personal"
                            : "Empresa"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        S/. {formatSoles(Number(expense.amount))}
                      </td>
                    </tr>
                  ))}
                  {project.expenses.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
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
                <select
                  name="paymentSource"
                  className="shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
                >
                  <option value="EMPRESA">Empresa</option>
                  <option value="PERSONAL">Personal</option>
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
