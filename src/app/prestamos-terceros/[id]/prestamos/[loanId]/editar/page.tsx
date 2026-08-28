import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { LoanForm } from "../../../../LoanForm";
import { updateLoanAction } from "../../../../actions";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function EditarPrestamoTerceroPage({
  params,
}: {
  params: Promise<{ id: string; loanId: string }>;
}) {
  const { id: lenderId, loanId } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const [loan, users] = await Promise.all([
    prisma.loan.findUnique({
      where: { id: loanId, lenderId },
      include: { lender: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!loan) notFound();

  const updateLoan = updateLoanAction.bind(null, lenderId, loan.id);

  // Préstamos de antes de este cambio pueden tener un interestAmount fijo
  // sin ninguna tasa guardada — se calcula la tasa equivalente para que el
  // campo quede precargado y, de ahí en más, la tasa sea la fuente de verdad.
  const amountNum = Number(loan.amount);
  const impliedRate =
    loan.interestRate != null
      ? Number(loan.interestRate)
      : loan.interestAmount && amountNum > 0
        ? Math.round((Number(loan.interestAmount) / amountNum) * 100 * 1000) / 1000
        : undefined;

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos-terceros"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a
            href={`/prestamos-terceros/${lenderId}/prestamos/${loan.id}`}
            className="text-sm text-brand-blue hover:underline"
          >
            ← {loan.lender?.name}
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Editar préstamo
          </h1>
        </header>

        <LoanForm
          action={updateLoan}
          users={users}
          cancelHref={`/prestamos-terceros/${lenderId}/prestamos/${loan.id}`}
          submitLabel="Guardar cambios"
          defaults={{
            borrowerUserId: loan.borrowerUserId ?? "",
            amount: amountNum,
            currency: loan.currency,
            interestRate: impliedRate,
            bankCommission: loan.bankCommission ? Number(loan.bankCommission) : undefined,
            loanDate: toDateInputValue(loan.loanDate),
            dueDate: toDateInputValue(loan.dueDate),
            notes: loan.notes ?? "",
          }}
        />
      </div>
    </AppShell>
  );
}
