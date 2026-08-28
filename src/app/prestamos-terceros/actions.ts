"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Ficha de prestamista: se crea una vez y desde ahí se le van agregando
// préstamos (ver createLoanAction). Permite ver, en un solo lugar, todos
// los préstamos de una persona/entidad, sus abonos y su saldo total.
export async function createLenderAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar prestamistas");
  }

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) {
    throw new Error("El nombre del prestamista es requerido");
  }

  const lender = await prisma.lender.create({ data: { name, phone, notes } });

  redirect(`/prestamos-terceros/${lender.id}`);
}

function parseLoanFields(formData: FormData) {
  const borrowerUserId =
    String(formData.get("borrowerUserId") ?? "").trim() || null;
  const amount = Number(formData.get("amount") ?? 0) || 0;
  const currency = String(formData.get("currency") ?? "PEN") as "PEN" | "USD";
  // La tasa manda: si se dio un porcentaje, el interés en monto se calcula
  // acá (no se confía en el cálculo del cliente) a partir del monto
  // prestado, para que "cuánto tengo que pagar" siempre cuadre con la tasa
  // mostrada.
  const interestRateRaw = String(formData.get("interestRate") ?? "").trim();
  const interestRate = interestRateRaw ? Number(interestRateRaw) : null;
  const interestAmount = interestRate
    ? Math.round(amount * (interestRate / 100) * 100) / 100
    : null;
  const interestCurrency = interestRate
    ? (String(formData.get("interestCurrency") ?? "PEN") as "PEN" | "USD")
    : null;
  const bankCommissionRaw = String(formData.get("bankCommission") ?? "").trim();
  const bankCommission = bankCommissionRaw ? Number(bankCommissionRaw) : null;
  const bankCommissionCurrency = bankCommissionRaw
    ? (String(formData.get("bankCommissionCurrency") ?? "PEN") as "PEN" | "USD")
    : null;
  const loanDate = new Date(String(formData.get("loanDate") ?? ""));
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (amount <= 0) {
    throw new Error("El monto del préstamo debe ser mayor a cero");
  }

  return {
    borrowerUserId,
    amount,
    currency,
    interestRate,
    interestAmount,
    interestCurrency,
    bankCommission,
    bankCommissionCurrency,
    loanDate,
    dueDate,
    notes,
  };
}

export async function createLoanAction(lenderId: string, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar préstamos");
  }

  const lender = await prisma.lender.findUniqueOrThrow({
    where: { id: lenderId },
  });
  const fields = parseLoanFields(formData);

  const loan = await prisma.loan.create({
    data: {
      ...fields,
      lenderId: lender.id,
      lenderName: lender.name,
      createdByUserId: session.user.id,
    },
  });

  redirect(`/prestamos-terceros/${lenderId}/prestamos/${loan.id}`);
}

export async function updateLoanAction(
  lenderId: string,
  loanId: string,
  formData: FormData
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar préstamos");
  }

  const fields = parseLoanFields(formData);

  await prisma.loan.update({ where: { id: loanId }, data: fields });

  redirect(`/prestamos-terceros/${lenderId}/prestamos/${loanId}`);
}

export async function deleteLoanAction(lenderId: string, loanId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar préstamos");
  }

  await prisma.loanPayment.deleteMany({ where: { loanId } });
  await prisma.loan.delete({ where: { id: loanId } });

  redirect(`/prestamos-terceros/${lenderId}`);
}

export async function toggleLoanStatusAction(
  lenderId: string,
  loanId: string
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede actualizar préstamos");
  }

  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: loanId } });
  await prisma.loan.update({
    where: { id: loanId },
    data: { status: loan.status === "PENDIENTE" ? "PAGADO" : "PENDIENTE" },
  });

  revalidatePath(`/prestamos-terceros/${lenderId}`);
  revalidatePath(`/prestamos-terceros/${lenderId}/prestamos/${loanId}`);
}

export async function createLoanPaymentAction(
  lenderId: string,
  loanId: string,
  formData: FormData
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar abonos");
  }

  const date = new Date(String(formData.get("date") ?? ""));
  const amount = Number(formData.get("amount") ?? 0) || 0;
  const currency = String(formData.get("currency") ?? "PEN") as "PEN" | "USD";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (amount <= 0) {
    throw new Error("El monto del abono debe ser mayor a cero");
  }

  await prisma.loanPayment.create({
    data: {
      loanId,
      date,
      amount,
      currency,
      notes,
      createdByUserId: session.user.id,
    },
  });

  revalidatePath(`/prestamos-terceros/${lenderId}`);
  revalidatePath(`/prestamos-terceros/${lenderId}/prestamos/${loanId}`);
}

export async function deleteLoanPaymentAction(
  lenderId: string,
  loanId: string,
  paymentId: string
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar abonos");
  }

  await prisma.loanPayment.delete({ where: { id: paymentId } });

  revalidatePath(`/prestamos-terceros/${lenderId}`);
  revalidatePath(`/prestamos-terceros/${lenderId}/prestamos/${loanId}`);
}
