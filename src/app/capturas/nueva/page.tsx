import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { CaptureForm } from "./CaptureForm";

export default async function NuevaCapturaPage() {
  const session = await auth();

  return (
    <AppShell
      userName={session!.user.name ?? ""}
      userRole={session!.user.role}
      activeNav="capturas"
    >
      <div className="mx-auto max-w-md p-6">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-brand-navy">
            Capturar factura
          </h1>
          <p className="text-sm text-brand-muted">
            Guarda la foto ahora, clasifícala después.
          </p>
        </header>

        <CaptureForm />

        <a
          href="/capturas"
          className="mt-4 block text-center text-sm text-brand-blue hover:underline"
        >
          Ver mis facturas pendientes →
        </a>
      </div>
    </AppShell>
  );
}
