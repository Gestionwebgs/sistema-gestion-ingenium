import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";

const formatSoles = (value: number) =>
  value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Clave año-mes en UTC, para agrupar igual que se ve la fecha en pantalla
// (formatDate también usa timeZone UTC) y no desfasar gastos de fin de mes.
function monthKey(date: Date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export default async function GastosPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const expenses = await prisma.expense.findMany({
    include: { project: { select: { name: true } } },
    orderBy: { date: "desc" },
  });

  const groups = new Map<
    string,
    {
      key: string;
      total: number;
      items: typeof expenses;
    }
  >();

  for (const expense of expenses) {
    const key = monthKey(expense.date);
    if (!groups.has(key)) {
      groups.set(key, { key, total: 0, items: [] });
    }
    const group = groups.get(key)!;
    group.total += Number(expense.amount);
    group.items.push(expense);
  }

  const monthGroups = Array.from(groups.values()).sort((a, b) =>
    b.key.localeCompare(a.key)
  );
  for (const group of monthGroups) {
    group.items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="gastos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">
            Gastos por mes
          </h1>
          <p className="text-sm text-brand-muted">
            Todos los gastos de la empresa (proyectos + generales),
            agrupados por mes e identificados por su N° de comprobante.
          </p>
        </header>

        {monthGroups.length === 0 && (
          <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-muted">
            No hay gastos registrados todavía.
          </div>
        )}

        <div className="space-y-8">
          {monthGroups.map((group) => (
            <section key={group.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-brand-navy">
                  {monthLabel(group.key)}
                </h2>
                <span className="text-sm font-semibold text-brand-navy">
                  Total: S/. {formatSoles(group.total)}
                </span>
              </div>
              <div className="overflow-x-auto rounded-lg border border-brand-border bg-brand-surface">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-brand-muted">
                    <tr>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">N° comprobante</th>
                      <th className="px-3 py-2">Descripción</th>
                      <th className="px-3 py-2">Proyecto</th>
                      <th className="px-3 py-2 text-right">Monto</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((expense) => (
                      <tr key={expense.id} className="border-t border-brand-border">
                        <td className="px-3 py-2 whitespace-nowrap text-brand-muted">
                          {formatDate(expense.date)}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-brand-muted">
                          {expense.operationCode ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-brand-navy">
                          {expense.description}
                        </td>
                        <td className="px-3 py-2 text-brand-muted">
                          {expense.project?.name ?? "General"}
                        </td>
                        <td className="px-3 py-2 text-right text-brand-navy">
                          S/. {formatSoles(Number(expense.amount))}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <a
                            href={`/gastos/${expense.id}/editar`}
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
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
