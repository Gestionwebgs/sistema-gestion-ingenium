"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const IGV_RATE = 0.18;

function parseInvoiceFields(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "").trim() || null;
  const purchaseOrderNumber =
    String(formData.get("purchaseOrderNumber") ?? "").trim() || null;
  const quoteCode = String(formData.get("quoteCode") ?? "").trim() || null;
  const solicitantName = String(formData.get("solicitantName") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();
  const amountNet = Number(formData.get("amountNet") ?? 0) || 0;
  const igvAmount = Math.round(amountNet * IGV_RATE * 100) / 100;
  const detractionPercentRaw = Number(formData.get("detractionPercent") ?? 12) || 0;
  const detractionPercent = detractionPercentRaw / 100;
  const hesRequested = formData.get("hesRequested") === "on";
  const hesRequestedDateRaw = String(formData.get("hesRequestedDate") ?? "");
  const hesRequestedDate = hesRequestedDateRaw ? new Date(hesRequestedDateRaw) : null;
  const hesReceived = formData.get("hesReceived") === "on";
  const invoiceEnteredDateRaw = String(formData.get("invoiceEnteredDate") ?? "");
  const invoiceEnteredDate = invoiceEnteredDateRaw ? new Date(invoiceEnteredDateRaw) : null;
  const paid = formData.get("paid") === "on";
  const paidDateRaw = String(formData.get("paidDate") ?? "");
  const paidDate = paidDateRaw ? new Date(paidDateRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!description) {
    throw new Error("La descripción es requerida");
  }
  if (amountNet <= 0) {
    throw new Error("El monto neto debe ser mayor a cero");
  }

  return {
    projectId,
    purchaseOrderNumber,
    quoteCode,
    solicitantName,
    description,
    amountNet,
    igvAmount,
    detractionPercent,
    hesRequested,
    hesRequestedDate,
    hesReceived,
    invoiceEnteredDate,
    paid,
    paidDate,
    notes,
  };
}

export async function createInvoiceAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar facturas");
  }

  const fields = parseInvoiceFields(formData);

  await prisma.invoice.create({
    data: { ...fields, createdByUserId: session.user.id },
  });

  redirect(fields.projectId ? `/proyectos/${fields.projectId}` : "/facturacion");
}

export async function updateInvoiceAction(invoiceId: string, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar facturas");
  }

  const fields = parseInvoiceFields(formData);

  await prisma.invoice.update({ where: { id: invoiceId }, data: fields });

  redirect(fields.projectId ? `/proyectos/${fields.projectId}` : "/facturacion");
}

export async function deleteInvoiceAction(invoiceId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar facturas");
  }

  const invoice = await prisma.invoice.delete({ where: { id: invoiceId } });

  redirect(invoice.projectId ? `/proyectos/${invoice.projectId}` : "/facturacion");
}
