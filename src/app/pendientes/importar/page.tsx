import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { ImportPendientesForm } from "./ImportPendientesForm";

export default async function ImportarPendientesPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/pendientes");

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="pendientes"
    >
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <header className="mb-6">
          <a href="/pendientes" className="text-sm text-brand-blue hover:underline">
            ← Pendientes
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Importar pendientes desde Excel
          </h1>
          <p className="text-sm text-brand-muted">
            Sube el archivo de lista de pendientes (con hojas &quot;PENDIENTES
            - PROYECTOS&quot;, &quot;PENDIENTES - GESTIÓN INTERNA&quot; y
            &quot;CONTACTOS CLIENTE&quot;). Nada se guarda hasta que
            confirmes.
          </p>
        </header>

        <ImportPendientesForm />
      </div>
    </AppShell>
  );
}
