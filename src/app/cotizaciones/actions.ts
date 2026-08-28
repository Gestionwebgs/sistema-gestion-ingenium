"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const IGV_RATE = 0.18;

function parseQuoteFields(formData: FormData) {
  const clientName = String(formData.get("clientName") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim() || null;
  const code = String(formData.get("code") ?? "").trim();
  const project = String(formData.get("project") ?? "").trim();
  const amountNoIgv = Number(formData.get("amountNoIgv") ?? 0) || 0;
  const igvAmount = Math.round(amountNoIgv * IGV_RATE * 100) / 100;
  const stage = String(formData.get("stage") ?? "ENVIADA") as
    | "ENVIADA"
    | "EN_EVALUACION"
    | "OC_RECIBIDA"
    | "PAGADA"
    | "RECHAZADA";
  const quoteDateRaw = String(formData.get("quoteDate") ?? "");
  const quoteDate = quoteDateRaw ? new Date(quoteDateRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!clientName || !code || !project) {
    throw new Error("Cliente, N° de cotización y proyecto son requeridos");
  }
  if (amountNoIgv <= 0) {
    throw new Error("El monto sin IGV debe ser mayor a cero");
  }

  return {
    clientName,
    contactName,
    code,
    project,
    amountNoIgv,
    igvAmount,
    stage,
    quoteDate,
    notes,
  };
}

export async function createQuoteAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar cotizaciones");
  }

  const fields = parseQuoteFields(formData);

  await prisma.quote.create({
    data: { ...fields, createdByUserId: session.user.id },
  });

  redirect("/cotizaciones");
}

export async function updateQuoteAction(quoteId: string, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar cotizaciones");
  }

  const fields = parseQuoteFields(formData);

  await prisma.quote.update({ where: { id: quoteId }, data: fields });

  redirect("/cotizaciones");
}

export async function deleteQuoteAction(quoteId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar cotizaciones");
  }

  await prisma.quote.delete({ where: { id: quoteId } });

  redirect("/cotizaciones");
}
