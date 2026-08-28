import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus } from "lucide-react";
import { ClientFilter } from "./ClientFilter";

const formatAmount = (value: number) =>
  `S/. ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (date: Date | null) =>
  date ? new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" }) : "—";

const STAGE_LABELS: Record<string, string> = {
  ENVIADA: "Enviada",
  EN_EVALUACION: "En evaluación",
  OC_RECIBIDA: "OC recibida",
  PAGADA: "Pagada",
  RECHAZADA: "Rechazada",
};

const STAGE_STYLES: Record<string, string> = {
  ENVIADA: "bg-blue-50 text-brand-blue",
  EN_EVALUACION: "bg-amber-100 text-amber-700",
  OC_RECIBIDA: "bg-emerald-100 text-emerald-700",
  PAGADA: "bg-green-100 text-green-700",
  RECHAZADA: "bg-red-50 text-red-600",
};

const WON_STAGES = ["OC_RECIBIDA", "PAGADA"];

export default async function CotizacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const { cliente } = await searchParams;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const allClients = await prisma.quote.findMany({
    select: { clientName: true },
    distinct: ["clientName"],
    orderBy: { clientName: "asc" },
  });
  const clientOptions = allClients.map((c) => c.clientName);

  const quotes = await prisma.quote.findMany({
    where: cliente ? { clientName: cliente } : {},
    orderBy: [{ quoteDate: "desc" }, { createdAt: "desc" }],
  });

  const totalNoIgv = quotes.reduce((s, q) => s + Number(q.amountNoIgv), 0);
  const totalAmount = quotes.reduce(
    (s, q) => s + Number(q.amountNoIgv) + Number(q.igvAmount),
    0
  );
  const won = quotes.filter((q) => WON_STAGES.includes(q.stage));
  const wonAmount = won.reduce(
    (s, q) => s + Number(q.amountNoIgv) + Number(q.igvAmount),
    0
  );

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="cotizaciones"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-brand-navy">Cotizaciones</h1>
            <p className="text-sm text-brand-muted">
              Control de cotizaciones enviadas a clientes, réplica de la hoja
              de Excel que se llevaba por cliente.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ClientFilter options={clientOptions} />
            <a
              href="/cotizaciones/importar"
              className="flex items-center justify-center gap-2 rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              Importar desde Excel
            </a>
            <a
              href="/cotizaciones/nueva"
              className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Nueva cotización
            </a>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Cotizaciones" value={String(quotes.length)} />
          <Stat label="Monto sin IGV" value={formatAmount(totalNoIgv)} />
          <Stat label="Monto total" value={formatAmount(totalAmount)} />
          <Stat
            label={`Ganadas (${won.length})`}
            value={formatAmount(wonAmount)}
            highlight
          />
        </div>

        {quotes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-muted">
            {cliente
              ? `No hay cotizaciones para "${cliente}".`
              : "No hay cotizaciones registradas todavía."}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-surface">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
                <tr>
                  <th className="px-3 py-2">Cliente</th>
                  <th className="px-3 py-2">N°</th>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Proyecto</th>
                  <th className="px-3 py-2 text-right">Sin IGV</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Etapa</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-t border-brand-border align-top">
                    <td className="px-3 py-2 font-medium text-brand-navy">
                      {q.clientName}
                    </td>
                    <td className="px-3 py-2 text-brand-muted">{q.code}</td>
                    <td className="px-3 py-2 text-brand-muted">
                      {q.contactName ?? "—"}
                    </td>
                    <td className="max-w-xs px-3 py-2 text-brand-navy">
                      {q.project}
                      <p className="mt-0.5 text-xs text-brand-muted">
                        {formatDate(q.quoteDate)}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right text-brand-navy">
                      {formatAmount(Number(q.amountNoIgv))}
                    </td>
                    <td className="px-3 py-2 text-right text-brand-navy">
                      {formatAmount(Number(q.amountNoIgv) + Number(q.igvAmount))}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${STAGE_STYLES[q.stage]}`}
                      >
                        {STAGE_LABELS[q.stage]}
                      </span>
                      {q.notes && (
                        <p className="mt-1 max-w-[12rem] text-xs text-brand-muted">
                          {q.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <a
                        href={`/cotizaciones/${q.id}/editar`}
                        className="text-xs text-brand-blue hover:underline"
                      >
                        Editar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
      <p className="text-xs uppercase tracking-wide text-brand-muted">{label}</p>
      <p
        className={`mt-1 font-bold ${highlight ? "text-lg text-green-700" : "text-sm text-brand-navy"}`}
      >
        {value}
      </p>
    </div>
  );
}
