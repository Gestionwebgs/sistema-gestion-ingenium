import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { updateProjectAction } from "../../actions";
import { OrderAmountFields } from "../../nuevo/OrderAmountFields";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function EditarProyectoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [project, businessLines] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { client: true, clientContact: true },
    }),
    prisma.businessLine.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  const updateProject = updateProjectAction.bind(null, project.id);

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
    >
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <header className="mb-6">
          <a
            href={`/proyectos/${project.id}`}
            className="text-sm text-brand-blue hover:underline"
          >
            ← {project.name}
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Editar proyecto
          </h1>
          <p className="text-sm text-brand-muted">
            Cambia lo que haga falta. Si el monto de la orden cambia, queda
            un registro del ajuste (adicional/ampliación).
          </p>
        </header>

        <form action={updateProject} className="space-y-6">
          <section className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
            <h2 className="text-sm font-semibold text-brand-navy">
              Datos del proyecto
            </h2>

            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Nombre del proyecto *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={project.name}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="location"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  Ubicación
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  defaultValue={project.location ?? ""}
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label
                  htmlFor="businessLineId"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  Línea de negocio *
                </label>
                <select
                  id="businessLineId"
                  name="businessLineId"
                  required
                  defaultValue={project.businessLineId}
                  className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  {businessLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="responsibleName"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  Responsable por Ingenium
                </label>
                <input
                  id="responsibleName"
                  name="responsibleName"
                  type="text"
                  defaultValue={project.responsibleName ?? ""}
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label
                  htmlFor="purchaseOrderNumber"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  Orden de compra
                </label>
                <input
                  id="purchaseOrderNumber"
                  name="purchaseOrderNumber"
                  type="text"
                  defaultValue={project.purchaseOrderNumber ?? ""}
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  Fecha de inicio
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  defaultValue={toDateInputValue(project.startDate)}
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label
                  htmlFor="endDate"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  Fecha final
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  defaultValue={toDateInputValue(project.endDate)}
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
            <h2 className="text-sm font-semibold text-brand-navy">Cliente</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="clientBusinessName"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  Empresa cliente
                </label>
                <input
                  id="clientBusinessName"
                  name="clientBusinessName"
                  type="text"
                  defaultValue={project.client?.businessName ?? ""}
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label
                  htmlFor="clientRuc"
                  className="mb-1 block text-sm font-medium text-brand-navy"
                >
                  RUC
                </label>
                <input
                  id="clientRuc"
                  name="clientRuc"
                  type="text"
                  defaultValue={project.client?.ruc ?? ""}
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="clientContactName"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Usuario / contacto del cliente
              </label>
              <input
                id="clientContactName"
                name="clientContactName"
                type="text"
                defaultValue={project.clientContact?.name ?? ""}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
            <h2 className="text-sm font-semibold text-brand-navy">
              Monto de la orden
            </h2>
            <OrderAmountFields initialAmount={Number(project.orderAmountNoIgv)} />
          </section>

          <div className="flex justify-end gap-3">
            <a
              href={`/proyectos/${project.id}`}
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
