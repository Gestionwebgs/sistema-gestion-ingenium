"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

function parseContactFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const projectOrSite = String(formData.get("projectOrSite") ?? "").trim() || null;
  const serviceInCharge = String(formData.get("serviceInCharge") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!name || !companyName) {
    throw new Error("Nombre y empresa/cliente son requeridos");
  }

  return { name, companyName, projectOrSite, serviceInCharge, phone };
}

export async function createContactAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede registrar contactos");
  }

  await prisma.clientDirectoryContact.create({ data: parseContactFields(formData) });

  redirect("/contactos");
}

export async function updateContactAction(
  contactId: string,
  formData: FormData
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede editar contactos");
  }

  await prisma.clientDirectoryContact.update({
    where: { id: contactId },
    data: parseContactFields(formData),
  });

  redirect("/contactos");
}

export async function deleteContactAction(contactId: string) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede eliminar contactos");
  }

  await prisma.clientDirectoryContact.delete({ where: { id: contactId } });

  redirect("/contactos");
}
