import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import {
  updatePendingTaskAction,
  deletePendingTaskAction,
} from "../../actions";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function EditarPendientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const [task, groupNames] = await Promise.all([
    prisma.pendingTask.findUnique({ where: { id } }),
    prisma.pendingTask.findMany({
      distinct: ["groupName"],
      select: { groupName: true },
      orderBy: { groupName: "asc" },
    }),
  ]);

  if (!task) notFound();

  const updateTask = updatePendingTaskAction.bind(null, task.id);
  const deleteTask = deletePendingTaskAction.bind(null, task.id);

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="pendientes"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a
              href="/pendientes"
              className="text-sm text-brand-blue hover:underline"
            >
              ← Pendientes
            </a>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              Editar pendiente
            </h1>
          </div>
          <form action={deleteTask}>
            <button
              type="submit"
              className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Eliminar
            </button>
          </form>
        </header>

        <form
          action={updateTask}
          className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="section"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Tipo *
              </label>
              <select
                id="section"
                name="section"
                defaultValue={task.section}
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="PROYECTOS">Proyecto / cliente</option>
                <option value="GESTION_INTERNA">Gestión interna</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="groupName"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Grupo *
              </label>
              <input
                id="groupName"
                name="groupName"
                type="text"
                required
                list="groupNameOptions"
                defaultValue={task.groupName}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <datalist id="groupNameOptions">
                {groupNames.map((g) => (
                  <option key={g.groupName} value={g.groupName} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label
              htmlFor="task"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Tarea *
            </label>
            <input
              id="task"
              name="task"
              type="text"
              required
              defaultValue={task.task}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="contactName"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Contacto / usuario
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              defaultValue={task.contactName ?? ""}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="importance"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Importancia
              </label>
              <select
                id="importance"
                name="importance"
                defaultValue={task.importance ?? ""}
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">Sin definir</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="responsibleName"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Responsable
              </label>
              <input
                id="responsibleName"
                name="responsibleName"
                type="text"
                list="responsibleOptions"
                defaultValue={task.responsibleName ?? ""}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
              <datalist id="responsibleOptions">
                <option value="RAUL" />
                <option value="ANGGIE" />
                <option value="GRELIMAR" />
                <option value="MERVIS" />
              </datalist>
            </div>
          </div>

          <div>
            <label
              htmlFor="status"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Estado
            </label>
            <select
              id="status"
              name="status"
              defaultValue={task.status}
              className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="PENDIENTE">Pendiente</option>
              <option value="EN_CURSO">En curso</option>
              <option value="CERRADO">Cerrado</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="raisedDate"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Fecha de levantamiento
              </label>
              <input
                id="raisedDate"
                name="raisedDate"
                type="date"
                defaultValue={toDateInputValue(task.raisedDate)}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label
                htmlFor="dueDate"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Fecha límite
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={toDateInputValue(task.dueDate)}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Observaciones / comentario
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={task.notes ?? ""}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <a
              href="/pendientes"
              className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
