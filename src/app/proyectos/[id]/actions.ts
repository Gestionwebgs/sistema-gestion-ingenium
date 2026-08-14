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
  const paidByName = String(formData.get("paidByName") ?? "").trim() || null;

  if (!description || amount <= 0) return;

  await prisma.expense.create({
    data: {
      projectId,
      date,
      description,
      amount,
      paymentSource,
      paidByName,
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
