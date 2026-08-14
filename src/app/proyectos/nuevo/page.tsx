import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { createProjectAction } from "../actions";
import { OrderAmountFields } from "./OrderAmountFields";

export default async function NuevoProyectoPage() {
  const session = await auth();
  const businessLines = await prisma.businessLine.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
    >
      <div className="mx-auto max-w-2xl p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Nuevo proyecto</h1>
          <p className="text-sm text-brand-muted">
            Datos generales del proyecto. Los gastos y abonos se registran
            después de crearlo.
          </p>
        </header>

        <form action={createProjectAction} className="space-y-6">
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
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  defaultValue=""
                  className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="" disabled>
                    Selecciona una línea
                  </option>
                  {businessLines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
            <h2 className="text-sm font-semibold text-brand-navy">Cliente</h2>
            <div className="grid grid-cols-2 gap-4">
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
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5">
            <h2 className="text-sm font-semibold text-brand-navy">
              Monto de la orden
            </h2>
            <OrderAmountFields />
          </section>

          <div className="flex justify-end gap-3">
            <a
              href="/"
              className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Crear proyecto
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
