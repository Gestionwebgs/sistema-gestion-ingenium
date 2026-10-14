import type { prisma } from "@/lib/prisma";
import { TaskStatusSelect } from "./TaskStatusSelect";
import { pendientesHref, type TaskSection } from "./query";

type Task = Awaited<ReturnType<typeof prisma.pendingTask.findMany>>[number];

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

const IMPORTANCE_STYLES: Record<string, string> = {
  ALTA: "bg-red-50 text-red-600",
  MEDIA: "bg-amber-50 text-amber-600",
  BAJA: "bg-gray-100 text-brand-muted",
};

const STATUS_CHIPS = [
  { key: "PENDIENTE", label: "Pendiente", style: "bg-amber-100 text-amber-700" },
  { key: "EN_CURSO", label: "En curso", style: "bg-blue-100 text-blue-700" },
  { key: "CERRADO", label: "Cerrado", style: "bg-green-100 text-green-700" },
] as const;

export function EmpresaDetalle({
  empresa,
  section,
  tasks,
  total,
  page,
  pageSize,
  statusCounts,
  responsable,
  estado,
}: {
  empresa: string;
  section: TaskSection;
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: { PENDIENTE: number; EN_CURSO: number; CERRADO: number };
  responsable?: string;
  estado?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const allCount =
    statusCounts.PENDIENTE + statusCounts.EN_CURSO + statusCounts.CERRADO;
  const now = new Date();

  const hrefFor = (overrides: { estado?: string | null; pagina?: number }) =>
    pendientesHref({
      empresa,
      seccion: section,
      responsable,
      estado: overrides.estado === undefined ? estado : overrides.estado,
      pagina: overrides.pagina && overrides.pagina > 1 ? String(overrides.pagina) : null,
    });

  const firstShown = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, total);

  return (
    <div>
      <a
        href={pendientesHref({ responsable, estado })}
        className="text-sm text-brand-blue hover:underline"
      >
        ← Todas las empresas
      </a>
      <div className="mt-1 mb-4">
        <h2 className="text-lg font-bold text-brand-navy">{empresa}</h2>
        <p className="text-xs text-brand-muted">
          {section === "GESTION_INTERNA" ? "Gestión interna" : "Pendientes de proyectos"}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <a
          href={hrefFor({ estado: null })}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
            !estado
              ? "border-brand-navy bg-brand-navy text-white"
              : "border-brand-border text-brand-navy hover:bg-gray-50"
          }`}
        >
          Todos ({allCount})
        </a>
        {STATUS_CHIPS.map((chip) => (
          <a
            key={chip.key}
            href={hrefFor({ estado: chip.key })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${chip.style} ${
              estado === chip.key ? "ring-2 ring-brand-navy" : "hover:opacity-80"
            }`}
          >
            {chip.label} ({statusCounts[chip.key]})
          </a>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
        {tasks.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-brand-muted">
            No hay pendientes con estos filtros.
          </p>
        )}
        {tasks.map((task) => {
          const overdue =
            !!task.dueDate && task.status !== "CERRADO" && task.dueDate < now;
          return (
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
                    <span
                      className={`text-[10px] ${overdue ? "font-medium text-red-600" : "text-brand-muted"}`}
                    >
                      {overdue ? "vencida " : "vence "}
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
                {task.notes && (
                  <p className="mt-1 text-xs text-brand-muted">{task.notes}</p>
                )}
              </div>
              <TaskStatusSelect taskId={task.id} status={task.status} />
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-muted">
          <span>
            Mostrando {firstShown}–{lastShown} de {total}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <a
                href={hrefFor({ pagina: page - 1 })}
                className="rounded-md border border-brand-border px-3 py-1.5 font-medium text-brand-navy transition hover:bg-gray-50"
              >
                ← Anterior
              </a>
            ) : (
              <span className="rounded-md border border-brand-border px-3 py-1.5 opacity-40">
                ← Anterior
              </span>
            )}
            <span>
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <a
                href={hrefFor({ pagina: page + 1 })}
                className="rounded-md border border-brand-border px-3 py-1.5 font-medium text-brand-navy transition hover:bg-gray-50"
              >
                Siguiente →
              </a>
            ) : (
              <span className="rounded-md border border-brand-border px-3 py-1.5 opacity-40">
                Siguiente →
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
