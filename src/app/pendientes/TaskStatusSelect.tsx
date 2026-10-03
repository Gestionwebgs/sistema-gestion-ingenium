"use client";

import { useTransition } from "react";
import { setTaskStatusAction } from "./actions";

const STATUS_OPTIONS = [
  { value: "PENDIENTE", label: "PENDIENTE", style: "bg-amber-100 text-amber-700" },
  { value: "EN_CURSO", label: "EN CURSO", style: "bg-blue-100 text-blue-700" },
  { value: "CERRADO", label: "CERRADO", style: "bg-green-100 text-green-700" },
] as const;

type Status = (typeof STATUS_OPTIONS)[number]["value"];

export function TaskStatusSelect({
  taskId,
  status,
}: {
  taskId: string;
  status: Status;
}) {
  const [isPending, startTransition] = useTransition();
  const current = STATUS_OPTIONS.find((o) => o.value === status)!;

  return (
    <select
      value={status}
      disabled={isPending}
      aria-label="Estado del pendiente"
      onChange={(e) => {
        const next = e.target.value as Status;
        startTransition(() => setTaskStatusAction(taskId, next));
      }}
      className={`shrink-0 cursor-pointer rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide disabled:opacity-50 ${current.style}`}
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
