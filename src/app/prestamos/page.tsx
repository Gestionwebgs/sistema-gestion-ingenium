import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus } from "lucide-react";
import { toggleLoanStatusAction } from "./actions";
import { PendingExpensesGroup } from "./PendingExpensesGroup";

const formatAmount = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : "S/."} ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

export default async function PrestamosPage() {
  const session = await auth();
  const isOwner = session!.user.role === "OWNER";

  const loans = await prisma.loan.findMany({
    where: isOwner ? {} : { borrowerUserId: session!.user.id },
    include: { borrowerUser: true },
    orderBy: { loanDate: "desc" },
  });

  // Préstamos de personal: dinero que alguien del equipo adelantó de su
  // bolsillo para un gasto de la empresa/proyecto, pendiente de devolver.
  // Se agrupa por usuario si tiene cuenta, o por nombre si se registró a
  // mano (ej. un capataz de obra sin cuenta en el sistema).
  let personalGroups: {
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
  }[] = [];
  let recentReimbursements: {
    id: string;
    date: Date;
    amount: unknown;
    description: string | null;
    paidToName: string;
    paidToUser: { name: string } | null;
  }[] = [];

  if (isOwner) {
    const personalExpenses = await prisma.expense.findMany({
      where: { paymentSource: "PERSONAL" },
      include: {
        reimbursementItems: true,
        paidByUser: true,
        project: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    const groupMap = new Map<string, (typeof personalGroups)[number]>();

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

    personalGroups = Array.from(groupMap.values());

    recentReimbursements = await prisma.reimbursement.findMany({
      orderBy: { date: "desc" },
      take: 10,
      include: { paidToUser: true },
    });
  }

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
      activeNav="prestamos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">
            {isOwner ? "Préstamos" : "Mis préstamos"}
          </h1>
          <p className="text-sm text-brand-muted">
            {isOwner
              ? "Dinero que la empresa debe: al personal que adelanta gastos de su bolsillo, y a terceros que financian la operación."
              : "Préstamos de terceros registrados a tu nombre."}
          </p>
        </header>

        {isOwner && (
          <section className="mb-10">
            <h2 className="mb-1 text-sm font-semibold text-brand-navy">
              Préstamos de personal
            </h2>
            <p className="mb-3 text-xs text-brand-muted">
              Gastos pagados con dinero propio del equipo, pendientes de
              devolver.
            </p>

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
          </section>
        )}

        <section>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-brand-navy">
                Préstamos de terceros
              </h2>
              <p className="text-xs text-brand-muted">
                Dinero prestado por terceros para financiar la operación.
              </p>
            </div>
            {isOwner && (
              <a
                href="/prestamos/nuevo"
                className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Nuevo préstamo
              </a>
            )}
          </div>

          {loans.length === 0 ? (
            <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-muted">
              No hay préstamos registrados.
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="flex flex-col gap-2 border-b border-brand-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-brand-navy">
                      {loan.lenderName}
                      {loan.borrowerUser && (
                        <span className="ml-2 text-xs font-normal text-brand-muted">
                          → {loan.borrowerUser.name}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {formatDate(loan.loanDate)}
                      {loan.dueDate ? ` · vence ${formatDate(loan.dueDate)}` : ""}
                      {loan.interestAmount
                        ? ` · interés ${formatAmount(Number(loan.interestAmount), loan.interestCurrency ?? "PEN")}`
                        : ""}
                      {loan.bankCommission
                        ? ` · comisión banco ${formatAmount(Number(loan.bankCommission), loan.bankCommissionCurrency ?? "PEN")}`
                        : ""}
                    </p>
                    {loan.notes && (
                      <p className="text-xs text-brand-muted">{loan.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-brand-navy">
                      {formatAmount(Number(loan.amount), loan.currency)}
                    </span>
                    {isOwner ? (
                      <form
                        action={async () => {
                          "use server";
                          await toggleLoanStatusAction(loan.id);
                        }}
                      >
                        <button
                          type="submit"
                          className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                            loan.status === "PENDIENTE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {loan.status}
                        </button>
                      </form>
                    ) : (
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                          loan.status === "PENDIENTE"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {loan.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
