import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { QuoteForm } from "../../QuoteForm";
import { updateQuoteAction, deleteQuoteAction } from "../../actions";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function EditarCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/cotizaciones");

  const [quote, clients] = await Promise.all([
    prisma.quote.findUnique({ where: { id } }),
    prisma.quote.findMany({
      select: { clientName: true },
      distinct: ["clientName"],
      orderBy: { clientName: "asc" },
    }),
  ]);
  if (!quote) notFound();

  const updateQuote = updateQuoteAction.bind(null, quote.id);
  const deleteQuote = deleteQuoteAction.bind(null, quote.id);

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="cotizaciones"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a
              href="/cotizaciones"
              className="text-sm text-brand-blue hover:underline"
            >
              ← Cotizaciones
            </a>
            <h1 className="mt-1 text-xl font-bold text-brand-navy">
              Editar cotización
            </h1>
          </div>
          <form action={deleteQuote}>
            <button
              type="submit"
              className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
            >
              Eliminar
            </button>
          </form>
        </header>

        <QuoteForm
          action={updateQuote}
          clientNames={clients.map((c) => c.clientName)}
          cancelHref="/cotizaciones"
          submitLabel="Guardar cambios"
          defaults={{
            clientName: quote.clientName,
            contactName: quote.contactName ?? "",
            code: quote.code,
            project: quote.project,
            amountNoIgv: Number(quote.amountNoIgv),
            stage: quote.stage,
            quoteDate: toDateInputValue(quote.quoteDate),
            notes: quote.notes ?? "",
          }}
        />
      </div>
    </AppShell>
  );
}
