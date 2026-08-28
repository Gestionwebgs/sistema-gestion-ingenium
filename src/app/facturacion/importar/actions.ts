"use server";

import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const IGV_RATE = 0.18;
const DEFAULT_DETRACTION_PERCENT = 0.12;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

type CellValue = ExcelJS.CellValue;

function cellText(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return "";
  const value: CellValue = cell.value;
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value && value.result != null) return String(value.result).trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("").trim();
    }
  }
  return String(value).trim();
}

function cellMoney(cell: ExcelJS.Cell | undefined): number {
  if (!cell || cell.value == null) return 0;
  if (typeof cell.value === "number") return cell.value;
  const cleaned = cellText(cell).replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function cellDate(cell: ExcelJS.Cell | undefined): string | null {
  if (!cell || cell.value == null) return null;
  if (cell.value instanceof Date) return cell.value.toISOString().slice(0, 10);
  return null;
}

function cellBool(cell: ExcelJS.Cell | undefined): boolean {
  return cellText(cell).trim().toUpperCase().startsWith("SI");
}

export type ParsedInvoice = {
  purchaseOrderNumber: string | null;
  solicitantName: string | null;
  description: string;
  quoteCode: string | null;
  hesRequested: boolean;
  hesRequestedDate: string | null;
  hesReceived: boolean;
  invoiceEnteredDate: string | null;
  paid: boolean;
  amountNet: number;
  igvAmount: number;
  detractionPercent: number;
};

export type ParseState = {
  invoices: ParsedInvoice[];
  warnings: string[];
  error: string | null;
};

type InvoiceColumns = {
  purchaseOrderCol: number | null;
  solicitantCol: number | null;
  descriptionCol: number | null;
  quoteCodeCol: number | null;
  hesRequestedCol: number | null;
  hesRequestedDateCol: number | null;
  hesReceivedCol: number | null;
  invoiceEnteredDateCol: number | null;
  paidCol: number | null;
  detractionCol: number | null;
  amountNetCol: number | null;
  igvCol: number | null;
};

function detectColumns(worksheet: ExcelJS.Worksheet, headerRow: number): InvoiceColumns {
  const cols: InvoiceColumns = {
    purchaseOrderCol: null,
    solicitantCol: null,
    descriptionCol: null,
    quoteCodeCol: null,
    hesRequestedCol: null,
    hesRequestedDateCol: null,
    hesReceivedCol: null,
    invoiceEnteredDateCol: null,
    paidCol: null,
    detractionCol: null,
    amountNetCol: null,
    igvCol: null,
  };
  const row = worksheet.getRow(headerRow);
  row.eachCell((cell, colNumber) => {
    const text = cellText(cell).toUpperCase();
    if (text.includes("ORDEN DE COMPRA")) cols.purchaseOrderCol = colNumber;
    else if (text.includes("SOLICITANTE")) cols.solicitantCol = colNumber;
    else if (text.includes("COTIZACI")) cols.quoteCodeCol = colNumber;
    // "FECHA DE SOLICITUD DE HES" también contiene "SOLICITUD" y "HES" —
    // hay que descartar esa antes de aceptar la columna booleana.
    else if (text.includes("SOLICITUD") && text.includes("HES") && !text.includes("FECHA")) {
      cols.hesRequestedCol = colNumber;
    } else if (text.includes("FECHA") && text.includes("SOLICITUD")) cols.hesRequestedDateCol = colNumber;
    else if (text.includes("FECHA") && text.includes("INGRESO")) cols.invoiceEnteredDateCol = colNumber;
    else if (text === "HES") cols.hesReceivedCol = colNumber;
    else if (text.includes("PAGARON")) cols.paidCol = colNumber;
    else if (text.includes("DETRACCION") || text.includes("DETRACCIÓN")) cols.detractionCol = colNumber;
    else if (text.includes("MONTO NETO")) cols.amountNetCol = colNumber;
    else if (text.includes("MONTO IGV")) cols.igvCol = colNumber;
    else if (text.startsWith("DESCRIPCI")) cols.descriptionCol = colNumber;
  });
  return cols;
}

function parseInvoiceSheet(worksheet: ExcelJS.Worksheet): {
  invoices: ParsedInvoice[];
  warnings: string[];
} {
  let headerRow: number | null = null;
  worksheet.eachRow((row, rowNumber) => {
    if (headerRow) return;
    row.eachCell((cell) => {
      if (cellText(cell).toUpperCase().startsWith("DESCRIPCI")) headerRow = rowNumber;
    });
  });

  if (!headerRow) {
    return {
      invoices: [],
      warnings: [`Hoja "${worksheet.name}": no se encontró la columna "Descripción".`],
    };
  }

  const cols = detectColumns(worksheet, headerRow);
  if (!cols.descriptionCol || !cols.amountNetCol) {
    return {
      invoices: [],
      warnings: [
        `Hoja "${worksheet.name}": no se pudo identificar "Descripción" y/o "Monto neto".`,
      ],
    };
  }

  const invoices: ParsedInvoice[] = [];
  let emptyStreak = 0;

  for (let r = headerRow + 1; r < headerRow + 2000 && emptyStreak < 4; r++) {
    const row = worksheet.getRow(r);
    const description = cellText(row.getCell(cols.descriptionCol));
    const amountNet = cellMoney(row.getCell(cols.amountNetCol));

    if (!description && amountNet === 0) {
      emptyStreak++;
      continue;
    }
    emptyStreak = 0;
    if (!description || amountNet <= 0) continue;

    const igvFromSheet = cols.igvCol ? cellMoney(row.getCell(cols.igvCol)) : 0;
    const igvAmount = igvFromSheet > 0 ? igvFromSheet : Math.round(amountNet * IGV_RATE * 100) / 100;
    const total = amountNet + igvAmount;

    const detractionFromSheet = cols.detractionCol ? cellMoney(row.getCell(cols.detractionCol)) : 0;
    const detractionPercent =
      detractionFromSheet > 0 && total > 0
        ? Math.round((detractionFromSheet / total) * 10000) / 10000
        : DEFAULT_DETRACTION_PERCENT;

    invoices.push({
      purchaseOrderNumber: cols.purchaseOrderCol
        ? cellText(row.getCell(cols.purchaseOrderCol)) || null
        : null,
      solicitantName: cols.solicitantCol
        ? cellText(row.getCell(cols.solicitantCol)) || null
        : null,
      description,
      quoteCode: cols.quoteCodeCol ? cellText(row.getCell(cols.quoteCodeCol)) || null : null,
      hesRequested: cols.hesRequestedCol ? cellBool(row.getCell(cols.hesRequestedCol)) : false,
      hesRequestedDate: cols.hesRequestedDateCol
        ? cellDate(row.getCell(cols.hesRequestedDateCol))
        : null,
      hesReceived: cols.hesReceivedCol ? cellBool(row.getCell(cols.hesReceivedCol)) : false,
      invoiceEnteredDate: cols.invoiceEnteredDateCol
        ? cellDate(row.getCell(cols.invoiceEnteredDateCol))
        : null,
      paid: cols.paidCol ? cellBool(row.getCell(cols.paidCol)) : false,
      amountNet,
      igvAmount,
      detractionPercent,
    });
  }

  return { invoices, warnings: [] };
}

export async function parseInvoicesExcelAction(
  _prevState: ParseState,
  formData: FormData
): Promise<ParseState> {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    return { invoices: [], warnings: [], error: "Solo el administrador puede importar facturas." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { invoices: [], warnings: [], error: "Selecciona un archivo Excel (.xlsx)." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { invoices: [], warnings: [], error: "El archivo es demasiado grande (máx. 8MB)." };
  }

  let workbook: ExcelJS.Workbook;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { invoices: [], warnings: [], error: "No se pudo leer el archivo. ¿Es un .xlsx válido?" };
  }

  const invoices: ParsedInvoice[] = [];
  const warnings: string[] = [];

  workbook.eachSheet((worksheet) => {
    const result = parseInvoiceSheet(worksheet);
    invoices.push(...result.invoices);
    warnings.push(...result.warnings);
  });

  if (invoices.length === 0) {
    return {
      invoices: [],
      warnings,
      error: warnings.length > 0 ? warnings.join(" ") : "No se encontraron filas con datos.",
    };
  }

  return { invoices, warnings, error: null };
}

export async function importInvoicesAction(invoices: ParsedInvoice[]) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    throw new Error("Solo el administrador puede importar facturas");
  }
  if (invoices.length === 0) {
    throw new Error("No hay nada para importar");
  }

  // projectId siempre queda null al importar (no hay forma confiable de
  // adivinar a qué proyecto pertenece cada fila) — se avisa en /facturacion
  // para asignarlas a mano después.
  await prisma.invoice.createMany({
    data: invoices.map((inv) => ({
      purchaseOrderNumber: inv.purchaseOrderNumber,
      solicitantName: inv.solicitantName,
      description: inv.description,
      quoteCode: inv.quoteCode,
      hesRequested: inv.hesRequested,
      hesRequestedDate: inv.hesRequestedDate ? new Date(inv.hesRequestedDate) : null,
      hesReceived: inv.hesReceived,
      invoiceEnteredDate: inv.invoiceEnteredDate ? new Date(inv.invoiceEnteredDate) : null,
      paid: inv.paid,
      amountNet: inv.amountNet,
      igvAmount: inv.igvAmount,
      detractionPercent: inv.detractionPercent,
      createdByUserId: session.user.id,
    })),
  });

  redirect("/facturacion");
}
