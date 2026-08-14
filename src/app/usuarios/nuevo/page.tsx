import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { createUserAction } from "../actions";

export default async function NuevoUsuarioPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="usuarios"
    >
      <div className="mx-auto max-w-md p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Nuevo usuario</h1>
          <p className="text-sm text-brand-muted">
            Crea el acceso para un responsable de proyecto.
          </p>
        </header>

        <form
          action={createUserAction}
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
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Correo *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Contraseña *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
            <p className="mt-1 text-xs text-brand-muted">Mínimo 8 caracteres.</p>
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-1 block text-sm font-medium text-brand-navy"
            >
              Rol
            </label>
            <select
              id="role"
              name="role"
              defaultValue="RESPONSABLE"
              className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="RESPONSABLE">Responsable</option>
              <option value="OWNER">Administrador (acceso total)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <a
              href="/usuarios"
              className="rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Cancelar
            </a>
            <button
              type="submit"
              className="rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
