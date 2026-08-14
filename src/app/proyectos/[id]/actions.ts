"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function addExpenseAction(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const date = new Date(String(formData.get("date") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0) || 0;
  const paymentSource = String(formData.get("paymentSource") ?? "EMPRESA") as
    | "PERSONAL"
    | "EMPRESA";
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "");
  const paymentMethod = paymentMethodRaw
    ? (paymentMethodRaw as "EFECTIVO" | "YAPE_PLIN" | "TRANSFERENCIA" | "TARJETA" | "OTRO")
    : null;
  const paidByUserId =
    String(formData.get("paidByUserId") ?? "").trim() || session.user.id;

  if (!description || amount <= 0) return;

  const paidByUser = await prisma.user.findUniqueOrThrow({
    where: { id: paidByUserId },
  });

  await prisma.expense.create({
    data: {
      projectId,
      date,
      description,
      amount,
      paymentSource,
      paymentMethod,
      // Quién hizo la compra — sin importar la fuente de pago (empresa o
      // personal), para saber siempre a quién atribuirla.
      paidByUserId: paidByUser.id,
      paidByName: paidByUser.name,
      createdByUserId: session.user.id,
    },
  });

  revalidatePath(`/proyectos/${projectId}`);
}

export async function addIncomeAction(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const date = new Date(String(formData.get("date") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0) || 0;

  if (!description || amount <= 0) return;

  await prisma.income.create({
    data: {
      projectId,
      date,
      description,
      amount,
      createdByUserId: session.user.id,
    },
  });

  revalidatePath(`/proyectos/${projectId}`);
}
