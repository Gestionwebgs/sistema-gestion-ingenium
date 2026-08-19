"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const IGV_RATE = 0.18;

export async function createProjectAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }

  const name = String(formData.get("name") ?? "").trim();
  const businessLineId = String(formData.get("businessLineId") ?? "").trim();
  if (!name || !businessLineId) {
    throw new Error("Nombre y línea de negocio son requeridos");
  }

  const location = String(formData.get("location") ?? "").trim() || null;
  const clientBusinessName = String(formData.get("clientBusinessName") ?? "").trim();
  const clientRuc = String(formData.get("clientRuc") ?? "").trim() || null;
  const clientContactName = String(formData.get("clientContactName") ?? "").trim();
  const responsibleName = String(formData.get("responsibleName") ?? "").trim() || null;
  const purchaseOrderNumber = String(formData.get("purchaseOrderNumber") ?? "").trim() || null;

  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");
  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;

  const orderAmountNoIgv = Number(formData.get("orderAmountNoIgv") ?? 0) || 0;
  const igvAmount = Math.round(orderAmountNoIgv * IGV_RATE * 100) / 100;

  let clientId: string | undefined;
  let clientContactId: string | undefined;

  if (clientBusinessName) {
    let client = await prisma.client.findFirst({
      where: { businessName: clientBusinessName },
    });
    if (!client) {
      client = await prisma.client.create({
        data: { businessName: clientBusinessName, ruc: clientRuc },
      });
    } else if (clientRuc && clientRuc !== client.ruc) {
      // El cliente ya existía (ej. de otro proyecto) pero esta vez sí se
      // escribió el RUC — lo completamos/actualizamos en vez de perderlo.
      client = await prisma.client.update({
        where: { id: client.id },
        data: { ruc: clientRuc },
      });
    }
    clientId = client.id;

    if (clientContactName) {
      let contact = await prisma.clientContact.findFirst({
        where: { clientId: client.id, name: clientContactName },
      });
      if (!contact) {
        contact = await prisma.clientContact.create({
          data: { clientId: client.id, name: clientContactName },
        });
      }
      clientContactId = contact.id;
    }
  }

  const project = await prisma.project.create({
    data: {
      name,
      location,
      clientId,
      clientContactId,
      businessLineId,
      responsibleName,
      purchaseOrderNumber,
      startDate,
      endDate,
      orderAmountNoIgv,
      igvAmount,
    },
  });

  redirect(`/proyectos/${project.id}`);
}

export async function updateProjectAction(
  projectId: string,
  formData: FormData
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("No autenticado");
  }

  const existing = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });

  const name = String(formData.get("name") ?? "").trim();
  const businessLineId = String(formData.get("businessLineId") ?? "").trim();
  if (!name || !businessLineId) {
    throw new Error("Nombre y línea de negocio son requeridos");
  }

  const location = String(formData.get("location") ?? "").trim() || null;
  const clientBusinessName = String(formData.get("clientBusinessName") ?? "").trim();
  const clientRuc = String(formData.get("clientRuc") ?? "").trim() || null;
  const clientContactName = String(formData.get("clientContactName") ?? "").trim();
  const responsibleName = String(formData.get("responsibleName") ?? "").trim() || null;
  const purchaseOrderNumber = String(formData.get("purchaseOrderNumber") ?? "").trim() || null;

  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");
  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const endDate = endDateRaw ? new Date(endDateRaw) : null;

  const orderAmountNoIgv = Number(formData.get("orderAmountNoIgv") ?? 0) || 0;
  const igvAmount = Math.round(orderAmountNoIgv * IGV_RATE * 100) / 100;

  let clientId: string | undefined;
  let clientContactId: string | undefined;

  if (clientBusinessName) {
    let client = await prisma.client.findFirst({
      where: { businessName: clientBusinessName },
    });
    if (!client) {
      client = await prisma.client.create({
        data: { businessName: clientBusinessName, ruc: clientRuc },
      });
    } else if (clientRuc && clientRuc !== client.ruc) {
      client = await prisma.client.update({
        where: { id: client.id },
        data: { ruc: clientRuc },
      });
    }
    clientId = client.id;

    if (clientContactName) {
      let contact = await prisma.clientContact.findFirst({
        where: { clientId: client.id, name: clientContactName },
      });
      if (!contact) {
        contact = await prisma.clientContact.create({
          data: { clientId: client.id, name: clientContactName },
        });
      }
      clientContactId = contact.id;
    }
  }

  // Si el monto de la orden cambió, queda un registro del cambio (adicional/
  // ampliación) antes de sobrescribir el valor actual del proyecto.
  const amountChanged =
    Number(existing.orderAmountNoIgv) !== orderAmountNoIgv ||
    Number(existing.igvAmount) !== igvAmount;
  if (amountChanged) {
    await prisma.projectOrderRevision.create({
      data: {
        projectId,
        date: new Date(),
        orderAmountNoIgv,
        igvAmount,
        reason: "Editado desde la ficha del proyecto",
        createdByUserId: session.user.id,
      },
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name,
      location,
      clientId,
      clientContactId,
      businessLineId,
      responsibleName,
      purchaseOrderNumber,
      startDate,
      endDate,
      orderAmountNoIgv,
      igvAmount,
    },
  });

  redirect(`/proyectos/${projectId}`);
}
