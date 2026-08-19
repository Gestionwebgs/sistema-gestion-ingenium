import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { getFileSignedUrl } from "@/lib/s3";
import { classifyCaptureAction, discardCaptureAction } from "./actions";
import { FileText } from "lucide-react";

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export default async function CapturasPendientesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [captures, projects, users] = await Promise.all([
    prisma.expenseCapture.findMany({
      where: { capturedByUserId: userId, status: "PENDIENTE" },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
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

        <a
          href="/capturas/nueva"
          className="mb-4 block rounded-lg border border-dashed border-brand-border bg-brand-surface py-4 text-center text-sm text-brand-blue hover:underline"
        >
          + Capturar otra factura
        </a>

        <div className="space-y-4">
          {capturesWithUrls.map(({ capture, url }) => {
            const classifyCapture = classifyCaptureAction.bind(
              null,
              capture.id
            );
            const discardCapture = discardCaptureAction.bind(null, capture.id);
            const isImage = capture.fileType?.startsWith("image/");

            return (
              <div
                key={capture.id}
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

                <form
                  action={classifyCapture}
                  className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3"
                >
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
                    name="paidByUserId"
                    defaultValue={userId}
                    title="Responsable de la compra"
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="paidByNameManual"
                    placeholder="Otro (nombre, si no está en la lista)"
                    title="Si la persona no tiene cuenta en el sistema, escribe su nombre aquí en vez de elegirlo arriba"
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  />
                  <select
                    name="paymentSource"
                    defaultValue="EMPRESA"
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  >
                    <option value="EMPRESA">Pagado con la empresa</option>
                    <option value="PERSONAL">Pagado con mi dinero</option>
                  </select>
                  <select
                    name="paymentMethod"
                    defaultValue=""
                    title="Método de pago"
                    className="rounded border border-brand-border px-2 py-1.5 text-sm"
                  >
                    <option value="">Método (opcional)</option>
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="YAPE_PLIN">Yape / Plin</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="OTRO">Otro</option>
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
                </form>

                <form action={discardCapture} className="shrink-0 sm:self-start">
                  <button
                    type="submit"
                    title="Descarta la captura sin crear un gasto. No borra el archivo, solo la saca de pendientes — queda registrado quién y cuándo, se puede auditar/recuperar después."
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Descartar
                  </button>
                </form>
              </div>
            );
          })}

          {captures.length === 0 && (
            <p className="py-12 text-center text-sm text-brand-muted">
              No tenés facturas pendientes de clasificar.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
