"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { uploadReceiptFile, extensionForContentType } from "@/lib/s3";

export async function addExpenseAction(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const date = new Date(String(formData.get("date") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const operationCode = String(formData.get("operationCode") ?? "").trim() || null;
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

  // Comprobante (foto o PDF) adjunto al registrar el gasto manualmente —
  // opcional, mismo storage (S3/MinIO) que usa la captura por OCR.
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
      console.error("addExpenseAction: upload to S3/MinIO failed", error);
      throw new Error(
        "No se pudo subir el comprobante. Revisa que el servicio de archivos esté disponible e inténtalo de nuevo."
      );
    }
  }

  await prisma.expense.create({
    data: {
      projectId,
      date,
      description,
      operationCode,
      amount,
      paymentSource,
      paymentMethod,
      paidByUserId,
      paidByName,
      createdByUserId: session.user.id,
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

  revalidatePath(`/proyectos/${projectId}`);
}

const IGV_RATE = 0.18;

export async function addInvoiceAction(projectId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const purchaseOrderNumber =
    String(formData.get("purchaseOrderNumber") ?? "").trim() || null;
  const quoteCode = String(formData.get("quoteCode") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const amountNet = Number(formData.get("amountNet") ?? 0) || 0;

  if (!description || amountNet <= 0) return;

  const igvAmount = Math.round(amountNet * IGV_RATE * 100) / 100;

  await prisma.invoice.create({
    data: {
      projectId,
      purchaseOrderNumber,
      quoteCode,
      description,
      amountNet,
      igvAmount,
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
