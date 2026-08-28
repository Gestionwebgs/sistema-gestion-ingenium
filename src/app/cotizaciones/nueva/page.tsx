import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { QuoteForm } from "../QuoteForm";
import { createQuoteAction } from "../actions";

export default async function NuevaCotizacionPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/cotizaciones");

  const clients = await prisma.quote.findMany({
    select: { clientName: true },
    distinct: ["clientName"],
    orderBy: { clientName: "asc" },
  });

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="cotizaciones"
    >
      <div className="mx-auto max-w-lg p-4 sm:p-8">
        <header className="mb-6">
          <a
            href="/cotizaciones"
            className="text-sm text-brand-blue hover:underline"
          >
            ← Cotizaciones
          </a>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Nueva cotización
          </h1>
        </header>

        <QuoteForm
          action={createQuoteAction}
          clientNames={clients.map((c) => c.clientName)}
          cancelHref="/cotizaciones"
          submitLabel="Registrar cotización"
        />
      </div>
    </AppShell>
  );
}
