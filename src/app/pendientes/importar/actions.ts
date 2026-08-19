"use server";

import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

type CellValue = ExcelJS.CellValue;

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return "";
  const value: CellValue = cell.value;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value && value.result != null) return String(value.result).trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("").trim();
    }
  }
  return String(value).trim();
}

function cellDate(cell: ExcelJS.Cell | undefined): string | null {
  if (!cell || cell.value == null) return null;
  if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
  return null;
}

function normalizeImportance(text: string): "ALTA" | "MEDIA" | "BAJA" | null {
  const t = text.trim().toUpperCase();
  if (t === "ALTA" || t === "MEDIA" || t === "BAJA") return t;
  return null;
}

function normalizeStatus(text: string): "PENDIENTE" | "EN_CURSO" | "CERRADO" {
  const t = text.trim().toUpperCase();
  if (t === "CERRADO") return "CERRADO";
  if (t === "EN CURSO" || t === "EN_CURSO") return "EN_CURSO";
  return "PENDIENTE";
}

// Encuentra la fila de encabezados buscando una celda cuyo texto sea
// exactamente `label` (mayúsculas). Devuelve el número de fila o null.
function findHeaderRow(worksheet: ExcelJS.Worksheet, label: string): number | null {
  let found: number | null = null;
  worksheet.eachRow((row, rowNumber) => {
    if (found) return;
    row.eachCell((cell) => {
      if (cellText(cell).toUpperCase() === label) found = rowNumber;
    });
  });
  return found;
}

// Mapea cada columna del encabezado a una clave conocida, buscando por
// coincidencia parcial (los títulos reales varían en tildes/espacios entre
// archivos: "FECHA LIMITE" vs "FECHA LÍMITE", etc.).
function columnMap(
  worksheet: ExcelJS.Worksheet,
  headerRow: number,
  labelIncludes: [string, string][]
): Record<string, number> {
  const map: Record<string, number> = {};
  const row = worksheet.getRow(headerRow);
  row.eachCell((cell, colNumber) => {
    const text = cellText(cell).toUpperCase();
    for (const [needle, key] of labelIncludes) {
      if (text.includes(needle) && !(key in map)) map[key] = colNumber;
    }
  });
  return map;
}

export type ParsedTask = {
  section: "PROYECTOS" | "GESTION_INTERNA";
  groupName: string;
  task: string;
  contactName: string | null;
  importance: "ALTA" | "MEDIA" | "BAJA" | null;
  responsibleName: string | null;
  status: "PENDIENTE" | "EN_CURSO" | "CERRADO";
  raisedDate: string | null;
  dueDate: string | null;
  notes: string | null;
};

export type ParsedContact = {
  name: string;
  companyName: string;
  projectOrSite: string | null;
  serviceInCharge: string | null;
  phone: string | null;
};

export type ParseState = {
  tasks: ParsedTask[];
  contacts: ParsedContact[];
  warnings: string[];
  error: string | null;
};

function parseTaskSheet(worksheet: ExcelJS.Worksheet): {
  tasks: ParsedTask[];
  warnings: string[];
} {
  const nameUpper = worksheet.name.toUpperCase();
  const section: ParsedTask["section"] = nameUpper.includes("INTERNA") || nameUpper.includes("GESTION")
    ? "GESTION_INTERNA"
    : "PROYECTOS";

  const headerRow = findHeaderRow(worksheet, "TAREA");
  if (!headerRow) {
    return { tasks: [], warnings: [`Hoja "${worksheet.name}": no se encontró la columna "TAREA".`] };
  }

  const cols = columnMap(worksheet, headerRow, [
    ["ITEM", "item"],
    ["TAREA", "task"],
    ["CONTACTO", "contact"],
    ["IMPORTANCIA", "importance"],
    ["RESPONSABLE", "responsible"],
    ["ESTATUS", "status"],
    ["LEVANTAMIENTO", "raisedDate"],
    ["LIMITE", "dueDate"],
    ["LÍMITE", "dueDate"],
    ["OBSERVA", "notes"],
    ["COMENTARIO", "notes"],
  ]);

  const tasks: ParsedTask[] = [];
  let currentGroup = worksheet.name;
  let emptyStreak = 0;

  for (let r = headerRow + 1; r < headerRow + 2000 && emptyStreak < 4; r++) {
    const row = worksheet.getRow(r);
    const itemText = cols.item ? cellText(row.getCell(cols.item)) : "";
    // Las filas de encabezado de grupo (ej. "1.  PAMOLSA") suelen tener la
    // celda A fusionada con B/C — exceljs devuelve el mismo texto en ambas,
    // por eso taskText === itemText también cuenta como "no hay tarea real".
    const taskTextRaw = cols.task ? cellText(row.getCell(cols.task)) : "";
    const taskText = taskTextRaw === itemText ? "" : taskTextRaw;

    if (!taskText) {
      if (itemText) {
        currentGroup = itemText.replace(/^\d+[.,]?\s*/, "").trim() || itemText;
        emptyStreak = 0;
      } else {
        emptyStreak++;
      }
      continue;
    }
    emptyStreak = 0;

    tasks.push({
      section,
      groupName: currentGroup,
      task: taskText,
      contactName: cols.contact ? cellText(row.getCell(cols.contact)) || null : null,
      importance: cols.importance
        ? normalizeImportance(cellText(row.getCell(cols.importance)))
        : null,
      responsibleName: cols.responsible
        ? cellText(row.getCell(cols.responsible)) || null
        : null,
      status: cols.status ? normalizeStatus(cellText(row.getCell(cols.status))) : "PENDIENTE",
      raisedDate: cols.raisedDate ? cellDate(row.getCell(cols.raisedDate)) : null,
      dueDate: cols.dueDate ? cellDate(row.getCell(cols.dueDate)) : null,
      notes: cols.notes ? cellText(row.getCell(cols.notes)) || null : null,
    });
  }

  return { tasks, warnings: [] };
}

