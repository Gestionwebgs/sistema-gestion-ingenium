import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { LoanForm } from "../LoanForm";
import { createLoanAction } from "../actions";

export default async function NuevoPrestamoTerceroPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos-terceros"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Nuevo préstamo</h1>
          <p className="text-sm text-brand-muted">
            Dinero prestado por un tercero para financiar la operación.
          </p>
        </header>

        <LoanForm
          action={createLoanAction}
          users={users}
          cancelHref="/prestamos-terceros"
          submitLabel="Crear préstamo"
        />
      </div>
    </AppShell>
  );
}
