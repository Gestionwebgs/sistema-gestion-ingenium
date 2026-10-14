export type TaskSection = "PROYECTOS" | "GESTION_INTERNA";

export function pendientesHref(
  params: Record<string, string | null | undefined>
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return `/pendientes${text ? `?${text}` : ""}`;
}

export function empresaHref(section: TaskSection, groupName: string): string {
  return pendientesHref({ empresa: groupName, seccion: section });
}
