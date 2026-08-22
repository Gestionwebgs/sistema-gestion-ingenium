import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { createLenderAction } from "../actions";

export default async function NuevoPrestamistaPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos-terceros"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a
            href="/prestamos-terceros"
            className="text-sm text-brand-blue hover:underline"
          >
            ← Préstamos de terceros
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Nuevo prestamista
          </h1>
          <p className="text-sm text-brand-muted">
            Se crea una vez; después le podés agregar uno o más préstamos.
          </p>
        </header>

        <form
          action={createLenderAction}
          className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
        >
          <div>
            <label
              htmlFor="name"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Nombre *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Teléfono
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Notas
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
              href="/prestamos-terceros"
              className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Crear prestamista
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
