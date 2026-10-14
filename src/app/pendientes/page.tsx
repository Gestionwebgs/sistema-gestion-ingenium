import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/AppShell";
import { Plus, Download } from "lucide-react";
import { ResponsableFilter } from "./ResponsableFilter";
import { StatusFilter } from "./StatusFilter";
import { EmpresaCards, type EmpresaSummary } from "./EmpresaCards";
import { EmpresaDetalle } from "./EmpresaDetalle";
import { pendientesHref, type TaskSection } from "./query";

const PAGE_SIZE = 10;
const VALID_STATUSES = new Set(["PENDIENTE", "EN_CURSO", "CERRADO"]);

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: "PENDIENTE",
  EN_CURSO: "EN CURSO",
  CERRADO: "CERRADO",
};

type Status = "PENDIENTE" | "EN_CURSO" | "CERRADO";

export default async function PendientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    responsable?: string;
    estado?: string;
    empresa?: string;
    seccion?: string;
    pagina?: string;
  }>;
}) {
  const { responsable, estado, empresa, seccion, pagina } = await searchParams;
  const session = await auth();
  if (session?.user.role !== "OWNER") redirect("/proyectos");

  const allResponsables = await prisma.pendingTask.findMany({
    where: { responsibleName: { not: null } },
    select: { responsibleName: true },
    distinct: ["responsibleName"],
  });
  const responsableOptions = allResponsables
    .map((r) => r.responsibleName)
    .filter((name): name is string => !!name)
    .sort((a, b) => a.localeCompare(b));

  const status: Status | undefined =
    estado && VALID_STATUSES.has(estado) ? (estado as Status) : undefined;
  const responsableFilter = responsable ? { responsibleName: responsable } : {};
  const filter = { ...responsableFilter, ...(status ? { status } : {}) };
  const hasActiveFilter = !!responsable || !!status;

  const section: TaskSection =
    seccion === "GESTION_INTERNA" ? "GESTION_INTERNA" : "PROYECTOS";

  const exportHref = `/api/pendientes/export${(() => {
    const query = new URLSearchParams();
    if (responsable) query.set("responsable", responsable);
    if (status) query.set("estado", status);
    if (empresa) {
      query.set("empresa", empresa);
      query.set("seccion", section);
    }
    const text = query.toString();
    return text ? `?${text}` : "";
  })()}`;

  const header = (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold text-brand-navy">Pendientes</h1>
        <p className="text-sm text-brand-muted">
          Una tarjeta por empresa: abrila para ver y cambiar el estado de sus
          pendientes.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ResponsableFilter options={responsableOptions} />
        <StatusFilter />
        <a
          href={exportHref}
          className="flex items-center justify-center gap-2 rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
          title={
            empresa || hasActiveFilter
              ? "Descarga en Excel solo los pendientes que ves filtrados"
              : "Descarga en Excel todos los pendientes"
          }
        >
          <Download className="h-4 w-4" strokeWidth={2} />
          Descargar
        </a>
        <a
          href="/pendientes/importar"
          className="flex items-center justify-center gap-2 rounded-md border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy transition hover:bg-gray-50"
        >
          Importar desde Excel
        </a>
        <a
          href="/pendientes/nuevo"
          className="flex items-center justify-center gap-2 rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-navy"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          Nuevo pendiente
        </a>
      </div>
    </header>
  );

  if (empresa) {
    const base = { section, groupName: empresa, ...responsableFilter };
    const [statusRows, total] = await Promise.all([
      prisma.pendingTask.groupBy({
        by: ["status"],
        where: base,
        _count: { _all: true },
      }),
      prisma.pendingTask.count({ where: { ...base, ...(status ? { status } : {}) } }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(Number(pagina) || 1, 1), totalPages);

    // Orden: primero lo abierto (pendiente → en curso → cerrado), dentro de
    // cada estado lo más importante, luego lo que vence antes; el orden
    // original de la hoja desempata.
    const tasks = await prisma.pendingTask.findMany({
      where: { ...base, ...(status ? { status } : {}) },
      orderBy: [
        { status: "asc" },
        { importance: { sort: "asc", nulls: "last" } },
        { dueDate: { sort: "asc", nulls: "last" } },
        { sortOrder: "asc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });

    const statusCounts = { PENDIENTE: 0, EN_CURSO: 0, CERRADO: 0 };
    for (const row of statusRows) statusCounts[row.status] = row._count._all;

    return (
      <AppShell
        userName={session.user.name ?? ""}
        userRole={session.user.role}
        activeNav="pendientes"
      >
        <div className="p-4 sm:p-8">
          {header}
          <EmpresaDetalle
            empresa={empresa}
            section={section}
            tasks={tasks}
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            statusCounts={statusCounts}
            responsable={responsable}
            estado={status}
          />
        </div>
      </AppShell>
    );
  }

  const grouped = await prisma.pendingTask.groupBy({
    by: ["section", "groupName", "status"],
    where: filter,
    _count: { _all: true },
  });

  const summaries = new Map<string, EmpresaSummary>();
  for (const row of grouped) {
    const key = `${row.section}|${row.groupName}`;
    if (!summaries.has(key)) {
      summaries.set(key, {
        section: row.section,
        groupName: row.groupName,
        PENDIENTE: 0,
        EN_CURSO: 0,
        CERRADO: 0,
        total: 0,
      });
    }
    const summary = summaries.get(key)!;
    summary[row.status] = row._count._all;
    summary.total += row._count._all;
  }

  const sorted = Array.from(summaries.values()).sort((a, b) =>
    a.groupName.localeCompare(b.groupName)
  );
  const proyectos = sorted.filter((s) => s.section === "PROYECTOS");
  const interna = sorted.filter((s) => s.section === "GESTION_INTERNA");

  return (
    <AppShell
      userName={session.user.name ?? ""}
      userRole={session.user.role}
      activeNav="pendientes"
    >
      <div className="p-4 sm:p-8">
        {header}

        {hasActiveFilter && sorted.length === 0 && (
          <div className="mb-6 rounded-lg border border-dashed border-brand-border bg-brand-surface py-8 text-center text-sm text-brand-muted">
            No hay pendientes
            {responsable ? ` de "${responsable}"` : ""}
            {status ? ` con estado "${STATUS_LABELS[status]}"` : ""}.{" "}
            <a href={pendientesHref({})} className="text-brand-blue hover:underline">
              Quitar filtros
            </a>
          </div>
        )}

        <EmpresaCards
          title="Pendientes de proyectos"
          empresas={proyectos}
          responsable={responsable}
          estado={status}
        />
        <EmpresaCards
          title="Gestión interna"
          empresas={interna}
          responsable={responsable}
          estado={status}
        />
      </div>
    </AppShell>
  );
}
