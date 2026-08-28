"use server";

import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const IGV_RATE = 0.18;
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

// Los montos en estas hojas vienen como texto con formato peruano
// ("S/ 46,373.25": coma de miles, punto decimal), no como celdas numéricas —
// por eso no alcanza con Number() directo, hay que limpiar el texto primero.
function cellMoney(cell: ExcelJS.Cell | undefined): number {
  if (!cell || cell.value == null) return 0;
  if (typeof cell.value === "number") return cell.value;
  const cleaned = cellText(cell).replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

type QuoteStage = "ENVIADA" | "EN_EVALUACION" | "OC_RECIBIDA" | "PAGADA" | "RECHAZADA";

// El estatus original de la hoja siempre queda completo en `notes` — esto
// solo da un punto de partida razonable para la etapa, a revisar a mano
// después de importar (se avisa en la UI).
function guessStage(statusText: string): QuoteStage {
  const t = statusText.toUpperCase();
  if (t.includes("RECHAZ") || t.includes("PERDID") || t.includes("NO ACEPT")) return "RECHAZADA";
  if (t.includes("PAGAD") || t.includes("CANCELAD") && !t.includes("NO CANCELAD")) return "PAGADA";
  if (t.startsWith("OC") || t.includes(" OC ") || t.includes("ORDEN DE COMPRA") || t.includes("VALORIZACION")) {
    return "OC_RECIBIDA";
  }
  if (t.includes("EVALUA")) return "EN_EVALUACION";
  return "ENVIADA";
}

export type ParsedQuote = {
  clientName: string;
  contactName: string | null;
  code: string;
  project: string;
  amountNoIgv: number;
  igvAmount: number;
  stage: QuoteStage;
  notes: string | null;
};

export type ParseState = {
  quotes: ParsedQuote[];
  warnings: string[];
  error: string | null;
};

type QuoteColumns = {
  codeCol: number | null;
  userCol: number | null;
  projectCol: number | null;
  amountNoIgvCol: number | null;
  amountTotalCol: number | null;
  statusCol: number | null;
};

function detectColumns(worksheet: ExcelJS.Worksheet, headerRow: number): QuoteColumns {
  const cols: QuoteColumns = {
    codeCol: null,
    userCol: null,
    projectCol: null,
    amountNoIgvCol: null,
    amountTotalCol: null,
    statusCol: null,
  };
  let seqSeen = false;
  const row = worksheet.getRow(headerRow);
  row.eachCell((cell, colNumber) => {
    const text = cellText(cell).toUpperCase();
    if (text === "N°" || text === "Nº" || text === "NO" || text === "N") {
      // La primera columna "N°" es el correlativo manual (no se importa);
      // la segunda es el código real de la cotización (ej. ISS-021-2026).
      if (!seqSeen) seqSeen = true;
      else if (cols.codeCol == null) cols.codeCol = colNumber;
    } else if (text.includes("USUARIO")) {
      cols.userCol = colNumber;
    } else if (text.includes("PROYECTO")) {
      cols.projectCol = colNumber;
    } else if (text.includes("SIN IGV")) {
      cols.amountNoIgvCol = colNumber;
    } else if (text.includes("TOTAL")) {
      cols.amountTotalCol = colNumber;
    } else if (text.includes("ESTATUS") || text.includes("ESTADO")) {
      cols.statusCol = colNumber;
    }
  });
  return cols;
}

function clientNameFromSheet(sheetName: string): string {
  const stripped = sheetName.replace(/cotizaciones?/i, "").trim();
  return stripped || sheetName.trim();
}

function parseQuoteSheet(worksheet: ExcelJS.Worksheet): {
  quotes: ParsedQuote[];
  warnings: string[];
} {
  let headerRow: number | null = null;
  worksheet.eachRow((row, rowNumber) => {
    if (headerRow) return;
    row.eachCell((cell) => {
      if (cellText(cell).toUpperCase() === "PROYECTO") headerRow = rowNumber;
    });
  });

  if (!headerRow) {
    return {
      quotes: [],
      warnings: [`Hoja "${worksheet.name}": no se encontró la columna "PROYECTO".`],
    };
  }

  const cols = detectColumns(worksheet, headerRow);
  if (!cols.projectCol || !cols.amountNoIgvCol) {
    return {
      quotes: [],
      warnings: [
        `Hoja "${worksheet.name}": no se pudo identificar "Proyecto" y/o "Monto sin IGV".`,
      ],
    };
  }

  const clientName = clientNameFromSheet(worksheet.name);
  const quotes: ParsedQuote[] = [];
  let emptyStreak = 0;

  for (let r = headerRow + 1; r < headerRow + 2000 && emptyStreak < 4; r++) {
    const row = worksheet.getRow(r);
    const project = cellText(row.getCell(cols.projectCol));
    const amountNoIgv = cellMoney(row.getCell(cols.amountNoIgvCol));

    if (!project && amountNoIgv === 0) {
      emptyStreak++;
      continue;
    }
    emptyStreak = 0;
    if (!project || amountNoIgv <= 0) continue;

    const amountTotal = cols.amountTotalCol ? cellMoney(row.getCell(cols.amountTotalCol)) : 0;
    const igvAmount =
      amountTotal > amountNoIgv
        ? Math.round((amountTotal - amountNoIgv) * 100) / 100
        : Math.round(amountNoIgv * IGV_RATE * 100) / 100;
    const statusText = cols.statusCol ? cellText(row.getCell(cols.statusCol)) : "";

    quotes.push({
      clientName,
      contactName: cols.userCol ? cellText(row.getCell(cols.userCol)) || null : null,
      code: cols.codeCol ? cellText(row.getCell(cols.codeCol)) || "S/N" : "S/N",
      project,
      amountNoIgv,
      igvAmount,
      stage: statusText ? guessStage(statusText) : "ENVIADA",
      notes: statusText || null,
    });
  }

  return { quotes, warnings: [] };
}

export async function parseQuotesExcelAction(
  _prevState: ParseState,
  formData: FormData
): Promise<ParseState> {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    return { quotes: [], warnings: [], error: "Solo el administrador puede importar cotizaciones." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { quotes: [], warnings: [], error: "Selecciona un archivo Excel (.xlsx)." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { quotes: [], warnings: [], error: "El archivo es demasiado grande (máx. 8MB)." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { quotes: [], warnings: [], error: "No se pudo leer el archivo. ¿Es un .xlsx válido?" };
  }

  const quotes: ParsedQuote[] = [];
  const warnings: string[] = [];

  workbook.eachSheet((worksheet) => {
    if (!worksheet.name.toUpperCase().includes("COTIZA")) return;
    const result = parseQuoteSheet(worksheet);
    quotes.push(...result.quotes);
    warnings.push(...result.warnings);
  });

  if (quotes.length === 0) {
    return {
      quotes: [],
      warnings,
      error:
        warnings.length > 0
          ? warnings.join(" ")
          : 'No se encontraron hojas de cotizaciones (nombre con "COTIZA...").',
    };
  }

  return { quotes, warnings, error: null };
}

export async function importQuotesAction(quotes: ParsedQuote[]) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede importar cotizaciones");
  }
  if (quotes.length === 0) {
    throw new Error("No hay nada para importar");
  }

  await prisma.quote.createMany({
    data: quotes.map((q) => ({
      clientName: q.clientName,
      contactName: q.contactName,
      code: q.code,
      project: q.project,
      amountNoIgv: q.amountNoIgv,
      igvAmount: q.igvAmount,
      stage: q.stage,
      notes: q.notes,
      createdByUserId: session.user.id,
    })),
  });

  redirect("/cotizaciones");
}
