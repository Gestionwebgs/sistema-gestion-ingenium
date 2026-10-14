import { pendientesHref, type TaskSection } from "./query";

export type EmpresaSummary = {
  section: TaskSection;
  groupName: string;
  PENDIENTE: number;
  EN_CURSO: number;
  CERRADO: number;
  total: number;
};

// Colores de cabecera de tarjeta: estables por nombre de empresa, para que
// cada empresa conserve siempre el mismo color entre visitas.
const CARD_COLORS = ["#070759", "#093e8c", "#2a78d6", "#1baf7a", "#eb6834", "#4a3aa7"];

function colorFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return CARD_COLORS[hash % CARD_COLORS.length];
}

const STATS = [
  { key: "PENDIENTE", label: "Pendiente", style: "bg-amber-50 text-amber-700" },
  { key: "EN_CURSO", label: "En curso", style: "bg-blue-50 text-blue-700" },
  { key: "CERRADO", label: "Cerrado", style: "bg-green-50 text-green-700" },
] as const;

export function EmpresaCards({
  title,
  empresas,
  responsable,
  estado,
}: {
  title: string;
  empresas: EmpresaSummary[];
  responsable?: string;
  estado?: string;
}) {
  if (empresas.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-sm font-semibold text-brand-navy">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {empresas.map((empresa) => {
          const closedPercent = empresa.total
            ? Math.round((empresa.CERRADO / empresa.total) * 100)
            : 0;
          return (
            <a
              key={`${empresa.section}|${empresa.groupName}`}
              href={pendientesHref({
                empresa: empresa.groupName,
                seccion: empresa.section,
                responsable,
                estado,
              })}
              className="block overflow-hidden rounded-lg border border-brand-border bg-brand-surface shadow-sm transition hover:shadow-md"
            >
              <div
                className="px-4 py-3"
                style={{ backgroundColor: colorFor(empresa.groupName) }}
              >
                <h3
                  className="truncate text-sm font-semibold text-white"
                  title={empresa.groupName}
                >
                  {empresa.groupName}
                </h3>
              </div>
              <div className="p-4">
                <p className="text-2xl font-bold text-brand-navy">
                  {empresa.total}
                  <span className="ml-1 text-xs font-normal text-brand-muted">
                    {empresa.total === 1 ? "tarea" : "tareas"}
                  </span>
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${closedPercent}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-brand-muted">
                  {closedPercent}% cerrado
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {STATS.map((stat) => (
                    <div
                      key={stat.key}
                      className={`rounded-md px-1 py-1.5 ${stat.style}`}
                    >
                      <p className="text-base font-semibold leading-none">
                        {empresa[stat.key]}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
