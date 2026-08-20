import archiver from "archiver";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { downloadFileBuffer } from "@/lib/s3";

// Descarga en un solo .zip todos los comprobantes (fotos/PDF) de los gastos
// de un mes elegido, de TODOS los proyectos + gastos generales, organizados
// en carpetas por proyecto — para enviarle todo junto a los contadores.
// Solo OWNER. GET /api/comprobantes?periodo=YYYY-MM
export const runtime = "nodejs";

function sanitizeForPath(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim() || "sin-nombre";
}

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    return new Response("No autorizado", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo") ?? "";
  const [yearStr, monthStr] = periodo.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  if (!year || !month || month < 1 || month > 12) {
    return new Response(
      "Periodo inválido. Usa el formato YYYY-MM (ej. 2026-08).",
      { status: 400 }
    );
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lt: end } },
    include: {
      attachments: true,
      project: { select: { name: true } },
    },
    orderBy: { date: "asc" },
  });

  const expensesWithFiles = expenses.filter((e) => e.attachments.length > 0);

  if (expensesWithFiles.length === 0) {
    return new Response(
      "No hay comprobantes adjuntos en los gastos de ese mes.",
      { status: 404 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", (err: Error) => reject(err));
  });

  const usedNames = new Set<string>();
  function uniqueEntryName(folder: string, baseName: string): string {
    let candidate = `${folder}/${baseName}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    const dotIndex = baseName.lastIndexOf(".");
    const stem = dotIndex >= 0 ? baseName.slice(0, dotIndex) : baseName;
    const ext = dotIndex >= 0 ? baseName.slice(dotIndex) : "";
    let i = 2;
    do {
      candidate = `${folder}/${stem}-${i}${ext}`;
      i++;
    } while (usedNames.has(candidate));
    usedNames.add(candidate);
    return candidate;
  }

  for (const expense of expensesWithFiles) {
    const folder = expense.project
      ? sanitizeForPath(expense.project.name)
      : "Generales";
    for (const attachment of expense.attachments) {
      let buffer: Buffer;
      try {
        buffer = await downloadFileBuffer(attachment.fileKey);
      } catch (error) {
        console.error(
          "GET /api/comprobantes: no se pudo descargar",
          attachment.fileKey,
          error
        );
        continue;
      }
      const ext = attachment.fileKey.split(".").pop() || "bin";
      const dateStr = expense.date.toISOString().slice(0, 10);
      const desc = sanitizeForPath(expense.description).slice(0, 40);
      const entryName = uniqueEntryName(folder, `${dateStr}_${desc}.${ext}`);
      archive.append(buffer, { name: entryName });
    }
  }

  archive.finalize();
  await finished;

  const zipBuffer = Buffer.concat(chunks);
  const fileName = `comprobantes_${yearStr}-${monthStr}.zip`;

  return new Response(new Uint8Array(zipBuffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
