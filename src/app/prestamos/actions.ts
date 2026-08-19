"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Registra el pago/devolución de un préstamo de personal (dinero que alguien
// del equipo adelantó de su bolsillo para la empresa). El grupo puede ser un
// usuario del sistema (paidToUserId) o alguien sin cuenta, identificado solo
// por nombre (paidToName) — ver PendingExpensesGroup.
export async function createReimbursementAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar pagos de préstamos de personal");
  }

  const paidToUserId = String(formData.get("paidToUserId") ?? "").trim() || null;
  const paidToName = String(formData.get("paidToName") ?? "").trim();
  const date = new Date(String(formData.get("date") ?? ""));
  const description = String(formData.get("description") ?? "").trim() || null;
  const expenseIds = formData.getAll("expenseIds").map(String);

  if (!paidToName || expenseIds.length === 0) {
    throw new Error("Selecciona al menos un gasto para pagar");
  }

  const expenses = await prisma.expense.findMany({
    where: { id: { in: expenseIds }, paymentSource: "PERSONAL" },
    include: { reimbursementItems: true },
  });

  const items = expenses
    .map((expense) => {
      const alreadyApplied = expense.reimbursementItems.reduce(
        (sum, item) => sum + Number(item.amountApplied),
        0
      );
      const pending = Number(expense.amount) - alreadyApplied;
      return { expenseId: expense.id, amountApplied: pending };
    })
    .filter((item) => item.amountApplied > 0.01);

  if (items.length === 0) {
    throw new Error("Los gastos seleccionados ya no tienen saldo pendiente");
  }

  const totalAmount = items.reduce((sum, item) => sum + item.amountApplied, 0);

  await prisma.reimbursement.create({
    data: {
      date,
      amount: totalAmount,
      description,
      paidToUserId,
      paidToName,
      createdByUserId: session.user.id,
      items: { create: items },
    },
  });

  revalidatePath("/prestamos");
}
