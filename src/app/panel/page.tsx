import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { GastosPorProyectoChart, GananciaPorProyectoChart } from "./PanelCharts";

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function computeProjectGanancia(project: {
  orderAmountNoIgv: unknown;
  igvAmount: unknown;
  monthlyTaxPercent: unknown;
  annualRentPercent: unknown;
  expenses: { amount: unknown }[];
}) {
  const orderAmountNoIgv = Number(project.orderAmountNoIgv);
  const igvAmount = Number(project.igvAmount);
  const montoTotal = orderAmountNoIgv + igvAmount;
  const impuestoMensual = montoTotal * Number(project.monthlyTaxPercent);
  const rentaAnual = montoTotal * Number(project.annualRentPercent);
  const saldoPositivo = orderAmountNoIgv - impuestoMensual - rentaAnual;
  const totalGastos = project.expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );
  return { saldoPositivo, totalGastos, ganancia: saldoPositivo - totalGastos };
}

export default async function PanelPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const [projects, generalExpenses, generalIncomes, personalExpenses, loans] =
    await Promise.all([
      prisma.project.findMany({
        include: { expenses: true, businessLine: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.expense.aggregate({
        where: { projectId: null },
        _sum: { amount: true },
      }),
      prisma.income.aggregate({
        where: { projectId: null },
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        where: { paymentSource: "PERSONAL", paidByUserId: { not: null } },
        include: { reimbursementItems: true },
      }),
      prisma.loan.findMany({ where: { status: "PENDIENTE" } }),
    ]);

  const projectStats = projects.map((p) => ({
    id: p.id,
    name: p.name,
    businessLine: p.businessLine.name,
    ...computeProjectGanancia(p),
  }));

  const totalGananciaProyectos = projectStats.reduce(
    (sum, p) => sum + p.ganancia,
    0
  );
  const totalGastosProyectos = projectStats.reduce(
    (sum, p) => sum + p.totalGastos,
    0
  );
  const totalGastosGenerales = Number(generalExpenses._sum.amount ?? 0);
  const totalAbonosGenerales = Number(generalIncomes._sum.amount ?? 0);

  const totalPendienteReembolso = personalExpenses.reduce((sum, expense) => {
    const applied = expense.reimbursementItems.reduce(
      (s, item) => s + Number(item.amountApplied),
      0
    );
    const pending = Number(expense.amount) - applied;
    return sum + (pending > 0.01 ? pending : 0);
  }, 0);

  const loansByCurrency = loans.reduce<Record<string, number>>((acc, loan) => {
    acc[loan.currency] = (acc[loan.currency] ?? 0) + Number(loan.amount);
    return acc;
  }, {});

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="panel"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Panel general</h1>
          <p className="text-sm text-brand-muted">
            Vista consolidada de toda la empresa.
          </p>
        </header>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Ganancia (todos los proyectos)"
            value={`S/. ${formatSoles(totalGananciaProyectos)}`}
            big
          />
          <StatCard
            label="Gastos en proyectos"
            value={`S/. ${formatSoles(totalGastosProyectos)}`}
          />
          <StatCard
            label="Gastos generales"
            value={`S/. ${formatSoles(totalGastosGenerales)}`}
          />
          <StatCard
            label="Abonos generales"
            value={`S/. ${formatSoles(totalAbonosGenerales)}`}
          />
          <StatCard
            label="Pendiente de reembolso"
            value={`S/. ${formatSoles(totalPendienteReembolso)}`}
            warn={totalPendienteReembolso > 0}
          />
          <StatCard
            label="Préstamos pendientes"
            value={
              Object.keys(loansByCurrency).length === 0
                ? "S/. 0.00"
                : Object.entries(loansByCurrency)
                    .map(
                      ([currency, amount]) =>
                        `${currency === "USD" ? "$" : "S/."} ${formatSoles(amount)}`
                    )
                    .join(" + ")
            }
            warn={loans.length > 0}
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-brand-navy">
              Gastos por proyecto
            </h2>
            <GastosPorProyectoChart
              data={[
                ...projectStats
                  .filter((p) => p.totalGastos > 0)
                  .map((p) => ({ name: p.name, value: p.totalGastos })),
                ...(totalGastosGenerales > 0
                  ? [{ name: "Generales", value: totalGastosGenerales }]
                  : []),
              ]}
            />
          </div>
          <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
            <h2 className="mb-2 text-sm font-semibold text-brand-navy">
              Ganancia por proyecto
            </h2>
            <GananciaPorProyectoChart
              data={projectStats.map((p) => ({
                name: p.name,
                ganancia: p.ganancia,
              }))}
            />
          </div>
        </div>

        <h2 className="mb-3 text-sm font-semibold text-brand-navy">
          Detalle por proyecto
        </h2>
        <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
          {projectStats.map((p) => (
            <a
              key={p.id}
              href={`/proyectos/${p.id}`}
              className="flex items-center justify-between border-b border-brand-border px-4 py-3 text-sm transition last:border-b-0 hover:bg-gray-50"
            >
              <div>
                <p className="font-medium text-brand-navy">{p.name}</p>
                <p className="text-xs text-brand-muted">{p.businessLine}</p>
              </div>
              <span
                className={`font-semibold ${p.ganancia >= 0 ? "text-brand-navy" : "text-red-600"}`}
              >
                S/. {formatSoles(p.ganancia)}
              </span>
            </a>
          ))}
          {projectStats.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-brand-muted">
              No hay proyectos todavía.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  big,
  warn,
}: {
  label: string;
  value: string;
  big?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
      <p className="text-xs uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-bold ${big ? "text-xl" : "text-base"} ${
          warn ? "text-amber-600" : "text-brand-navy"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
