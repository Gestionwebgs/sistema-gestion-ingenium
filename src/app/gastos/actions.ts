"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { uploadReceiptFile, extensionForContentType } from "@/lib/s3";

export async function updateExpenseAction(expenseId: string, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar gastos");
  }

  const date = new Date(String(formData.get("date") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const operationCode = String(formData.get("operationCode") ?? "").trim() || null;
  const amount = Number(formData.get("amount") ?? 0) || 0;
  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  const paymentSource = String(formData.get("paymentSource") ?? "EMPRESA") as
    | "PERSONAL"
    | "EMPRESA";
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "");
  const paymentMethod = paymentMethodRaw
    ? (paymentMethodRaw as "EFECTIVO" | "YAPE_PLIN" | "TRANSFERENCIA" | "TARJETA" | "OTRO")
    : null;
  const paidByNameManual = String(formData.get("paidByNameManual") ?? "").trim();
  const paidByUserIdRaw = String(formData.get("paidByUserId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!description || amount <= 0) {
    throw new Error("Descripción y monto son requeridos");
  }

  let paidByUserId: string | null = null;
  let paidByName: string | null;
  if (paidByNameManual) {
    paidByName = paidByNameManual;
  } else if (paidByUserIdRaw) {
    const paidByUser = await prisma.user.findUniqueOrThrow({
      where: { id: paidByUserIdRaw },
    });
    paidByUserId = paidByUser.id;
    paidByName = paidByUser.name;
  } else {
    paidByName = null;
  }

  // Comprobante nuevo (opcional): se agrega como un adjunto más del gasto,
  // sin borrar los que ya tenía — así no se pierde el comprobante original
  // si alguien sube uno adicional por error.
  let fileKey: string | null = null;
  let fileType: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    fileType = file.type || "image/jpeg";
    try {
      fileKey = await uploadReceiptFile(
        buffer,
        fileType,
        extensionForContentType(fileType)
      );
    } catch (error) {
      console.error("updateExpenseAction: upload to S3/MinIO failed", error);
      throw new Error(
        "No se pudo subir el comprobante. Revisa que el servicio de archivos esté disponible e inténtalo de nuevo."
      );
    }
  }

  const expense = await prisma.expense.update({
    where: { id: expenseId },
    data: {
      date,
      description,
      operationCode,
      amount,
      projectId,
      paymentSource,
      paymentMethod,
      paidByUserId,
      paidByName,
      notes,
      ...(fileKey
        ? {
            attachments: {
              create: {
                fileKey,
                fileType,
                uploadedByUserId: session.user.id,
              },
            },
          }
        : {}),
    },
  });

  redirect(expense.projectId ? `/proyectos/${expense.projectId}` : "/gastos");
}
