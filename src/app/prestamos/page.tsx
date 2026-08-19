import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PendingExpensesGroup } from "./PendingExpensesGroup";

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

export default async function PrestamosPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  // Préstamos de personal: dinero que alguien del equipo adelantó de su
  // bolsillo para un gasto de la empresa/proyecto, pendiente de devolver.
  // Se agrupa por usuario si tiene cuenta, o por nombre si se registró a
  // mano (ej. un capataz de obra sin cuenta en el sistema).
  const personalExpenses = await prisma.expense.findMany({
    where: { paymentSource: "PERSONAL" },
    include: {
      reimbursementItems: true,
      paidByUser: true,
      project: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  type Group = {
    key: string;
    paidToUserId: string | null;
    paidToName: string;
    expenses: {
      id: string;
      date: string;
      description: string;
      pending: number;
      projectName: string | null;
    }[];
  };

  const groupMap = new Map<string, Group>();

  for (const expense of personalExpenses) {
    const applied = expense.reimbursementItems.reduce(
      (sum, item) => sum + Number(item.amountApplied),
      0
    );
    const pending = Number(expense.amount) - applied;
    const name = expense.paidByName ?? expense.paidByUser?.name;
    if (pending <= 0.01 || !name) continue;

    const key = expense.paidByUserId ?? `name:${name}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        paidToUserId: expense.paidByUserId,
        paidToName: name,
        expenses: [],
      });
    }
    groupMap.get(key)!.expenses.push({
      id: expense.id,
      date: formatDate(expense.date),
      description: expense.description,
      pending,
      projectName: expense.project?.name ?? null,
    });
  }

  const personalGroups = Array.from(groupMap.values());

  const recentReimbursements = await prisma.reimbursement.findMany({
    orderBy: { date: "desc" },
    take: 10,
    include: { paidToUser: true },
  });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Préstamos</h1>
          <p className="text-sm text-brand-muted">
            Gastos pagados con dinero propio del equipo, pendientes de
            devolver.
          </p>
        </header>

        <div className="space-y-4">
          {personalGroups.length === 0 && (
            <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-10 text-center text-sm text-brand-muted">
              No hay préstamos de personal pendientes.
            </div>
          )}
          {personalGroups.map((group) => (
            <PendingExpensesGroup
              key={group.key}
              paidToUserId={group.paidToUserId}
              paidToName={group.paidToName}
              expenses={group.expenses}
            />
          ))}
        </div>

        {recentReimbursements.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Pagos recientes
            </h3>
            <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
              {recentReimbursements.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-brand-border px-4 py-3 text-sm last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-brand-navy">
                      {r.paidToUser?.name ?? r.paidToName}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {formatDate(r.date)}
                      {r.description ? ` · ${r.description}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-brand-navy">
                    S/. {formatSoles(Number(r.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
