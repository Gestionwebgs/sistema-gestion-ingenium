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

export async function captureReceiptAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No se recibió ningún archivo");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || "image/jpeg";

  const fileKey = await uploadReceiptFile(
    buffer,
    contentType,
    extensionFor(contentType)
  );

  let ocr;
  try {
    ocr = await runOcr(buffer, contentType);
  } catch {
    ocr = {
      rawText: "",
      extractedDate: null,
      extractedAmount: null,
      extractedVendor: null,
      extractedDocumentNumber: null,
    };
  }

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
  const operationCode =
    String(formData.get("operationCode") ?? "").trim() || null;

  if (!description || amount <= 0) {
    throw new Error("Descripción y monto son requeridos");
  }

  const expense = await prisma.expense.create({
    data: {
      projectId,
      date,
      description,
      amount,
      paymentSource,
      operationCode,
      paidByUserId: paymentSource === "PERSONAL" ? session.user.id : null,
      paidByName:
        paymentSource === "PERSONAL" ? session.user.name : null,
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
