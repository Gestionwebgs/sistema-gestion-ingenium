import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { updateContactAction, deleteContactAction } from "../../actions";

export default async function EditarContactoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const contact = await prisma.clientDirectoryContact.findUnique({
    where: { id },
  });
  if (!contact) notFound();

  const updateContact = updateContactAction.bind(null, contact.id);
  const deleteContact = deleteContactAction.bind(null, contact.id);

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="contactos"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a
              href="/contactos"
              className="text-sm text-brand-blue hover:underline"
            >
              ← Contactos
            </a>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              Editar contacto
            </h1>
          </div>
          <form action={deleteContact}>
            <button
              type="submit"
              className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Eliminar
            </button>
          </form>
        </header>

        <form
          action={updateContact}
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
                defaultValue={contact.name}
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
                defaultValue={contact.companyName}
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
              defaultValue={contact.projectOrSite ?? ""}
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
              defaultValue={contact.serviceInCharge ?? ""}
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
              defaultValue={contact.phone ?? ""}
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
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
