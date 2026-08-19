"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const STATUS_CYCLE = ["PENDIENTE", "EN_CURSO", "CERRADO"] as const;

function parseTaskFields(formData: FormData) {
  const section = String(formData.get("section") ?? "PROYECTOS") as
    | "PROYECTOS"
    | "GESTION_INTERNA";
  const groupName = String(formData.get("groupName") ?? "").trim();
  const task = String(formData.get("task") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim() || null;
  const importanceRaw = String(formData.get("importance") ?? "").trim();
  const importance = importanceRaw
    ? (importanceRaw as "ALTA" | "MEDIA" | "BAJA")
    : null;
  const responsibleName =
    String(formData.get("responsibleName") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "PENDIENTE") as
    | "PENDIENTE"
    | "EN_CURSO"
    | "CERRADO";
  const raisedDateRaw = String(formData.get("raisedDate") ?? "");
  const raisedDate = raisedDateRaw ? new Date(raisedDateRaw) : null;
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!groupName || !task) {
    throw new Error("Grupo y tarea son requeridos");
  }

  return {
    section,
    groupName,
    task,
    contactName,
    importance,
    responsibleName,
    status,
    raisedDate,
    dueDate,
    notes,
  };
}

export async function createPendingTaskAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar pendientes");
  }

  const fields = parseTaskFields(formData);

  const lastInGroup = await prisma.pendingTask.findFirst({
    where: { section: fields.section, groupName: fields.groupName },
    orderBy: { sortOrder: "desc" },
  });

  await prisma.pendingTask.create({
    data: {
      ...fields,
      sortOrder: (lastInGroup?.sortOrder ?? -1) + 1,
      createdByUserId: session.user.id,
    },
  });

  redirect("/pendientes");
}

export async function updatePendingTaskAction(
  taskId: string,
  formData: FormData
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar pendientes");
  }

  const fields = parseTaskFields(formData);

  await prisma.pendingTask.update({
    where: { id: taskId },
    data: fields,
  });

  redirect("/pendientes");
}

export async function deletePendingTaskAction(taskId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar pendientes");
  }

  await prisma.pendingTask.delete({ where: { id: taskId } });

  redirect("/pendientes");
}

export async function cycleTaskStatusAction(taskId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede actualizar pendientes");
  }

  const task = await prisma.pendingTask.findUniqueOrThrow({
    where: { id: taskId },
  });
  const nextIndex =
    (STATUS_CYCLE.indexOf(task.status) + 1) % STATUS_CYCLE.length;

  await prisma.pendingTask.update({
    where: { id: taskId },
    data: { status: STATUS_CYCLE[nextIndex] },
  });

  revalidatePath("/pendientes");
}
