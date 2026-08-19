// Import de una sola vez de la "LISTA DE PENDIENTES - INGENIUM SERVICE SAC -
// AGOSTO 2026.xlsx" real del cliente (hojas "PENDIENTES - PROYECTOS",
// "PENDIENTES - GESTION INTERNA" y "CONTACTOS CLIENTE"), a modo de datos
// iniciales para el módulo de Pendientes/Contactos.
//
// No es idempotente: correrlo dos veces duplica las tareas y contactos. Solo
// se necesita volver a correr en un entorno nuevo (ej. el segundo equipo
// para las demos) que todavía no tenga estos datos.
//   npx tsx scripts/import-pendientes-agosto-2026.ts
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Row = {
  task: string;
  contactName?: string;
  importance?: "ALTA" | "MEDIA" | "BAJA";
  responsibleName?: string;
  status?: "PENDIENTE" | "EN_CURSO" | "CERRADO";
  raisedDate?: string;
  dueDate?: string;
  notes?: string;
};

type Group = {
  section: "PROYECTOS" | "GESTION_INTERNA";
  groupName: string;
  rows: Row[];
};

const groups: Group[] = [
  {
    section: "PROYECTOS",
    groupName: "PAMOLSA",
    rows: [
      { task: "Visita tecnica en Pamolsa de Maximo y Raul", importance: "ALTA", responsibleName: "RAUL", status: "CERRADO" },
      { task: "Comprar plastico y cinta de embalaje y del mes para cerramiento Pamolsa", importance: "ALTA", responsibleName: "RAUL", status: "CERRADO" },
      { task: "Construccion de cerramiento Pamolsa", importance: "ALTA", responsibleName: "RAUL", status: "CERRADO", notes: "Pendiente comprar 15m de plastico." },
      { task: "Llevar autoperforantes y adaptador para taladro inalambrico", importance: "ALTA", responsibleName: "RAUL", status: "CERRADO" },
      { task: "Llevar taladro electrico y pernos de anclaje", importance: "ALTA", responsibleName: "RAUL", status: "CERRADO" },
      { task: "Certificados de trabajos de alto riesgo - Ingenium A&R SAC - Pamolsa", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO" },
      { task: "Seguimiento a gestion de induccion en Pamolsa de todo el personal", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO" },
      { task: "Buscar supervisor en Pamolsa", importance: "BAJA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Buscar PDR para Pamolsa", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO", notes: "Enviar solicitud en grupos de whatsapp y Anggie selecciona." },
      { task: "Calculo estructural de las cimentaciones en Pamolsa", importance: "ALTA", responsibleName: "RAUL", status: "EN_CURSO" },
      { task: "Elaboracion de planos de arquitectura y estructurales de Pamolsa", importance: "ALTA", responsibleName: "RAUL", status: "EN_CURSO" },
      { task: "Trazos y replanteo en Pamolsa", importance: "MEDIA", responsibleName: "RAUL", status: "CERRADO" },
      { task: "Verificar y dar seguimiento a los avances de la programacion (Gantt)", importance: "ALTA", responsibleName: "ANGGIE", status: "EN_CURSO" },
      { task: "Contrato con Marco", importance: "ALTA", responsibleName: "GRELIMAR", status: "PENDIENTE" },
      { task: "Entrega de los andamios", contactName: "Juan Carlos / Opcitec", importance: "MEDIA", responsibleName: "RAUL", status: "PENDIENTE" },
    ],
  },
  {
    section: "PROYECTOS",
    groupName: "QROMA - ÑAÑA",
    rows: [
      { task: "Lunes 3 de agosto - retirar elevador articulado", contactName: "Christian Florian", importance: "ALTA", status: "CERRADO" },
      { task: "Hacer informe de servicio de cambio de polipasto", contactName: "Christian Florian", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO" },
      { task: "Terminar el informe de servicio de cambio de sensores", contactName: "Christian Florian", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO" },
      { task: "Cotizacion de polipasto para mtto motores", contactName: "Christian Florian", importance: "ALTA", responsibleName: "RAUL", status: "CERRADO" },
      { task: "Solicitud de las HES (de sensores y cambio de polipasto)", contactName: "Christian Florian", importance: "ALTA", responsibleName: "GRELIMAR", status: "PENDIENTE", notes: "Pendiente por orden de compra." },
      { task: "OC de servicio de cambio de sensores e instalacion de polipasto", contactName: "Christian Florian / Luisa Alegria", importance: "ALTA", responsibleName: "GRELIMAR", status: "PENDIENTE", notes: "Pendiente por orden de compra." },
      { task: "Facturacion de servicio de cambio de sensores e instalacion de polipasto", contactName: "Christian Florian / Luisa Alegria", importance: "ALTA", responsibleName: "GRELIMAR", status: "PENDIENTE", notes: "Pendiente por orden de compra." },
      { task: "Cotizacion de tolva y sistema de vibracion linea Cygnus", contactName: "Christian Florian", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO" },
      { task: "Factoring de los 4 servicios (polipasto x2, brazo, sensor)", contactName: "Christian Florian", importance: "ALTA", responsibleName: "GRELIMAR", status: "PENDIENTE" },
      { task: "Acometida electrica de polipasto", contactName: "Christian Florian", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE", notes: "Falta recorrido en la SSEE." },
      { task: "Instalacion de brazo pivotante", contactName: "Christian Florian", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Instalacion de monorriel mtto de motor", contactName: "Christian Florian", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Cotizacion de pozo", contactName: "Christian Florian", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO" },
      { task: "Seguimiento para generacion de OC de servicios de muro", contactName: "Paolo", importance: "ALTA", responsibleName: "GRELIMAR", status: "EN_CURSO", notes: "Con el Ing. Paolo." },
      { task: "Seguimiento para generacion de OC de servicios de vaciado en piso", contactName: "Paolo", importance: "ALTA", responsibleName: "GRELIMAR", status: "EN_CURSO", notes: "Con el Ing. Paolo." },
      { task: "Cotizacion de instrumentacion de TK R95", contactName: "Paolo / Luisa Alegria", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Cotizacion de mejoras de sistema de bombeo en empaque Cygnus", contactName: "Christian Florian", importance: "ALTA", responsibleName: "ANGGIE", status: "PENDIENTE", notes: "Darle forma con Marcos." },
    ],
  },
  {
    section: "PROYECTOS",
    groupName: "QROMA - AGUSTINO",
    rows: [
      { task: "Cotizacion cimentaciones", contactName: "Jose Arellano", importance: "ALTA", responsibleName: "ANGGIE", status: "CERRADO" },
      { task: "Barandas", contactName: "Jose Arellano", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Acometida electrica", contactName: "Jose Arellano", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Cambio de motor", contactName: "Jose Arellano", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Seguimiento a cotizacion de extractores - laboratorio", contactName: "Mario", importance: "ALTA", responsibleName: "GRELIMAR", status: "EN_CURSO", notes: "Esperando el lunes 10 que llega el 10-12 de agosto." },
      { task: "Cotizacion de sistema ACI", contactName: "Diego Marquina", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
    ],
  },
  {
    section: "PROYECTOS",
    groupName: "LA FRAGARIA",
    rows: [
      { task: "Seguimiento a la ingenieria", contactName: "David / Wuolman", importance: "MEDIA", responsibleName: "RAUL", status: "EN_CURSO" },
      { task: "Actualizar cotizacion de construccion del local", contactName: "David / Wuolman", importance: "MEDIA", responsibleName: "ANGGIE", status: "PENDIENTE", notes: "Pendiente evaluacion por clientes para ejecutar actualizacion." },
    ],
  },
  {
    section: "PROYECTOS",
    groupName: "VIKINGO",
    rows: [
      { task: "Cotizacion de servicios varios en PTAR", contactName: "Mondelez / Alex Loo", importance: "MEDIA", responsibleName: "MERVIS", status: "PENDIENTE" },
      { task: "Cotizacion de Ingenieria nave Industrial Avivel", contactName: "Vikingo / Avivel", importance: "ALTA", responsibleName: "RAUL", status: "PENDIENTE" },
    ],
  },
  {
    section: "PROYECTOS",
    groupName: "CREANDO VALOR",
    rows: [
      { task: "Cotizacion de servicio de tuberia ACI", importance: "ALTA", responsibleName: "MERVIS", status: "PENDIENTE" },
    ],
  },
  {
    section: "GESTION_INTERNA",
    groupName: "GESTION DE FINANZAS Y CONTABLE",
    rows: [
      { task: "R.H Maximo", importance: "MEDIA", responsibleName: "GRELIMAR", status: "CERRADO" },
      { task: "Actualizar hojas de cuadro de control de finanzas de cada proyecto en ejecucion", importance: "ALTA", responsibleName: "GRELIMAR", status: "PENDIENTE" },
      { task: "Pasar facturas pendientes", importance: "MEDIA", responsibleName: "GRELIMAR", status: "EN_CURSO" },
    ],
  },
  {
    section: "GESTION_INTERNA",
    groupName: "GESTION DE SST",
    rows: [
      { task: "Buscar PDR", importance: "ALTA", status: "PENDIENTE" },
    ],
  },
  {
    section: "GESTION_INTERNA",
    groupName: "GESTION ADMINISTRATIVA",
    rows: [
      { task: "Acomodar carpetas en laptop", status: "PENDIENTE" },
      { task: "Gestion de ingreso a Nestle", importance: "MEDIA", responsibleName: "RAUL", status: "PENDIENTE" },
      { task: "Gestion de Machu Picchu", importance: "MEDIA", responsibleName: "MERVIS", status: "PENDIENTE" },
      { task: "Gestion de Linde", status: "PENDIENTE" },
      { task: "Actualizar cuadro de cotizaciones - Adrian", status: "PENDIENTE" },
      { task: "Actualizar cuadro de proyectos en ejecucion", status: "PENDIENTE" },
      { task: "Ingresar a Anggie a planilla", importance: "ALTA", responsibleName: "GRELIMAR", status: "CERRADO", raisedDate: "2026-08-03" },
      { task: "Llevar control de asistencia", status: "PENDIENTE" },
    ],
  },
  {
    section: "GESTION_INTERNA",
    groupName: "GESTION DE PUBLICIDAD",
    rows: [
      { task: "Actualizar brochure ISS", status: "PENDIENTE" },
      { task: "Automatizacion N8N", status: "PENDIENTE" },
      { task: "Actualizar pagina web", status: "PENDIENTE" },
      { task: "Servicio de marketing de la empresa", importance: "MEDIA", responsibleName: "RAUL", status: "PENDIENTE" },
    ],
  },
];

const contacts = [
  { name: "Jose Arellano", companyName: "QROMA", projectOrSite: "Lurigancho / El Agustino", serviceInCharge: "Cimentaciones, barandas, acometida electrica, cambio de motor" },
  { name: "Christian Florian", companyName: "QROMA", projectOrSite: "Ñaña", serviceInCharge: "Mantenimiento de polipasto, sensores, cotizaciones e informes de servicio" },
  { name: "Luisa Alegria", companyName: "QROMA", projectOrSite: "Ñaña", serviceInCharge: "OC y facturacion de los servicios de Christian Florian" },
  { name: "Paolo", companyName: "QROMA", projectOrSite: "Ñaña", serviceInCharge: "Seguimiento de OC (servicios de muro, vaciado de piso, instrumentacion TK R95)" },
  { name: "Mario", companyName: "QROMA", projectOrSite: "El Agustino", serviceInCharge: "Seguimiento a cotizacion de extractores - laboratorio" },
  { name: "Camila Flores", companyName: "Ingenium A&R SAC", serviceInCharge: "Gestion de EMO y SST" },
  { name: "David Oliveros", companyName: "Distribuidora Wady S.A.C.", projectOrSite: "La Fragaria - Jockey Plaza", serviceInCharge: "Contacto del proyecto de modulo comercial (Food Hall)" },
];

async function main() {
  const owner = await prisma.user.findFirstOrThrow({ where: { role: "OWNER" } });

  let taskCount = 0;
  for (const group of groups) {
    let sortOrder = 0;
    for (const row of group.rows) {
      await prisma.pendingTask.create({
        data: {
          section: group.section,
          groupName: group.groupName,
          sortOrder: sortOrder++,
          task: row.task,
          contactName: row.contactName ?? null,
          importance: row.importance ?? null,
          responsibleName: row.responsibleName ?? null,
          status: row.status ?? "PENDIENTE",
          raisedDate: row.raisedDate ? new Date(row.raisedDate) : null,
          dueDate: row.dueDate ? new Date(row.dueDate) : null,
          notes: row.notes ?? null,
          createdByUserId: owner.id,
        },
      });
      taskCount++;
    }
  }

  await prisma.clientDirectoryContact.createMany({ data: contacts });

  console.log(`Importadas ${taskCount} tareas y ${contacts.length} contactos.`);
}

main().finally(() => prisma.$disconnect());
