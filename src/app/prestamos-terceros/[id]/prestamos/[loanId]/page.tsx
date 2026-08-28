import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import {
  toggleLoanStatusAction,
  createLoanPaymentAction,
  deleteLoanPaymentAction,
} from "../../../actions";

const formatAmount = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : "S/."} ${value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

export default async function PrestamoTerceroDetailPage({
  params,
}: {
  params: Promise<{ id: string; loanId: string }>;
}) {
  const { id: lenderId, loanId } = await params;
  const session = await auth();
  const isOwner = session!.user.role === "OWNER";

  const loan = await prisma.loan.findUnique({
    where: isOwner
      ? { id: loanId, lenderId }
      : { id: loanId, lenderId, borrowerUserId: session!.user.id },
    include: {
      lender: true,
      borrowerUser: true,
      payments: { orderBy: { date: "asc" } },
    },
  });
  if (!loan || !loan.lender) notFound();

  const amount = Number(loan.amount);
  // Préstamos de antes de que existiera `interestRate` solo tienen el
  // interés como monto fijo — se infiere la tasa equivalente para poder
  // mostrarla igual (mismo cálculo que en la página de editar).
  const impliedRate =
    loan.interestRate != null
      ? Number(loan.interestRate)
      : loan.interestAmount && amount > 0
        ? Math.round((Number(loan.interestAmount) / amount) * 100 * 1000) / 1000
        : null;
  // El interés y la comisión solo se suman al total a pagar cuando están en
  // la misma moneda que el préstamo (si alguna vez quedan en otra moneda,
  // por ejemplo de un préstamo viejo, se ignoran acá para no mezclar
  // monedas distintas en una sola suma).
  const interestInSameCurrency =
    loan.interestAmount && loan.interestCurrency === loan.currency
      ? Number(loan.interestAmount)
      : 0;
  const commissionInSameCurrency =
    loan.bankCommission && loan.bankCommissionCurrency === loan.currency
      ? Number(loan.bankCommission)
      : 0;
  const totalToPay = amount + interestInSameCurrency + commissionInSameCurrency;

  const paidInSameCurrency = loan.payments.filter(
    (p) => p.currency === loan.currency
  );
  const totalPaid = paidInSameCurrency.reduce((s, p) => s + Number(p.amount), 0);
  const balance = totalToPay - totalPaid;

  const otherCurrencyPayments = loan.payments.filter(
    (p) => p.currency !== loan.currency
  );

  const toggleStatus = toggleLoanStatusAction.bind(null, lenderId, loan.id);
  const addPayment = createLoanPaymentAction.bind(null, lenderId, loan.id);

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
              href={`/prestamos-terceros/${lenderId}`}
              className="text-sm text-brand-blue hover:underline"
            >
              ← {loan.lender.name}
            </a>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              Préstamo del {formatDate(loan.loanDate)}
            </h1>
            <p className="text-sm text-brand-muted">
              {loan.borrowerUser ? `Contacto: ${loan.borrowerUser.name}` : "Empresa (general)"}
            </p>
          </div>
          {isOwner && (
            <div className="flex shrink-0 gap-2">
              <a
                href={`/prestamos-terceros/${lenderId}/prestamos/${loan.id}/editar`}
                className="rounded-md border border-brand-border px-3 py-1.5 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
              >
                Editar
              </a>
              <form action={toggleStatus}>
                <button
                  type="submit"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium uppercase tracking-wide transition ${
                    loan.status === "PENDIENTE"
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {loan.status}
                </button>
              </form>
            </div>
          )}
        </header>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <InfoCard label="Fecha del préstamo" value={formatDate(loan.loanDate)} />
          <InfoCard
            label="Fecha de pago"
            value={loan.dueDate ? formatDate(loan.dueDate) : "—"}
          />
          <InfoCard
            label="Porcentaje calculado"
            value={impliedRate != null ? `${impliedRate}%` : "—"}
          />
          <InfoCard
            label="Interés"
            value={
              loan.interestAmount
                ? formatAmount(Number(loan.interestAmount), loan.interestCurrency ?? "PEN")
                : "—"
            }
          />
          <InfoCard
            label="Comisión del banco"
            value={
              loan.bankCommission
                ? formatAmount(Number(loan.bankCommission), loan.bankCommissionCurrency ?? "PEN")
                : "—"
            }
          />
        </div>

        <div className="mb-8 rounded-lg border border-brand-border bg-brand-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-brand-navy">
            Control del préstamo
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MoneyStat
              label="Monto prestado"
              value={formatAmount(amount, loan.currency)}
            />
            <MoneyStat
              label="Total a pagar"
              value={formatAmount(totalToPay, loan.currency)}
              highlight
            />
            <MoneyStat
              label="Total abonado"
              value={formatAmount(totalPaid, loan.currency)}
            />
            <MoneyStat
              label="Saldo pendiente"
              value={formatAmount(Math.max(balance, 0), loan.currency)}
              highlight
              warn={balance > 0.01}
            />
          </div>
          {(loan.interestAmount && loan.interestCurrency !== loan.currency) ||
          (loan.bankCommission && loan.bankCommissionCurrency !== loan.currency) ? (
            <p className="mt-3 text-xs text-brand-muted">
              El interés y/o la comisión están en una moneda distinta al
              monto prestado — no se sumaron al total a pagar de arriba.
            </p>
          ) : null}
          {loan.notes && (
            <p className="mt-4 border-t border-brand-border pt-4 text-sm text-brand-muted">
              {loan.notes}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-brand-border bg-brand-surface">
          <h2 className="border-b border-brand-border px-5 py-3 text-sm font-semibold text-brand-navy">
            Registro de abonos
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Notas</th>
                <th className="px-3 py-2 text-right">Monto</th>
                {isOwner && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {loan.payments.map((payment) => (
                <tr key={payment.id} className="border-t border-brand-border">
                  <td className="px-3 py-2 text-brand-muted">
                    {formatDate(payment.date)}
                  </td>
                  <td className="px-3 py-2 text-brand-navy">
                    {payment.notes ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-brand-navy">
                    {formatAmount(Number(payment.amount), payment.currency)}
                  </td>
                  {isOwner && (
                    <td className="px-3 py-2 text-right">
                      <form
                        action={async () => {
                          "use server";
                          await deleteLoanPaymentAction(
                            lenderId,
                            loan.id,
                            payment.id
                          );
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
              {loan.payments.length === 0 && (
                <tr>
                  <td
                    colSpan={isOwner ? 4 : 3}
                    className="px-3 py-6 text-center text-sm text-brand-muted"
                  >
                    Aún no hay abonos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {isOwner && (
            <form
              action={addPayment}
              className="flex flex-wrap items-center gap-2 border-t border-brand-border p-3"
            >
              <input
                type="date"
                name="date"
                required
                className="w-[9.5rem] shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                name="amount"
                placeholder="Monto"
                required
                className="w-28 shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <select
                name="currency"
                defaultValue={loan.currency}
                className="shrink-0 rounded border border-brand-border px-2 py-1.5 text-xs"
              >
                <option value="PEN">S/.</option>
                <option value="USD">$</option>
              </select>
              <input
                type="text"
                name="notes"
                placeholder="Notas (opcional)"
                className="min-w-[8rem] flex-1 rounded border border-brand-border px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="shrink-0 rounded-md bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-navy"
              >
                Agregar abono
              </button>
            </form>
          )}

          {otherCurrencyPayments.length > 0 && (
            <p className="border-t border-brand-border px-5 py-3 text-xs text-brand-muted">
              También hay {otherCurrencyPayments.length} abono
              {otherCurrencyPayments.length === 1 ? "" : "s"} en{" "}
              {otherCurrencyPayments[0].currency === "USD" ? "dólares" : "soles"}{" "}
              (no se descuentan del saldo de arriba, que está en{" "}
              {loan.currency === "USD" ? "dólares" : "soles"}).
            </p>
          )}
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
      <p className="mt-1 text-sm font-semibold text-brand-navy">{value}</p>
    </div>
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
