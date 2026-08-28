import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { ImportInvoicesForm } from "./ImportInvoicesForm";

export default async function ImportarFacturacionPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/facturacion");

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="facturacion"
    >
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <header className="mb-6">
          <a href="/facturacion" className="text-sm text-brand-blue hover:underline">
            ← Facturación
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Importar facturación desde Excel
          </h1>
          <p className="text-sm text-brand-muted">
            Sube la &quot;Relación de Órdenes&quot;. Ninguna fila queda
            asignada a un proyecto automáticamente — después de importar,
            editá cada una para elegir su proyecto. Nada se guarda hasta
            que confirmes.
          </p>
        </header>

        <ImportInvoicesForm />
      </div>
    </AppShell>
  );
}
