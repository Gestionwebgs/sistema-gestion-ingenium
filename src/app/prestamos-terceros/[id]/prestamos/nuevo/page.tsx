import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { LoanForm } from "../../../LoanForm";
import { createLoanAction } from "../../../actions";

export default async function NuevoPrestamoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: lenderId } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const [lender, users] = await Promise.all([
    prisma.lender.findUnique({ where: { id: lenderId } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!lender) notFound();

  const createLoan = createLoanAction.bind(null, lenderId);

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos-terceros"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a
            href={`/prestamos-terceros/${lenderId}`}
            className="text-sm text-brand-blue hover:underline"
          >
            ← {lender.name}
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Nuevo préstamo de {lender.name}
          </h1>
        </header>

        <LoanForm
          action={createLoan}
          users={users}
          cancelHref={`/prestamos-terceros/${lenderId}`}
          submitLabel="Crear préstamo"
        />
      </div>
    </AppShell>
  );
}
