import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus } from "lucide-react";

const formatAmount = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : "S/."} ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

// Ficha del prestamista: "una sola relación" de todos sus préstamos, todos
// los abonos hechos (de cualquiera de sus préstamos) y el saldo total
// pendiente por moneda.
export default async function PrestamistaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const isOwner = session!.user.role === "OWNER";

  const lender = await prisma.lender.findUnique({
    where: { id },
    include: {
      loans: {
        where: isOwner ? {} : { borrowerUserId: session!.user.id },
        include: { payments: true, borrowerUser: true },
        orderBy: { loanDate: "desc" },
      },
    },
  });
  if (!lender) notFound();
  if (!isOwner && lender.loans.length === 0) notFound();

  // El interés y la comisión solo cuentan para el total a pagar cuando
  // están en la misma moneda que el préstamo — igual criterio que en la
  // ficha de cada préstamo individual.
  function totalToPay(loan: NonNullable<typeof lender>["loans"][number]) {
    const interest =
      loan.interestAmount && loan.interestCurrency === loan.currency
        ? Number(loan.interestAmount)
        : 0;
    const commission =
      loan.bankCommission && loan.bankCommissionCurrency === loan.currency
        ? Number(loan.bankCommission)
        : 0;
    return Number(loan.amount) + interest + commission;
  }

  const totalsByCurrency: Record<
    string,
    { amount: number; toPay: number; paid: number; balance: number }
  > = {};
  for (const loan of lender.loans) {
    const paid = loan.payments
      .filter((p) => p.currency === loan.currency)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const loanToPay = totalToPay(loan);
    const balance = loanToPay - paid;
    if (!totalsByCurrency[loan.currency]) {
      totalsByCurrency[loan.currency] = { amount: 0, toPay: 0, paid: 0, balance: 0 };
    }
    totalsByCurrency[loan.currency].amount += Number(loan.amount);
    totalsByCurrency[loan.currency].toPay += loanToPay;
    totalsByCurrency[loan.currency].paid += paid;
    totalsByCurrency[loan.currency].balance += balance;
  }

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
      activeNav="prestamos-terceros"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a
              href="/prestamos-terceros"
              className="text-sm text-brand-blue hover:underline"
            >
              ← Préstamos de terceros
            </a>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              {lender.name}
            </h1>
            {(lender.phone || lender.notes) && (
              <p className="text-sm text-brand-muted">
                {lender.phone}
                {lender.phone && lender.notes ? " · " : ""}
                {lender.notes}
              </p>
            )}
          </div>
          {isOwner && (
            <a
              href={`/prestamos-terceros/${lender.id}/prestamos/nuevo`}
              className="flex shrink-0 items-center gap-2 rounded-md bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo préstamo
            </a>
          )}
        </header>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Object.entries(totalsByCurrency).map(([currency, totals]) => (
            <div
              key={currency}
              className="rounded-lg border border-brand-border bg-brand-surface p-5"
            >
              <h2 className="mb-4 text-sm font-semibold text-brand-navy">
                Total en {currency === "USD" ? "dólares" : "soles"}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <MoneyStat
                  label="Prestado"
                  value={formatAmount(totals.amount, currency)}
                />
                <MoneyStat
                  label="Total a pagar"
                  value={formatAmount(totals.toPay, currency)}
                />
                <MoneyStat
                  label="Abonado"
                  value={formatAmount(totals.paid, currency)}
                />
                <MoneyStat
                  label="Saldo pendiente"
                  value={formatAmount(Math.max(totals.balance, 0), currency)}
                  highlight
                  warn={totals.balance > 0.01}
                />
              </div>
            </div>
          ))}
          {Object.keys(totalsByCurrency).length === 0 && (
            <p className="text-sm text-brand-muted">
              Todavía no tiene préstamos.
            </p>
          )}
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-brand-navy">
            Préstamos
          </h2>
          <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">A nombre de</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th className="px-3 py-2 text-right">Saldo</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {lender.loans.map((loan) => {
                  const paid = loan.payments
                    .filter((p) => p.currency === loan.currency)
                    .reduce((sum, p) => sum + Number(p.amount), 0);
                  const balance = totalToPay(loan) - paid;
                  return (
                    <tr key={loan.id} className="border-t border-brand-border">
                      <td className="px-3 py-2 text-brand-muted">
                        {formatDate(loan.loanDate)}
                      </td>
                      <td className="px-3 py-2 text-brand-muted">
                        {loan.borrowerUser?.name ?? "Empresa (general)"}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        {formatAmount(Number(loan.amount), loan.currency)}
                      </td>
                      <td className="px-3 py-2 text-right text-brand-navy">
                        {formatAmount(Math.max(balance, 0), loan.currency)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                            loan.status === "PENDIENTE"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={`/prestamos-terceros/${lender.id}/prestamos/${loan.id}`}
                          className="text-xs text-brand-blue hover:underline"
                        >
                          Ver
                        </a>
                      </td>
                    </tr>
                  );
                })}
                {lender.loans.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-sm text-brand-muted"
                    >
                      Aún no hay préstamos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MoneyStat({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-brand-muted">
        {label}
      </p>
      <p
        className={`mt-1 font-bold ${highlight ? "text-lg" : "text-sm"} ${
          warn ? "text-amber-600" : "text-brand-navy"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
