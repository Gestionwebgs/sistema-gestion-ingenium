"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function createLoanAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar préstamos");
  }

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
  const loanDate = new Date(String(formData.get("loanDate") ?? ""));
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!lenderName || amount <= 0) {
    throw new Error("Prestamista y monto son requeridos");
  }

  await prisma.loan.create({
    data: {
      lenderName,
      borrowerUserId,
      amount,
      currency,
      interestAmount,
      interestCurrency,
      loanDate,
      dueDate,
      notes,
      createdByUserId: session.user.id,
    },
  });

  redirect("/prestamos");
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

  revalidatePath("/prestamos");
}
