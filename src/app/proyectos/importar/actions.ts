"use server";

import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const IGV_RATE = 0.18;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export type ParsedRow = { date: string | null; description: string; amount: number };

export type ParsedProjectSheet = {
  sheetName: string;
  name: string;
  location: string | null;
  clientContactName: string | null;
  clientBusinessName: string | null;
  clientRuc: string | null;
  startDate: string | null;
  endDate: string | null;
  responsibleName: string | null;
  purchaseOrderNumber: string | null;
  orderAmountNoIgv: number;
  igvAmount: number;
  gastos: ParsedRow[];
  abonos: ParsedRow[];
  warnings: string[];
};

export type ParseState = {
  sheets: ParsedProjectSheet[];
  error: string | null;
};

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

// El valor de cada campo de la ficha (Proyecto/Ubicación/Cliente/...) no
// siempre cae en la misma columna: a veces es B, a veces C, según cómo haya
// quedado el merge de celdas en esa hoja en particular. Encima, cuando la
// etiqueta de la columna A está fusionada con B, exceljs devuelve el mismo
// texto de la etiqueta al leer B — por eso se descarta cualquier celda cuyo
// texto sea igual a la etiqueta, y se toma la primera que realmente difiera.
function valueAfterLabel(worksheet: ExcelJS.Worksheet, rowNumber: number): string {
  const row = worksheet.getRow(rowNumber);
  const label = cellText(row.getCell(1));
  for (let col = 2; col <= 6; col++) {
    const text = cellText(row.getCell(col));
    if (text && text !== label) return text;
  }
  return "";
}

function numberAfterLabel(worksheet: ExcelJS.Worksheet, rowNumber: number): number {
  const row = worksheet.getRow(rowNumber);
  for (let col = 2; col <= 6; col++) {
    const n = cellNumber(row.getCell(col));
    if (n !== 0) return n;
  }
  return 0;
}

function dateAfterLabel(worksheet: ExcelJS.Worksheet, rowNumber: number): string | null {
  const row = worksheet.getRow(rowNumber);
  for (let col = 2; col <= 6; col++) {
    const d = cellDate(row.getCell(col));
    if (d) return d;
  }
  return null;
}

function cellNumber(cell: ExcelJS.Cell | undefined): number {
  if (!cell || cell.value == null) return 0;
  if (typeof cell.value === "number") return cell.value;
  const text = cellText(cell).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

// Formato fijo que usa el cliente para la "ficha" de cada proyecto: campos en
// B1..B11 y dos tablas (REGISTRO DE GASTOS / REGISTRO DE ABONO) más abajo,
// una al lado de la otra. Ver scripts/import-pendientes-agosto-2026.ts para
// el mismo tipo de traducción manual, pero esto se hace en vivo desde un
// archivo que sube el usuario.
function parseProjectSheet(worksheet: ExcelJS.Worksheet): ParsedProjectSheet | null {
  const a1 = cellText(worksheet.getCell("A1")).toLowerCase();
  if (!a1.startsWith("proyecto")) return null;

  const name = valueAfterLabel(worksheet, 1);
  if (!name) return null;

  const warnings: string[] = [];
  const orderAmountNoIgv = numberAfterLabel(worksheet, 10);
  const igvFromSheet = numberAfterLabel(worksheet, 11);
  const igvAmount =
    igvFromSheet > 0
      ? igvFromSheet
      : Math.round(orderAmountNoIgv * IGV_RATE * 100) / 100;
  if (orderAmountNoIgv <= 0) {
    warnings.push('No se encontró el monto de la orden (fila "Monto de la orden sin IGV")');
  }

  let gastosHeaderRow: number | null = null;
  let abonosHeaderRow: number | null = null;
  let abonosCol: number | null = null;
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell, colNumber) => {
      const text = cellText(cell).toUpperCase();
      if (text === "REGISTRO DE GASTOS") gastosHeaderRow = rowNumber;
      if (text === "REGISTRO DE ABONO" || text === "REGISTRO DE ABONOS") {
        abonosHeaderRow = rowNumber;
        abonosCol = colNumber;
      }
    });
  });

  function readTable(headerRow: number | null, col: number): ParsedRow[] {
    if (!headerRow) return [];
    const rows: ParsedRow[] = [];
    let r = headerRow + 2;
    let emptyStreak = 0;
    while (emptyStreak < 3 && r < headerRow + 500) {
      const row = worksheet.getRow(r);
      const dateCell = row.getCell(col);
      const descCell = row.getCell(col + 1);
      const amountCell = row.getCell(col + 4);
      const description = cellText(descCell);
      const amount = cellNumber(amountCell);
      if (!description && amount === 0) {
        emptyStreak++;
      } else {
        emptyStreak = 0;
        if (description || amount > 0) {
          rows.push({ date: cellDate(dateCell), description, amount });
        }
      }
      r++;
    }
    return rows;
  }

  const gastos = readTable(gastosHeaderRow, 1);
  const abonos = readTable(abonosHeaderRow, abonosCol ?? 8);

  if (!gastosHeaderRow) {
    warnings.push("No se encontró la tabla \"REGISTRO DE GASTOS\"");
  }

  return {
    sheetName: worksheet.name,
    name,
    location: valueAfterLabel(worksheet, 2) || null,
    clientContactName: valueAfterLabel(worksheet, 3) || null,
    clientBusinessName: valueAfterLabel(worksheet, 4) || null,
    clientRuc: valueAfterLabel(worksheet, 5) || null,
    startDate: dateAfterLabel(worksheet, 6),
    endDate: dateAfterLabel(worksheet, 7),
    responsibleName: valueAfterLabel(worksheet, 8) || null,
    purchaseOrderNumber: valueAfterLabel(worksheet, 9) || null,
    orderAmountNoIgv,
    igvAmount,
    gastos,
    abonos,
    warnings,
  };
}

