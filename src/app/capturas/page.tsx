import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { getFileSignedUrl } from "@/lib/s3";
import { classifyCaptureAction } from "./actions";
import { FileText } from "lucide-react";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function CapturasPendientesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [captures, projects] = await Promise.all([
    prisma.expenseCapture.findMany({
      where: { capturedByUserId: userId, status: "PENDIENTE" },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const capturesWithUrls = await Promise.all(
    captures.map(async (capture) => ({
      capture,
      url: await getFileSignedUrl(capture.fileKey),
    }))
  );

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
      activeNav="capturas"
    >
      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">
            Mis facturas pendientes
          </h1>
          <p className="text-sm text-brand-muted">
            {captures.length === 0
              ? "No tienes facturas por clasificar."
              : `${captures.length} factura${captures.length === 1 ? "" : "s"} esperando que elijas proyecto y fuente de pago.`}
          </p>
        </header>

        <div className="space-y-4">
          {capturesWithUrls.map(({ capture, url }) => {
            const classifyCapture = classifyCaptureAction.bind(
              null,
              capture.id
            );
            const isImage = capture.fileType?.startsWith("image/");

            return (
              <form
                key={capture.id}
                action={classifyCapture}
                className="flex flex-col gap-4 rounded-lg border border-brand-border bg-brand-surface p-4 sm:flex-row"
              >
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-brand-border bg-gray-50">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt="Comprobante"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center gap-1 text-brand-blue"
                    >
                      <FileText className="h-6 w-6" strokeWidth={1.5} />
                      <span className="text-[10px]">Ver PDF</span>
                    </a>
                  )}
                </div>

                <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="col-span-2 sm:col-span-3">
                    <input
                      type="text"
                      name="description"
                      placeholder="Descripción"
                      defaultValue={capture.ocrExtractedVendor ?? ""}
                      required
                      className="w-full rounded border border-brand-border px-2 py-1.5 text-sm"
                    />
                  </div>
                  <select
                    name="projectId"
                    defaultValue=""
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  >
                    <option value="">Sin proyecto (general)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="paymentSource"
                    defaultValue="EMPRESA"
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  >
                    <option value="EMPRESA">Pagado con la empresa</option>
                    <option value="PERSONAL">Pagado con mi dinero</option>
                  </select>
                  <input
                    type="date"
                    name="date"
                    defaultValue={toDateInputValue(capture.ocrExtractedDate)}
                    required
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="amount"
                    placeholder="Monto"
                    defaultValue={
                      capture.ocrExtractedAmount
                        ? Number(capture.ocrExtractedAmount)
                        : ""
                    }
                    required
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  />
                  <input
                    type="text"
                    name="operationCode"
                    placeholder="N° comprobante"
                    defaultValue={capture.ocrExtractedDocumentNumber ?? ""}
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="col-span-2 rounded bg-brand-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-navy sm:col-span-3"
                  >
                    Confirmar gasto
                  </button>
                </div>
              </form>
            );
          })}

          {captures.length === 0 && (
            <a
              href="/capturas/nueva"
              className="block rounded-lg border border-dashed border-brand-border bg-brand-surface py-12 text-center text-sm text-brand-blue hover:underline"
            >
              Capturar una factura →
            </a>
          )}
        </div>
      </div>
    </AppShell>
  );
}
