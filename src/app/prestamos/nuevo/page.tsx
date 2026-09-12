import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { createPersonalLoanAction } from "../actions";

export default async function NuevoPrestamoPersonalPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/prestamos");

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a href="/prestamos" className="text-sm text-brand-blue hover:underline">
            ← Préstamos
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Nuevo préstamo personal
          </h1>
          <p className="text-sm text-brand-muted">
            Para cuando alguien del equipo pone dinero propio a disposición de
            la empresa para liquidez general (ej. un retiro de tarjeta de
            crédito) — no para registrar la compra de algo puntual, eso se
            hace desde el proyecto o desde &quot;Gastos&quot;.
          </p>
        </header>

        <form
          action={createPersonalLoanAction}
          className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
        >
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
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

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
              placeholder="Ej. Retiro de tarjeta de crédito para liquidez"
              required
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="paidByUserId"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Quién prestó el dinero
            </label>
            <select
              id="paidByUserId"
              name="paidByUserId"
              defaultValue={session.user.id}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <input
              name="paidByNameManual"
              type="text"
              placeholder="Otro (nombre, si no está en la lista)"
              className="mt-2 w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="amount"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Monto (S/.) *
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <a
              href="/prestamos"
              className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Registrar préstamo
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