export async function parseProjectExcelAction(
  _prevState: ParseState,
  formData: FormData
): Promise<ParseState> {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    return { sheets: [], error: "Solo el administrador puede importar proyectos." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { sheets: [], error: "Selecciona un archivo Excel (.xlsx)." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { sheets: [], error: "El archivo es demasiado grande (máx. 8MB)." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = new ExcelJS.Workbook();
    // exceljs arrastra (vía fast-csv) su propio @types/node viejo, así que
    // su Buffer y el de este proyecto quedan como tipos nominalmente
    // distintos para TS aunque sean el mismo Buffer real en runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { sheets: [], error: "No se pudo leer el archivo. ¿Es un .xlsx válido?" };
  }

  const sheets: ParsedProjectSheet[] = [];
  workbook.eachSheet((worksheet) => {
    const parsed = parseProjectSheet(worksheet);
    if (parsed) sheets.push(parsed);
  });

  if (sheets.length === 0) {
    return {
      sheets: [],
      error:
        'No se encontraron hojas con formato de ficha de proyecto (celda A1 = "Proyecto:").',
    };
  }

  return { sheets, error: null };
}

export type ImportSheetPayload = ParsedProjectSheet & { businessLineId: string };

export async function importProjectsAction(selected: ImportSheetPayload[]) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede importar proyectos");
  }
  if (selected.length === 0) {
    throw new Error("No seleccionaste ningún proyecto para importar");
  }
  if (selected.some((s) => !s.businessLineId)) {
    throw new Error("Cada proyecto necesita una línea de negocio seleccionada");
  }

  let lastProjectId = "";

  for (const sheet of selected) {
    let clientId: string | undefined;
    let clientContactId: string | undefined;

    if (sheet.clientBusinessName) {
      let client = await prisma.client.findFirst({
        where: { businessName: sheet.clientBusinessName },
      });
      if (!client) {
        client = await prisma.client.create({
          data: { businessName: sheet.clientBusinessName, ruc: sheet.clientRuc },
        });
      } else if (sheet.clientRuc && sheet.clientRuc !== client.ruc) {
        client = await prisma.client.update({
          where: { id: client.id },
          data: { ruc: sheet.clientRuc },
        });
      }
      clientId = client.id;

      if (sheet.clientContactName) {
        let contact = await prisma.clientContact.findFirst({
          where: { clientId: client.id, name: sheet.clientContactName },
        });
        if (!contact) {
          contact = await prisma.clientContact.create({
            data: { clientId: client.id, name: sheet.clientContactName },
          });
        }
        clientContactId = contact.id;
      }
    }

    const project = await prisma.project.create({
      data: {
        name: sheet.name,
        location: sheet.location,
        clientId,
        clientContactId,
        businessLineId: sheet.businessLineId,
        responsibleName: sheet.responsibleName,
        purchaseOrderNumber: sheet.purchaseOrderNumber,
        startDate: sheet.startDate ? new Date(sheet.startDate) : null,
        endDate: sheet.endDate ? new Date(sheet.endDate) : null,
        orderAmountNoIgv: sheet.orderAmountNoIgv,
        igvAmount: sheet.igvAmount,
        expenses: {
          create: sheet.gastos
            .filter((g) => g.amount > 0)
            .map((g) => ({
              date: g.date ? new Date(g.date) : new Date(),
              description: g.description || "(sin descripción)",
              amount: g.amount,
              paymentSource: "EMPRESA",
              createdByUserId: session.user.id,
            })),
        },
        incomes: {
          create: sheet.abonos
            .filter((a) => a.amount > 0)
            .map((a) => ({
              date: a.date ? new Date(a.date) : new Date(),
              description: a.description || "(sin descripción)",
              amount: a.amount,
              createdByUserId: session.user.id,
            })),
        },
      },
    });

    lastProjectId = project.id;
  }

  redirect(selected.length === 1 ? `/proyectos/${lastProjectId}` : "/proyectos");
}
