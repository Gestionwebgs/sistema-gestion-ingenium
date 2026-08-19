import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { createPendingTaskAction } from "../actions";

export default async function NuevoPendientePage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const groupNames = await prisma.pendingTask.findMany({
    distinct: ["groupName"],
    select: { groupName: true },
    orderBy: { groupName: "asc" },
  });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="pendientes"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">
            Nuevo pendiente
          </h1>
        </header>

        <form
          action={createPendingTaskAction}
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
                defaultValue="PROYECTOS"
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
                placeholder="Ej. PAMOLSA, QROMA - ÑAÑA"
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
                defaultValue=""
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
              defaultValue="PENDIENTE"
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
              Crear pendiente
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
