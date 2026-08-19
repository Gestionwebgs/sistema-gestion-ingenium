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
  const paidByNameManual = String(formData.get("paidByNameManual") ?? "").trim();
  const paidByUserIdRaw = String(formData.get("paidByUserId") ?? "").trim();

  if (!description || amount <= 0) return;

  // Quién hizo la compra — sin importar la fuente de pago (empresa o
  // personal), para saber siempre a quién atribuirla. Si no tiene cuenta en
  // el sistema (ej. un capataz de obra), se registra solo el nombre.
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
      projectId,
      date,
      description,
      amount,
      paymentSource,
      paymentMethod,
      paidByUserId,
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
