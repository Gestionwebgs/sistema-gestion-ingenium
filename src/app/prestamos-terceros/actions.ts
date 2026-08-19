"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function parseLoanFields(formData: FormData) {
  const lenderName = String(formData.get("lenderName") ?? "").trim();
  const borrowerUserId =
    String(formData.get("borrowerUserId") ?? "").trim() || null;
  const amount = Number(formData.get("amount") ?? 0) || 0;
  const currency = String(formData.get("currency") ?? "PEN") as "PEN" | "USD";
  const interestAmountRaw = String(formData.get("interestAmount") ?? "").trim();
  const interestAmount = interestAmountRaw ? Number(interestAmountRaw) : null;
  const interestCurrency = interestAmountRaw
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

  if (!lenderName || amount <= 0) {
    throw new Error("Prestamista y monto son requeridos");
  }

  return {
    lenderName,
    borrowerUserId,
    amount,
    currency,
    interestAmount,
    interestCurrency,
    bankCommission,
    bankCommissionCurrency,
    loanDate,
    dueDate,
    notes,
  };
}

export async function createLoanAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar préstamos");
  }

  const fields = parseLoanFields(formData);

  const loan = await prisma.loan.create({
    data: { ...fields, createdByUserId: session.user.id },
  });

  redirect(`/prestamos-terceros/${loan.id}`);
}

export async function updateLoanAction(loanId: string, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar préstamos");
  }

  const fields = parseLoanFields(formData);

  await prisma.loan.update({ where: { id: loanId }, data: fields });

  redirect(`/prestamos-terceros/${loanId}`);
}

export async function deleteLoanAction(loanId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar préstamos");
  }

  await prisma.loanPayment.deleteMany({ where: { loanId } });
  await prisma.loan.delete({ where: { id: loanId } });

  redirect("/prestamos-terceros");
}

export async function toggleLoanStatusAction(loanId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede actualizar préstamos");
  }

  const loan = await prisma.loan.findUniqueOrThrow({ where: { id: loanId } });
  await prisma.loan.update({
    where: { id: loanId },
    data: { status: loan.status === "PENDIENTE" ? "PAGADO" : "PENDIENTE" },
  });

  revalidatePath("/prestamos-terceros");
  revalidatePath(`/prestamos-terceros/${loanId}`);
}

export async function createLoanPaymentAction(
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

  revalidatePath(`/prestamos-terceros/${loanId}`);
}

export async function deleteLoanPaymentAction(
  loanId: string,
  paymentId: string
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar abonos");
  }

  await prisma.loanPayment.delete({ where: { id: paymentId } });

  revalidatePath(`/prestamos-terceros/${loanId}`);
}
