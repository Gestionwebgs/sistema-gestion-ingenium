import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Descarga en .xlsx la lista de Pendientes filtrada por responsable y/o
// estado — el mismo filtro que ya se aplica en pantalla (/pendientes), para
// poder mandarle a alguien, por ejemplo, "los pendientes en curso de Raúl".
// Solo OWNER. GET /api/pendientes/export?responsable=Raúl&estado=EN_CURSO
export const runtime = "nodejs";

const VALID_STATUSES = new Set(["PENDIENTE", "EN_CURSO", "CERRADO"]);

const SECTION_LABELS: Record<string, string> = {
  PROYECTOS: "Proyectos",
  GESTION_INTERNA: "Gestión interna",
};

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  EN_CURSO: "En curso",
  CERRADO: "Cerrado",
};

function sanitizeForFilename(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

const formatDate = (date: Date | null) =>
  date ? new Date(date).toLocaleDateString("es-PE", { timeZone: "UTC" }) : "";

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    return new Response("No autorizado", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const responsable = searchParams.get("responsable") || null;
  const estadoParam = searchParams.get("estado") || null;
  const estado =
    estadoParam && VALID_STATUSES.has(estadoParam) ? estadoParam : null;

  const filter = {
    ...(responsable ? { responsibleName: responsable } : {}),
    ...(estado
      ? { status: estado as "PENDIENTE" | "EN_CURSO" | "CERRADO" }
      : {}),
  };

  const tasks = await prisma.pendingTask.findMany({
    where: filter,
    orderBy: [
      { section: "asc" },
      { groupName: "asc" },
      { sortOrder: "asc" },
    ],
  });

  if (tasks.length === 0) {
    return new Response("No hay pendientes para ese filtro.", {
      status: 404,
    });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pendientes");

  sheet.columns = [
    { header: "Sección", key: "section", width: 16 },
    { header: "Grupo", key: "group", width: 24 },
    { header: "Tarea", key: "task", width: 45 },
    { header: "Contacto", key: "contact", width: 20 },
    { header: "Importancia", key: "importance", width: 12 },
    { header: "Responsable", key: "responsible", width: 18 },
    { header: "Estado", key: "status", width: 12 },
    { header: "Fecha planteada", key: "raisedDate", width: 16 },
    { header: "Fecha vencimiento", key: "dueDate", width: 16 },
    { header: "Notas", key: "notes", width: 35 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const task of tasks) {
    sheet.addRow({
      section: SECTION_LABELS[task.section] ?? task.section,
      group: task.groupName,
      task: task.task,
      contact: task.contactName ?? "",
      importance: task.importance ?? "",
      responsible: task.responsibleName ?? "",
      status: STATUS_LABELS[task.status] ?? task.status,
      raisedDate: formatDate(task.raisedDate),
      dueDate: formatDate(task.dueDate),
      notes: task.notes ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const nameParts = ["pendientes"];
  if (responsable) nameParts.push(sanitizeForFilename(responsable));
  if (estado) nameParts.push(sanitizeForFilename(STATUS_LABELS[estado]));
  const fileName = `${nameParts.join("_")}.xlsx`;

  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
