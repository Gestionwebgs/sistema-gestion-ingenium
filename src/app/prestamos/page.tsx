import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus } from "lucide-react";
import { toggleLoanStatusAction } from "./actions";

const formatAmount = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : "S/."} ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

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

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
      activeNav="prestamos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">
              {isOwner ? "Préstamos" : "Mis préstamos"}
            </h1>
            <p className="text-sm text-brand-muted">
              {isOwner
                ? "Dinero prestado por terceros para financiar la operación."
                : "Préstamos registrados a tu nombre."}
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
        </header>

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
      </div>
    </AppShell>
  );
}
