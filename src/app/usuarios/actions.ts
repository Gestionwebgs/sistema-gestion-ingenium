"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function createUserAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede crear usuarios");
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "RESPONSABLE") as
    | "OWNER"
    | "RESPONSABLE";

  if (!name || !email || password.length < 8) {
    throw new Error(
      "Nombre, correo y una contraseña de al menos 8 caracteres son requeridos"
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  redirect("/usuarios");
}
