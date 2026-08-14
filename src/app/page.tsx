import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { FolderKanban, Plus } from "lucide-react";

export default async function Home() {
  const session = await auth();

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
    >
      <div className="p-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">Proyectos</h1>
            <p className="text-sm text-brand-muted">
              Cada proyecto tiene su propia pestaña de control.
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nuevo proyecto
          </button>
        </header>

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
      </div>
    </AppShell>
  );
}
