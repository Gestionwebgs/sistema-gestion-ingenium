"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function updateIncomeAction(incomeId: string, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar abonos");
  }

  const date = new Date(String(formData.get("date") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number(formData.get("amount") ?? 0) || 0;

  if (!description || amount <= 0) {
    throw new Error("Descripción y monto son requeridos");
  }

  const income = await prisma.income.update({
    where: { id: incomeId },
    data: { date, description, amount },
  });

  if (income.projectId) {
    revalidatePath(`/proyectos/${income.projectId}`);
  }
}
