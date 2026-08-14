import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PendingExpensesGroup } from "./PendingExpensesGroup";

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

export default async function ReembolsosPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const personalExpenses = await prisma.expense.findMany({
    where: { paymentSource: "PERSONAL", paidByUserId: { not: null } },
    include: {
      reimbursementItems: true,
      paidByUser: true,
      project: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const groups = new Map<
    string,
    {
      userName: string;
      expenses: {
        id: string;
        date: string;
        description: string;
        pending: number;
        projectName: string | null;
      }[];
    }
  >();

  for (const expense of personalExpenses) {
    const applied = expense.reimbursementItems.reduce(
      (sum, item) => sum + Number(item.amountApplied),
      0
    );
    const pending = Number(expense.amount) - applied;
    if (pending <= 0.01 || !expense.paidByUserId || !expense.paidByUser) continue;

    if (!groups.has(expense.paidByUserId)) {
      groups.set(expense.paidByUserId, {
        userName: expense.paidByUser.name,
        expenses: [],
      });
    }
    groups.get(expense.paidByUserId)!.expenses.push({
      id: expense.id,
      date: formatDate(expense.date),
      description: expense.description,
      pending,
      projectName: expense.project?.name ?? null,
    });
  }

  const recentReimbursements = await prisma.reimbursement.findMany({
    orderBy: { date: "desc" },
    take: 10,
    include: { paidToUser: true },
  });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="reembolsos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Reembolsos</h1>
          <p className="text-sm text-brand-muted">
            Gastos pagados con dinero personal, pendientes de devolver.
          </p>
        </header>

        <div className="space-y-4">
          {groups.size === 0 && (
            <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-muted">
              No hay gastos personales pendientes de reembolso.
            </div>
          )}
          {Array.from(groups.entries()).map(([userId, group]) => (
            <PendingExpensesGroup
              key={userId}
              userId={userId}
              userName={group.userName}
              expenses={group.expenses}
            />
          ))}
        </div>

        {recentReimbursements.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-semibold text-brand-navy">
              Reembolsos recientes
            </h2>
            <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
              {recentReimbursements.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between border-b border-brand-border px-4 py-3 text-sm last:border-b-0"
                >
                  <div>
                    <p className="font-medium text-brand-navy">
                      {r.paidToUser.name}
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
