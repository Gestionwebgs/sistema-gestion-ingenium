import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BUSINESS_LINES = [
  "Ingeniería de Proyectos",
  "Obras Civiles",
  "Obras de Metalmecánica",
  "Mantenimiento Industrial",
  "Servicios Generales",
];

async function main() {
  for (const name of BUSINESS_LINES) {
    await prisma.businessLine.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Líneas de negocio: ${BUSINESS_LINES.length} listas.`);

  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;
  if (!ownerEmail || !ownerPassword) {
    throw new Error(
      "Faltan SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD en el entorno (ver .env)."
    );
  }
  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      name: process.env.SEED_OWNER_NAME || "Ingenium Service SAC",
      email: ownerEmail,
      passwordHash,
      role: "OWNER",
    },
  });
  console.log(`Usuario owner listo: ${owner.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
