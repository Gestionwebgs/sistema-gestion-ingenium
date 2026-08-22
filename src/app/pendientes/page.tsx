import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus } from "lucide-react";
import { cycleTaskStatusAction } from "./actions";
import { ResponsableFilter } from "./ResponsableFilter";

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

const STATUS_STYLES: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-700",
  EN_CURSO: "bg-blue-100 text-blue-700",
  CERRADO: "bg-green-100 text-green-700",
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "PENDIENTE",
  EN_CURSO: "EN CURSO",
  CERRADO: "CERRADO",
};

const IMPORTANCE_STYLES: Record<string, string> = {
  ALTA: "bg-red-50 text-red-600",
  MEDIA: "bg-amber-50 text-amber-600",
  BAJA: "bg-gray-100 text-brand-muted",
};

type Task = Awaited<ReturnType<typeof prisma.pendingTask.findMany>>[number];

function groupBySection(tasks: Task[]) {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    if (!groups.has(task.groupName)) groups.set(task.groupName, []);
    groups.get(task.groupName)!.push(task);
  }
  for (const items of groups.values()) {
    items.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return Array.from(groups.entries());
}

export default async function PendientesPage({
  searchParams,
}: {
  searchParams: Promise<{ responsable?: string }>;
}) {
  const { responsable } = await searchParams;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const allResponsables = await prisma.pendingTask.findMany({
    where: { responsibleName: { not: null } },
    select: { responsibleName: true },
    distinct: ["responsibleName"],
  });
  const responsableOptions = allResponsables
    .map((r) => r.responsibleName)
    .filter((name): name is string => !!name)
    .sort((a, b) => a.localeCompare(b));

  const filter = responsable ? { responsibleName: responsable } : {};

  const [proyectosTasks, internaTasks] = await Promise.all([
    prisma.pendingTask.findMany({
      where: { section: "PROYECTOS", ...filter },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pendingTask.findMany({
      where: { section: "GESTION_INTERNA", ...filter },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const proyectosGroups = groupBySection(proyectosTasks);
  const internaGroups = groupBySection(internaTasks);
  const noResultsForFilter =
    !!responsable && proyectosGroups.length === 0 && internaGroups.length === 0;

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="pendientes"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">Pendientes</h1>
            <p className="text-sm text-brand-muted">
              Tareas por proyecto/cliente y de gestión interna. Toca el
              estado para avanzarlo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ResponsableFilter options={responsableOptions} />
            <a
              href="/pendientes/importar"
              className="flex items-center justify-center gap-2 rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Importar desde Excel
            </a>
            <a
              href="/pendientes/nuevo"
              className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nuevo pendiente
            </a>
          </div>
        </header>

        {noResultsForFilter && (
          <div className="mb-6 rounded-lg border border-dashed border-brand-border bg-brand-surface py-8 text-center text-sm text-brand-muted">
            No hay pendientes para &quot;{responsable}&quot;.
          </div>
        )}

        <TaskSection title="Pendientes de proyectos" groups={proyectosGroups} />
        <TaskSection title="Gestión interna" groups={internaGroups} />
      </div>
    </AppShell>
  );
}

function TaskSection({
  title,
  groups,
}: {
  title: string;
  groups: [string, Task[]][];
}) {
  if (groups.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold text-brand-navy">{title}</h2>
      <div className="space-y-5">
        {groups.map(([groupName, tasks]) => (
          <div
            key={groupName}
            className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface"
          >
            <div className="border-b border-brand-border bg-gray-50 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
                {groupName}
              </h3>
            </div>
            <div>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col gap-2 border-b border-brand-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <a
                      href={`/pendientes/${task.id}/editar`}
                      className="text-sm font-medium text-brand-navy hover:underline"
                    >
                      {task.task}
                    </a>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {task.contactName && (
                        <span className="text-xs text-brand-muted">
                          {task.contactName}
                        </span>
                      )}
                      {task.importance && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${IMPORTANCE_STYLES[task.importance]}`}
                        >
                          {task.importance}
                        </span>
                      )}
                      {task.responsibleName && (
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-brand-blue">
                          {task.responsibleName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className="text-[10px] text-brand-muted">
                          vence {formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="mt-1 text-xs text-brand-muted">
                        {task.notes}
                      </p>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server";
                      await cycleTaskStatusAction(task.id);
                    }}
                  >
                    <button
                      type="submit"
                      className={`shrink-0 rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[task.status]}`}
                    >
                      {STATUS_LABELS[task.status]}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
