import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus, UserRound } from "lucide-react";

export default async function UsuariosPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="usuarios"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">Usuarios</h1>
            <p className="text-sm text-brand-muted">
              Cuentas con acceso al sistema.
            </p>
          </div>
          <a
            href="/usuarios/nuevo"
            className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nuevo usuario
          </a>
        </header>

        <div className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 border-b border-brand-border px-5 py-4 last:border-b-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                <UserRound className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-navy">
                  {user.name}
                </p>
                <p className="text-xs text-brand-muted">{user.email}</p>
              </div>
              <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-brand-muted">
                {user.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
