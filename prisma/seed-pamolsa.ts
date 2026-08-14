import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

// Script puntual para cargar el proyecto real "CIMENTACION / PAMOLSA" como
// demo, a partir de los datos generales del Excel del cliente. Los gastos y
// abonos NO se cargan acá a propósito — se ingresan a mano desde la interfaz.
// Podés correr este script varias veces sin miedo: no duplica nada si el
// cliente/contacto/proyecto ya existen.

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const businessLine = await prisma.businessLine.findUnique({
    where: { name: "Obras Civiles" },
  });
  if (!businessLine) {
    throw new Error(
      "No se encontró la línea de negocio 'Obras Civiles'. Corré primero `npx prisma db seed`."
    );
  }

  let client = await prisma.client.findFirst({ where: { businessName: "QROMA" } });
  if (!client) {
    client = await prisma.client.create({ data: { businessName: "QROMA" } });
    console.log(`Cliente creado: ${client.businessName} (id: ${client.id})`);
  } else {
    console.log(`Cliente ya existía: ${client.businessName} (id: ${client.id})`);
  }

  let contact = await prisma.clientContact.findFirst({
    where: { clientId: client.id, name: "MARCO" },
  });
  if (!contact) {
    contact = await prisma.clientContact.create({
      data: { clientId: client.id, name: "MARCO" },
    });
    console.log(`Contacto creado: ${contact.name} (id: ${contact.id})`);
  } else {
    console.log(`Contacto ya existía: ${contact.name} (id: ${contact.id})`);
  }

  let project = await prisma.project.findFirst({
    where: { name: "CIMENTACION", location: "PAMOLSA" },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "CIMENTACION",
        location: "PAMOLSA",
        clientId: client.id,
        clientContactId: contact.id,
        businessLineId: businessLine.id,
        responsibleName: "RAUL QUINTERO",
        orderAmountNoIgv: 33827.88,
        igvAmount: 6089.02,
      },
    });
    console.log(`Proyecto creado: ${project.name} / ${project.location} (id: ${project.id})`);
  } else {
    console.log(`El proyecto ya existía (id: ${project.id}), no se tocó nada.`);
  }

  console.log("Listo. Los gastos y abonos se cargan a mano desde la interfaz.");
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