function parseContactSheet(worksheet: ExcelJS.Worksheet): ParsedContact[] {
  const headerRow = findHeaderRow(worksheet, "NOMBRE");
  if (!headerRow) return [];

  const cols = columnMap(worksheet, headerRow, [
    ["NOMBRE", "name"],
    ["EMPRESA", "company"],
    ["CLIENTE", "company"],
    ["PROYECTO", "site"],
    ["UBICACION", "site"],
    ["UBICACIÓN", "site"],
    ["SERVICIO", "service"],
    ["TELEFONO", "phone"],
    ["TELÉFONO", "phone"],
  ]);
  if (!cols.name) return [];

  const contacts: ParsedContact[] = [];
  let emptyStreak = 0;
  for (let r = headerRow + 1; r < headerRow + 2000 && emptyStreak < 4; r++) {
    const row = worksheet.getRow(r);
    const name = cellText(row.getCell(cols.name));
    if (!name) {
      emptyStreak++;
      continue;
    }
    emptyStreak = 0;
    contacts.push({
      name,
      companyName: cols.company ? cellText(row.getCell(cols.company)) || "Sin empresa" : "Sin empresa",
      projectOrSite: cols.site ? cellText(row.getCell(cols.site)) || null : null,
      serviceInCharge: cols.service ? cellText(row.getCell(cols.service)) || null : null,
      phone: cols.phone ? cellText(row.getCell(cols.phone)) || null : null,
    });
  }
  return contacts;
}

export async function parsePendientesExcelAction(
  _prevState: ParseState,
  formData: FormData
): Promise<ParseState> {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    return { tasks: [], contacts: [], warnings: [], error: "Solo el administrador puede importar pendientes." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { tasks: [], contacts: [], warnings: [], error: "Selecciona un archivo Excel (.xlsx)." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { tasks: [], contacts: [], warnings: [], error: "El archivo es demasiado grande (máx. 8MB)." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { tasks: [], contacts: [], warnings: [], error: "No se pudo leer el archivo. ¿Es un .xlsx válido?" };
  }

  const tasks: ParsedTask[] = [];
  const contacts: ParsedContact[] = [];
  const warnings: string[] = [];

  workbook.eachSheet((worksheet) => {
    const nameUpper = worksheet.name.toUpperCase();
    if (nameUpper.includes("PENDIENTE")) {
      const result = parseTaskSheet(worksheet);
      tasks.push(...result.tasks);
      warnings.push(...result.warnings);
    } else if (nameUpper.includes("CONTACTO")) {
      contacts.push(...parseContactSheet(worksheet));
    }
  });

  if (tasks.length === 0 && contacts.length === 0) {
    return {
      tasks: [],
      contacts: [],
      warnings: [],
      error:
        'No se encontraron hojas de pendientes (nombre con "PENDIENTE") ni de contactos (nombre con "CONTACTO").',
    };
  }

  return { tasks, contacts, warnings, error: null };
}

export async function importPendientesAction(
  tasks: ParsedTask[],
  contacts: ParsedContact[]
) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede importar pendientes");
  }
  if (tasks.length === 0 && contacts.length === 0) {
    throw new Error("No hay nada para importar");
  }

  const sortOrderByGroup = new Map<string, number>();
  for (const t of tasks) {
    const key = `${t.section}:${t.groupName}`;
    const next = (sortOrderByGroup.get(key) ?? -1) + 1;
    sortOrderByGroup.set(key, next);

    await prisma.pendingTask.create({
      data: {
        section: t.section,
        groupName: t.groupName,
        sortOrder: next,
        task: t.task,
        contactName: t.contactName,
        importance: t.importance,
        responsibleName: t.responsibleName,
        status: t.status,
        raisedDate: t.raisedDate ? new Date(t.raisedDate) : null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        notes: t.notes,
        createdByUserId: session.user.id,
      },
    });
  }

  if (contacts.length > 0) {
    await prisma.clientDirectoryContact.createMany({
      data: contacts.map((c) => ({
        name: c.name,
        companyName: c.companyName,
        projectOrSite: c.projectOrSite,
        serviceInCharge: c.serviceInCharge,
        phone: c.phone,
      })),
    });
  }

  redirect("/pendientes");
}
