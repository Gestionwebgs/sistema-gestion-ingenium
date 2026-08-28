import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus, ChevronRight } from "lucide-react";

const formatAmount = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : "S/."} ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default async function PrestamosTercerosPage() {
  const session = await auth();
  const isOwner = session!.user.role === "OWNER";

  // Vista por prestamista: cada uno puede tener varios préstamos a lo largo
  // del tiempo (ver modelo Lender) — acá se muestra una sola fila por
  // prestamista con el saldo total pendiente, en vez de una fila por
  // préstamo individual.
  const lenders = await prisma.lender.findMany({
    where: isOwner
      ? {}
      : { loans: { some: { borrowerUserId: session!.user.id } } },
    include: {
      loans: {
        where: isOwner ? {} : { borrowerUserId: session!.user.id },
        include: { payments: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const lenderSummaries = lenders
    .map((lender) => {
      const balanceByCurrency: Record<string, number> = {};
      for (const loan of lender.loans) {
        const paid = loan.payments
          .filter((p) => p.currency === loan.currency)
          .reduce((sum, p) => sum + Number(p.amount), 0);
        // Mismo criterio que en la ficha del préstamo: el interés y la
        // comisión solo suman al total a pagar si están en la misma moneda
        // que el préstamo.
        const interest =
          loan.interestAmount && loan.interestCurrency === loan.currency
            ? Number(loan.interestAmount)
            : 0;
        const commission =
          loan.bankCommission && loan.bankCommissionCurrency === loan.currency
            ? Number(loan.bankCommission)
            : 0;
        const balance = Math.max(
          Number(loan.amount) + interest + commission - paid,
          0
        );
        if (balance > 0.01) {
          balanceByCurrency[loan.currency] =
            (balanceByCurrency[loan.currency] ?? 0) + balance;
        }
      }
      return {
        id: lender.id,
        name: lender.name,
        loanCount: lender.loans.length,
        pendingCount: lender.loans.filter((l) => l.status === "PENDIENTE")
          .length,
        balanceByCurrency,
      };
    })
    .filter((l) => l.loanCount > 0 || isOwner);

  // Préstamos que quedaron sin prestamista asignado (de antes de este
  // cambio) — no debería pasar después de correr
  // prisma/backfill-lenders.ts, pero se avisa igual para que no
  // "desaparezca" ningún préstamo viejo.
  const orphanLoansCount = isOwner
    ? await prisma.loan.count({ where: { lenderId: null } })
    : 0;

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
      activeNav="prestamos-terceros"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">
              {isOwner ? "Préstamos de terceros" : "Mis préstamos"}
            </h1>
            <p className="text-sm text-brand-muted">
              Prestamistas que financian la operación. Cada uno puede tener
              varios préstamos — acá se ve su saldo total pendiente.
            </p>
          </div>
          {isOwner && (
            <a
              href="/prestamos-terceros/nuevo"
              className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo prestamista
            </a>
          )}
        </header>

        {lenderSummaries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-muted">
            No hay prestamistas registrados.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
            {lenderSummaries.map((lender) => {
              const currencies = Object.entries(lender.balanceByCurrency);
              return (
                <a
                  key={lender.id}
                  href={`/prestamos-terceros/${lender.id}`}
                  className="flex items-center justify-between gap-3 border-b border-brand-border px-4 py-3 text-sm transition last:border-b-0 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-navy">
                      {lender.name}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {lender.loanCount} préstamo
                      {lender.loanCount === 1 ? "" : "s"}
                      {lender.pendingCount > 0
                        ? ` · ${lender.pendingCount} pendiente${
                            lender.pendingCount === 1 ? "" : "s"
                          }`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      {currencies.length === 0 ? (
                        <p className="text-xs text-brand-muted">
                          Sin saldo pendiente
                        </p>
                      ) : (
                        currencies.map(([currency, balance]) => (
                          <p
                            key={currency}
                            className="font-semibold text-brand-navy"
                          >
                            saldo {formatAmount(balance, currency)}
                          </p>
                        ))
                      )}
                    </div>
                    <ChevronRight
                      className="h-4 w-4 text-brand-muted"
                      strokeWidth={1.75}
                    />
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {orphanLoansCount > 0 && (
          <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            Hay {orphanLoansCount} préstamo
            {orphanLoansCount === 1 ? "" : "s"} de antes de este cambio sin
            prestamista asignado todavía. Corré{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5">
              npx tsx prisma/backfill-lenders.ts
            </code>{" "}
            una vez para asignarles uno automáticamente (no borra nada).
          </div>
        )}
      </div>
    </AppShell>
  );
}
