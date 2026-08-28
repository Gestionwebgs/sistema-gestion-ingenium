import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { InvoiceForm } from "../../InvoiceForm";
import { updateInvoiceAction, deleteInvoiceAction } from "../../actions";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function EditarFacturaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/facturacion");

  const [invoice, projects] = await Promise.all([
    prisma.invoice.findUnique({ where: { id } }),
    prisma.project.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!invoice) notFound();

  const cancelHref = invoice.projectId
    ? `/proyectos/${invoice.projectId}`
    : "/facturacion";
  const updateInvoice = updateInvoiceAction.bind(null, invoice.id);
  const deleteInvoice = deleteInvoiceAction.bind(null, invoice.id);

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="facturacion"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a href={cancelHref} className="text-sm text-brand-blue hover:underline">
              ← Volver
            </a>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              Editar factura
            </h1>
          </div>
          <form action={deleteInvoice}>
            <button
              type="submit"
              className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Eliminar
            </button>
          </form>
        </header>

        <InvoiceForm
          action={updateInvoice}
          projects={projects}
          cancelHref={cancelHref}
          submitLabel="Guardar cambios"
          defaults={{
            projectId: invoice.projectId ?? "",
            purchaseOrderNumber: invoice.purchaseOrderNumber ?? "",
            quoteCode: invoice.quoteCode ?? "",
            solicitantName: invoice.solicitantName ?? "",
            description: invoice.description,
            amountNet: Number(invoice.amountNet),
            detractionPercent: Math.round(Number(invoice.detractionPercent) * 10000) / 100,
            hesRequested: invoice.hesRequested,
            hesRequestedDate: toDateInputValue(invoice.hesRequestedDate),
            hesReceived: invoice.hesReceived,
            invoiceEnteredDate: toDateInputValue(invoice.invoiceEnteredDate),
            paid: invoice.paid,
            paidDate: toDateInputValue(invoice.paidDate),
            notes: invoice.notes ?? "",
          }}
        />
      </div>
    </AppShell>
  );
}
