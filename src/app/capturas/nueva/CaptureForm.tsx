"use client";

import { useRef, useState } from "react";
import { Camera, FileUp, Loader2, CheckCircle2 } from "lucide-react";
import { captureReceiptAction } from "../actions";

export function CaptureForm() {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [savedCount, setSavedCount] = useState(0);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await captureReceiptAction(formData);
      setSavedCount((c) => c + 1);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-brand-border bg-brand-surface p-8 text-center">
      {status === "uploading" && (
        <div className="flex flex-col items-center gap-2 py-6 text-brand-navy">
          <Loader2 className="h-8 w-8 animate-spin" strokeWidth={1.75} />
          <p className="text-sm font-medium">Guardando y leyendo la factura...</p>
        </div>
      )}

      {status !== "uploading" && (
        <>
          {status === "done" && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
              Guardada. Llevas {savedCount} pendiente
              {savedCount === 1 ? "" : "s"} por clasificar.
            </div>
          )}
          {status === "error" && (
            <p className="text-sm text-red-600">
              No se pudo guardar la factura. Intenta de nuevo.
            </p>
          )}

          <Camera
            className="h-12 w-12 text-brand-blue/40"
            strokeWidth={1.5}
          />
          <div>
            <p className="text-sm font-medium text-brand-navy">
              Toma una foto de la factura o boleta
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              No necesitas llenar nada ahora. Después la clasificas con calma
              en &quot;Mis facturas pendientes&quot;.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-navy"
            >
              <Camera className="h-4 w-4" strokeWidth={2} />
              Tomar foto
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-md border border-brand-border px-5 py-3 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
            >
              <FileUp className="h-4 w-4" strokeWidth={2} />
              Subir PDF o imagen
            </button>
          </div>
        </>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
