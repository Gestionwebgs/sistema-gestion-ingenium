"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { uploadReceiptFile } from "@/lib/s3";
import { runOcr } from "@/lib/ocr";

function extensionFor(contentType: string): string {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export async function captureReceiptAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No se recibió ningún archivo");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  let fileKey: string;
  try {
    fileKey = await uploadReceiptFile(
      buffer,
      contentType,
      extensionFor(contentType)
    );
  } catch (error) {
    console.error("captureReceiptAction: upload to S3/MinIO failed", error);
    return {
      ok: false,
      error:
        "No se pudo subir el archivo al almacenamiento. Revisa que el servicio de archivos (S3/MinIO) esté disponible.",
    };
  }

  let ocr;
  try {
    ocr = await runOcr(buffer, contentType);
  } catch (error) {
    console.error("captureReceiptAction: OCR failed", error);
    ocr = {
      rawText: "",
      extractedDate: null,
      extractedAmount: null,
      extractedVendor: null,
      extractedDocumentNumber: null,
    };
  }

  try {
    await prisma.expenseCapture.create({
      data: {
        capturedByUserId: session.user.id,
        fileKey,
        fileType: contentType,
        ocrRawText: ocr.rawText || null,
        ocrExtractedDate: ocr.extractedDate,
        ocrExtractedAmount: ocr.extractedAmount,
        ocrExtractedVendor: ocr.extractedVendor,
        ocrExtractedDocumentNumber: ocr.extractedDocumentNumber,
      },
    });
  } catch (error) {
    console.error("captureReceiptAction: saving to database failed", error);
    return {
      ok: false,
      error: "El archivo se subió, pero no se pudo guardar en la base de datos.",
    };
  }

  revalidatePath("/capturas");
  return { ok: true };
}

export async function classifyCaptureAction(
  captureId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const capture = await prisma.expenseCapture.findUnique({
    where: { id: captureId },
  });
  if (!capture || capture.capturedByUserId !== session.user.id) {
    throw new Error("Captura no encontrada");
  }

  const projectId = String(formData.get("projectId") ?? "").trim() || null;
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
  const operationCode =
    String(formData.get("operationCode") ?? "").trim() || null;
  const paidByNameManual = String(formData.get("paidByNameManual") ?? "").trim();
  const paidByUserIdRaw = String(formData.get("paidByUserId") ?? "").trim();

  if (!description || amount <= 0) {
    throw new Error("Descripción y monto son requeridos");
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

  const expense = await prisma.expense.create({
    data: {
      projectId,
      date,
      description,
      amount,
      paymentSource,
      paymentMethod,
      operationCode,
      paidByUserId,
      paidByName,
      createdByUserId: session.user.id,
      attachments: {
        create: {
          fileKey: capture.fileKey,
          fileType: capture.fileType,
          uploadedByUserId: session.user.id,
        },
      },
    },
  });

  await prisma.expenseCapture.update({
    where: { id: captureId },
    data: {
      status: "CLASIFICADO",
      expenseId: expense.id,
      classifiedAt: new Date(),
    },
  });

  revalidatePath("/capturas");
  if (projectId) revalidatePath(`/proyectos/${projectId}`);
}

// Descarte reversible de una captura pendiente (ej. el OCR no leyó nada útil
// y no corresponde a un gasto real). No borra la fila ni el archivo en
// S3/MinIO — solo la saca de "pendientes" y deja registrado quién y cuándo,
// para poder auditar o recuperar si hace falta. Solo puede descartarla quien
// la capturó, o el OWNER.
export async function discardCaptureAction(captureId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const capture = await prisma.expenseCapture.findUnique({
    where: { id: captureId },
  });
  if (!capture) throw new Error("Captura no encontrada");

  const isOwnCapture = capture.capturedByUserId === session.user.id;
  const isOwner = session.user.role === "OWNER";
  if (!isOwnCapture && !isOwner) {
    throw new Error("No tenés permiso para descartar esta captura");
  }
  if (capture.status !== "PENDIENTE") {
    throw new Error("Esta captura ya fue clasificada o descartada");
  }

  await prisma.expenseCapture.update({
    where: { id: captureId },
    data: {
      status: "DESCARTADA",
      discardedAt: new Date(),
      discardedByUserId: session.user.id,
    },
  });

  revalidatePath("/capturas");
}
