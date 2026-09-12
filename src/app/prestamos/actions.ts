"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Registra un préstamo de personal "puro" (alguien del equipo pone dinero
// propio a disposición de la empresa para liquidez general — ej. un retiro
// de tarjeta de crédito — sin que sea la compra de algo puntual ni estar
// atado a un proyecto). Se modela igual que cualquier gasto personal
// (Expense con paymentSource PERSONAL y projectId nulo), que es exactamente
// lo que ya hace aparecer un saldo pendiente en esta pantalla — no hizo
// falta ningún campo ni modelo nuevo.
export async function createPersonalLoanAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar préstamos de personal");
  }

  const date = new Date(String(formData.get("date") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0) || 0;
  const paidByNameManual = String(formData.get("paidByNameManual") ?? "").trim();
  const paidByUserIdRaw = String(formData.get("paidByUserId") ?? "").trim();

  if (!description || amount <= 0) {
    throw new Error("Completa la descripción y un monto mayor a cero");
  }

  let paidByUserId: string | null = null;
  let paidByName: string;
  if (paidByNameManual) {
    paidByName = paidByNameManual;
  } else {
    const paidByUser = await prisma.user.findUniqueOrThrow({
      where: { id: paidByUserIdRaw || session.user.id },
    });
    paidByUserId = paidByUser.id;
    paidByName = paidByUser.name;
  }

  await prisma.expense.create({
    data: {
      projectId: null,
      date,
      description,
      amount,
      paymentSource: "PERSONAL",
      paidByUserId,
      paidByName,
      createdByUserId: session.user.id,
    },
  });

  redirect("/prestamos");
}

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
