import { createWorker } from "tesseract.js";

export type OcrResult = {
  rawText: string;
  extractedDate: Date | null;
  extractedAmount: number | null;
  extractedVendor: string | null;
  extractedDocumentNumber: string | null;
};

const EMPTY_RESULT: Omit<OcrResult, "rawText"> = {
  extractedDate: null,
  extractedAmount: null,
  extractedVendor: null,
  extractedDocumentNumber: null,
};

export async function runOcr(
  buffer: Buffer,
  contentType: string
): Promise<OcrResult> {
  let rawText = "";

  if (contentType === "application/pdf") {
    rawText = await extractPdfText(buffer);
    // Scanned PDF with no text layer: fall back to empty result rather than
    // attempting page rasterization (not implemented yet).
  } else {
    rawText = await extractImageText(buffer);
  }

  // Postgres/UTF8 rechaza el byte nulo (0x00) dentro de una columna de texto
  // ("invalid byte sequence for encoding "UTF8": 0x00"). Tanto pdf-parse como
  // tesseract.js pueden devolver algún 0x00 suelto con ciertos PDFs/imágenes
  // dañados o con codificación rara — se limpia acá, antes de derivar
  // cualquier otro campo (vendor, N° de comprobante) de este texto.
  rawText = rawText.replace(/\u0000/g, "");

  return { rawText, ...extractFields(rawText) };
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy();
  }
}

async function extractImageText(buffer: Buffer): Promise<string> {
  const worker = await createWorker("spa");
  try {
    const {
      data: { text },
    } = await worker.recognize(buffer);
    return text ?? "";
  } finally {
    await worker.terminate();
  }
}

// Best-effort regex heuristics over raw OCR/PDF text. Peruvian receipts don't
// have a single fixed layout, so these are guesses meant to save typing —
// the classification screen always shows them as editable, never final.
function extractFields(text: string): Omit<OcrResult, "rawText"> {
  if (!text || text.trim().length === 0) return { ...EMPTY_RESULT };

  // Serie-correlativo peruano estándar: 1 letra + 3 dígitos, guion, hasta 8
  // dígitos (ej. F005-00000655). Más estricto que antes para no confundirlo
  // con fragmentos de dirección tipo "TDA. B1-8".
  const docMatch = text.match(/\b([A-Z]\d{3}-\d{1,8})\b/);

  const dateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
  let extractedDate: Date | null = null;
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    let year = Number(dateMatch[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const candidate = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(candidate.getTime())) extractedDate = candidate;
    }
  }

  const amountMatches = Array.from(
    text.matchAll(/(?:TOTAL|IMPORTE)[^\d]{0,15}(?:S\/\.?\s*)?(\d{1,6}(?:[.,]\d{2}))/gi)
  );
  let extractedAmount: number | null = null;
  if (amountMatches.length > 0) {
    const last = amountMatches[amountMatches.length - 1][1];
    extractedAmount = Number(last.replace(",", "."));
  } else {
    const genericAmounts = Array.from(
      text.matchAll(/S\/\.?\s*(\d{1,6}(?:[.,]\d{2}))/gi)
    ).map((m) => Number(m[1].replace(",", ".")));
    if (genericAmounts.length > 0) {
      extractedAmount = Math.max(...genericAmounts);
    }
  }

  const firstLine = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 3 && !/^\d+$/.test(l));

  return {
    extractedDate,
    extractedAmount,
    extractedVendor: firstLine ?? null,
    extractedDocumentNumber: docMatch ? docMatch[1] : null,
  };
}
