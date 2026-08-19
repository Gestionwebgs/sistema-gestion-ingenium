import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { createLoanAction } from "../actions";

export default async function NuevoPrestamoPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Nuevo préstamo</h1>
          <p className="text-sm text-brand-muted">
            Dinero prestado por un tercero para financiar la operación.
          </p>
        </header>

        <form
          action={createLoanAction}
          className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
        >
          <div>
            <label
              htmlFor="lenderName"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Prestamista *
            </label>
            <input
              id="lenderName"
              name="lenderName"
              type="text"
              required
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="borrowerUserId"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              A nombre de
            </label>
            <select
              id="borrowerUserId"
              name="borrowerUserId"
              defaultValue=""
              className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="">Empresa (general)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label
                htmlFor="currency"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Moneda
              </label>
              <select
                id="currency"
                name="currency"
                defaultValue="PEN"
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="PEN">Soles (S/.)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="interestAmount"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Interés
              </label>
              <input
                id="interestAmount"
                name="interestAmount"
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label
                htmlFor="interestCurrency"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Moneda del interés
              </label>
              <select
                id="interestCurrency"
                name="interestCurrency"
                defaultValue="PEN"
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="PEN">Soles (S/.)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="loanDate"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Fecha del préstamo *
              </label>
              <input
                id="loanDate"
                name="loanDate"
                type="date"
                required
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label
                htmlFor="dueDate"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Fecha de pago
              </label>
              <input
                id="dueDate"
                name="dueDate"
                type="date"
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="bankCommission"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Comisión del banco
              </label>
              <input
                id="bankCommission"
                name="bankCommission"
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label
                htmlFor="bankCommissionCurrency"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Moneda de la comisión
              </label>
              <select
                id="bankCommissionCurrency"
                name="bankCommissionCurrency"
                defaultValue="PEN"
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="PEN">Soles (S/.)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Notas
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
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
              Crear préstamo
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
