import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { FolderKanban, Plus, ChevronRight } from "lucide-react";

export default async function ProyectosPage() {
  const session = await auth();
  const projects = await prisma.project.findMany({
    include: { client: true, businessLine: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
      activeNav="proyectos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">Proyectos</h1>
            <p className="text-sm text-brand-muted">
              Cada proyecto tiene su propia pestaña de control.
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href="/proyectos/importar"
              className="flex items-center justify-center gap-2 rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Importar desde Excel
            </a>
            <a
              href="/proyectos/nuevo"
              className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo proyecto
            </a>
          </div>
        </header>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-brand-border bg-brand-surface py-20 text-center">
            <FolderKanban
              className="mb-3 h-10 w-10 text-brand-blue/40"
              strokeWidth={1.5}
            />
            <p className="text-sm font-medium text-brand-navy">
              Todavía no hay proyectos
            </p>
            <p className="mt-1 text-sm text-brand-muted">
              Crea el primero para empezar a llevar el control financiero.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
            {projects.map((project) => (
              <a
                key={project.id}
                href={`/proyectos/${project.id}`}
                className="flex items-center justify-between border-b border-brand-border px-5 py-4 transition last:border-b-0 hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-semibold text-brand-navy">
                    {project.name}
                  </p>
                  <p className="text-xs text-brand-muted">
                    {project.businessLine.name}
                    {project.client ? ` · ${project.client.businessName}` : ""}
                  </p>
                </div>
                <ChevronRight
                  className="h-4 w-4 text-brand-muted"
                  strokeWidth={1.75}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
