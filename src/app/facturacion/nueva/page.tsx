import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { InvoiceForm } from "../InvoiceForm";
import { createInvoiceAction } from "../actions";

export default async function NuevaFacturaPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/facturacion");

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="facturacion"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a
            href="/facturacion"
            className="text-sm text-brand-blue hover:underline"
          >
            ← Facturación
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Nueva factura
          </h1>
        </header>

        <InvoiceForm
          action={createInvoiceAction}
          projects={projects}
          cancelHref="/facturacion"
          submitLabel="Registrar factura"
        />
      </div>
    </AppShell>
  );
}
