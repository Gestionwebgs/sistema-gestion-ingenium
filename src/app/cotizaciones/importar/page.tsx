import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { ImportQuotesForm } from "./ImportQuotesForm";

export default async function ImportarCotizacionesPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/cotizaciones");

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="cotizaciones"
    >
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <header className="mb-6">
          <a href="/cotizaciones" className="text-sm text-brand-blue hover:underline">
            ← Cotizaciones
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Importar cotizaciones desde Excel
          </h1>
          <p className="text-sm text-brand-muted">
            Sube el archivo de control de cotizaciones (hojas cuyo nombre
            incluya &quot;COTIZA...&quot;, ej. &quot;COTIZACIONES QROMA&quot;).
            El cliente se toma del nombre de la hoja. Nada se guarda hasta
            que confirmes.
          </p>
        </header>

        <ImportQuotesForm />
      </div>
    </AppShell>
  );
}
