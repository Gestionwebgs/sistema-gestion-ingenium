import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus } from "lucide-react";

export default async function ContactosPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const contacts = await prisma.clientDirectoryContact.findMany({
    orderBy: [{ companyName: "asc" }, { name: "asc" }],
  });

  const groups = new Map<string, typeof contacts>();
  for (const contact of contacts) {
    if (!groups.has(contact.companyName)) groups.set(contact.companyName, []);
    groups.get(contact.companyName)!.push(contact);
  }

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="contactos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">
              Contactos de clientes
            </h1>
            <p className="text-sm text-brand-muted">
              Directorio de contactos externos por cliente/servicio.
            </p>
          </div>
          <a
            href="/contactos/nuevo"
            className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Nuevo contacto
          </a>
        </header>

        {groups.size === 0 && (
          <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-muted">
            No hay contactos registrados.
          </div>
        )}

        <div className="space-y-5">
          {Array.from(groups.entries()).map(([companyName, items]) => (
            <div
              key={companyName}
              className="overflow-hidden rounded-lg border border-brand-border bg-brand-surface"
            >
              <div className="border-b border-brand-border bg-gray-50 px-4 py-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
                  {companyName}
                </h2>
              </div>
              <div>
                {items.map((contact) => (
                  <a
                    key={contact.id}
                    href={`/contactos/${contact.id}/editar`}
                    className="flex flex-col gap-1 border-b border-brand-border px-4 py-3 text-sm transition last:border-b-0 hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-brand-navy">
                        {contact.name}
                        {contact.projectOrSite && (
                          <span className="ml-2 text-xs font-normal text-brand-muted">
                            {contact.projectOrSite}
                          </span>
                        )}
                      </p>
                      {contact.serviceInCharge && (
                        <p className="text-xs text-brand-muted">
                          {contact.serviceInCharge}
                        </p>
                      )}
                    </div>
                    {contact.phone && (
                      <span className="shrink-0 text-xs text-brand-muted">
                        {contact.phone}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
