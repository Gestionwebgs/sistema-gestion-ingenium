import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { PendingExpensesGroup } from "./PendingExpensesGroup";

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" });

export default async function PrestamosPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  // Préstamos de personal: dinero que alguien del equipo adelantó de su
  // bolsillo para un gasto de la empresa/proyecto, pendiente de devolver.
  // Se agrupa por usuario si tiene cuenta, o por nombre si se registró a
  // mano (ej. un capataz de obra sin cuenta en el sistema).
  const [personalExpenses, allReimbursements] = await Promise.all([
    prisma.expense.findMany({
      where: { paymentSource: "PERSONAL" },
      include: {
        reimbursementItems: true,
        paidByUser: true,
        project: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.reimbursement.findMany({
      orderBy: { date: "desc" },
      include: { paidToUser: true },
    }),
  ]);

  type Group = {
    key: string;
    paidToUserId: string | null;
    paidToName: string;
    expenses: {
      id: string;
      date: string;
      description: string;
      pending: number;
      projectName: string | null;
    }[];
    pendingTotal: number;
    reimbursements: {
      id: string;
      date: string;
      amount: number;
      description: string | null;
    }[];
  };

  const groupMap = new Map<string, Group>();

  for (const expense of personalExpenses) {
    const applied = expense.reimbursementItems.reduce(
      (sum, item) => sum + Number(item.amountApplied),
      0
    );
    const pending = Number(expense.amount) - applied;
    const name = expense.paidByName ?? expense.paidByUser?.name;
    if (pending <= 0.01 || !name) continue;

    const key = expense.paidByUserId ?? `name:${name}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        paidToUserId: expense.paidByUserId,
        paidToName: name,
        expenses: [],
        pendingTotal: 0,
        reimbursements: [],
      });
    }
    const group = groupMap.get(key)!;
    group.expenses.push({
      id: expense.id,
      date: formatDate(expense.date),
      description: expense.description,
      pending,
      projectName: expense.project?.name ?? null,
    });
    group.pendingTotal += pending;
  }

  // Relación de abonos (pagos ya hechos) a favor de cada persona, dentro de
  // su misma tarjeta — no mezclados con los de las demás. Si a alguien ya
  // se le devolvió todo (no le queda ningún gasto con saldo pendiente), no
  // tiene tarjeta creada arriba — se crea una aquí igual, sin gastos
  // pendientes, para que su historial de abonos no desaparezca de la vista.
  for (const reimbursement of allReimbursements) {
    const name = reimbursement.paidToUser?.name ?? reimbursement.paidToName;
    const key = reimbursement.paidToUserId ?? `name:${name}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        key,
        paidToUserId: reimbursement.paidToUserId,
        paidToName: name,
        expenses: [],
        pendingTotal: 0,
        reimbursements: [],
      });
    }
    const group = groupMap.get(key)!;
    group.reimbursements.push({
      id: reimbursement.id,
      date: formatDate(reimbursement.date),
      amount: Number(reimbursement.amount),
      description: reimbursement.description,
    });
  }

  const personalGroups = Array.from(groupMap.values());

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="prestamos"
    >
      <div className="p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">Préstamos</h1>
          <p className="text-sm text-brand-muted">
            Gastos pagados con dinero propio del equipo, pendientes de
            devolver.
          </p>
        </header>

        <div className="space-y-4">
          {personalGroups.length === 0 && (
            <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface py-10 text-center text-sm text-brand-muted">
              No hay préstamos de personal pendientes.
            </div>
          )}
          {personalGroups.map((group) => (
            <PendingExpensesGroup
              key={group.key}
              paidToUserId={group.paidToUserId}
              paidToName={group.paidToName}
              expenses={group.expenses}
              pendingTotal={group.pendingTotal}
              reimbursements={group.reimbursements}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
