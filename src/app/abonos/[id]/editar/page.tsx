import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { updateIncomeAction } from "../../actions";

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export default async function EditarAbonoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const income = await prisma.income.findUnique({ where: { id } });
  if (!income) notFound();

  const backHref = income.projectId
    ? `/proyectos/${income.projectId}`
    : "/proyectos";
  const updateIncome = updateIncomeAction.bind(null, income.id);

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="proyectos"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a href={backHref} className="text-sm text-brand-blue hover:underline">
            ← Volver
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Editar abono
          </h1>
        </header>

        <form
          action={updateIncome}
          className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
        >
          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Descripción *
            </label>
            <input
              id="description"
              name="description"
              type="text"
              required
              defaultValue={income.description}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="date"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Fecha *
              </label>
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={toDateInputValue(income.date)}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label
                htmlFor="amount"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Monto *
              </label>
              <input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={Number(income.amount)}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <a
              href={backHref}
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
