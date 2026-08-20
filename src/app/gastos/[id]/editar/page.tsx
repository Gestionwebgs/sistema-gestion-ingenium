import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { getFileSignedUrl } from "@/lib/s3";
import { updateExpenseAction } from "../../actions";

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export default async function EditarGastoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/");

  const [expense, projects, users] = await Promise.all([
    prisma.expense.findUnique({
      where: { id },
      include: { attachments: { orderBy: { uploadedAt: "asc" } } },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!expense) notFound();

  const attachmentLinks = await Promise.all(
    expense.attachments.map(async (attachment) => ({
      id: attachment.id,
      url: await getFileSignedUrl(attachment.fileKey),
    }))
  );

  const backHref = expense.projectId
    ? `/proyectos/${expense.projectId}`
    : "/gastos";
  const updateExpense = updateExpenseAction.bind(null, expense.id);

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="gastos"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a href={backHref} className="text-sm text-brand-blue hover:underline">
            ← Volver
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Editar gasto
          </h1>
        </header>

        <form
          action={updateExpense}
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
              defaultValue={expense.description}
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
                defaultValue={toDateInputValue(expense.date)}
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
                defaultValue={Number(expense.amount)}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="operationCode"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                N° comprobante
              </label>
              <input
                id="operationCode"
                name="operationCode"
                type="text"
                defaultValue={expense.operationCode ?? ""}
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label
                htmlFor="projectId"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Proyecto
              </label>
              <select
                id="projectId"
                name="projectId"
                defaultValue={expense.projectId ?? ""}
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">General (sin proyecto)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="paymentSource"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Fuente de pago
              </label>
              <select
                id="paymentSource"
                name="paymentSource"
                defaultValue={expense.paymentSource}
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="EMPRESA">Empresa</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="paymentMethod"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Método de pago
              </label>
              <select
                id="paymentMethod"
                name="paymentMethod"
                defaultValue={expense.paymentMethod ?? ""}
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">Sin especificar</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="YAPE_PLIN">Yape / Plin</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="TARJETA">Tarjeta</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="paidByUserId"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Responsable de la compra
              </label>
              <select
                id="paidByUserId"
                name="paidByUserId"
                defaultValue={expense.paidByUserId ?? ""}
                className="w-full rounded-md border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">— </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="paidByNameManual"
                className="mb-1 block text-sm font-medium text-brand-navy"
              >
                Otro (nombre, si no está en la lista)
              </label>
              <input
                id="paidByNameManual"
                name="paidByNameManual"
                type="text"
                defaultValue={expense.paidByUserId ? "" : (expense.paidByName ?? "")}
                title="Si la persona no tiene cuenta en el sistema, escribe su nombre aquí en vez de elegirlo arriba"
                className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-navy">
              Comprobante (foto o PDF)
            </label>
            {attachmentLinks.length > 0 && (
              <ul className="mb-2 space-y-1">
                {attachmentLinks.map((attachment, i) => (
                  <li key={attachment.id}>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-brand-blue hover:underline"
                    >
                      Ver comprobante {attachmentLinks.length > 1 ? i + 1 : ""}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*,.pdf"
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
            <p className="mt-1 text-xs text-brand-muted">
              {attachmentLinks.length > 0
                ? "Si subes un archivo, se agrega como comprobante adicional (no reemplaza el existente)."
                : "Opcional."}
            </p>
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
              defaultValue={expense.notes ?? ""}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm text-brand-navy focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
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
