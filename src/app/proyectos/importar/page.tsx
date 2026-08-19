import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { ImportProjectsForm } from "./ImportProjectsForm";

export default async function ImportarProyectosPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const businessLines = await prisma.businessLine.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="proyectos"
    >
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <header className="mb-6">
          <a
            href="/proyectos"
            className="text-sm text-brand-blue hover:underline"
          >
            ← Proyectos
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Importar proyectos desde Excel
          </h1>
          <p className="text-sm text-brand-muted">
            Sube el archivo con la ficha de proyecto (formato que ya usan:
            Proyecto, Ubicación, Cliente, RUC, montos, y las tablas de
            gastos/abonos). Nada se guarda hasta que confirmes.
          </p>
        </header>

        <ImportProjectsForm businessLines={businessLines} />
      </div>
    </AppShell>
  );
}
