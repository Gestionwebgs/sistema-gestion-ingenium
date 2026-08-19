import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { createContactAction } from "../actions";

export default async function NuevoContactoPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="contactos"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">
            Nuevo contacto
          </h1>
        </header>

        <form
          action={createContactAction}
          className="space-y-4 rounded-lg border border-brand-border bg-brand-surface p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                htmlFor="companyName"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Empresa / cliente *
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="projectOrSite"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Proyecto / ubicación
            </label>
            <input
              id="projectOrSite"
              name="projectOrSite"
              type="text"
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="serviceInCharge"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Servicio a cargo
            </label>
            <input
              id="serviceInCharge"
              name="serviceInCharge"
              type="text"
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

          <div className="flex justify-end gap-3 pt-2">
            <a
              href="/contactos"
              className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Crear contacto
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
