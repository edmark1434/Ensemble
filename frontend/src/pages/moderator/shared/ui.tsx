import type { ComponentType } from "react";
import type { Alert, SupportTicket } from "./moderatorTypes";

export type Accent = "sky" | "violet" | "emerald" | "rose";

// Static class maps so Tailwind can see the full class names at build time.
const ACCENT_TEXT: Record<Accent, string> = {
  sky: "text-sky-400",
  violet: "text-violet-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
};

const ACCENT_SPINNER: Record<Accent, string> = {
  sky: "text-sky-400",
  violet: "text-violet-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
};

export function accentText(accent: Accent) {
  return ACCENT_TEXT[accent];
}

export function accentSpinner(accent: Accent) {
  return ACCENT_SPINNER[accent];
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "sky",
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: ComponentType<{ className?: string }>;
  accent?: Accent;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-white">{value}</p>
          <p className="mt-1 text-xs text-zinc-500">{sub}</p>
        </div>
        <Icon className={`h-5 w-5 ${ACCENT_TEXT[accent]}`} />
      </div>
    </div>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  error: "border-red-500/20 bg-red-500/[0.06] text-red-200",
  warning: "border-amber-500/20 bg-amber-500/[0.06] text-amber-200",
  info: "border-sky-500/20 bg-sky-500/[0.06] text-sky-200",
  success: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-200",
};

export function AlertList({ alerts }: { alerts: Alert[] }) {
  return (
    <ul className="space-y-2">
      {alerts.map((a) => (
        <li
          key={a.id}
          className={`rounded-lg border px-3 py-2 text-sm ${SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.info}`}
        >
          {a.message}
        </li>
      ))}
    </ul>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "high"
      ? "bg-red-500/15 text-red-300"
      : priority === "medium"
        ? "bg-amber-500/15 text-amber-300"
        : "bg-zinc-500/15 text-zinc-300";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{priority}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "bg-red-500/15 text-red-300"
      : status === "in_progress"
        ? "bg-amber-500/15 text-amber-300"
        : status === "escalated"
          ? "bg-violet-500/15 text-violet-300"
          : status === "under_review"
            ? "bg-sky-500/15 text-sky-300"
            : "bg-emerald-500/15 text-emerald-300";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{status.replace("_", " ")}</span>;
}

export function TicketsTable({
  tickets,
  onSelect,
}: {
  tickets: SupportTicket[];
  onSelect: (id: number | string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
            <th className="pb-2">ID</th>
            <th className="pb-2">Ticket</th>
            <th className="pb-2">Requester</th>
            <th className="pb-2">Category</th>
            <th className="pb-2">Priority</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Msgs</th>
            <th className="pb-2">Assignee</th>
            <th className="pb-2">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {tickets.map((t) => (
            <tr key={t.id} onClick={() => onSelect(t.id)} className="cursor-pointer transition hover:bg-white/[0.03]">
              <td className="py-2.5 font-mono text-[11px] text-zinc-500">{t.number}</td>
              <td className="max-w-[220px] truncate py-2.5 font-medium text-zinc-200">{t.subject}</td>
              <td className="py-2.5 text-zinc-400">@{t.requester.username}</td>
              <td className="py-2.5 capitalize text-zinc-400">{t.category || "—"}</td>
              <td className="py-2.5">
                <PriorityBadge priority={t.priority} />
              </td>
              <td className="py-2.5">
                <StatusBadge status={t.status} />
              </td>
              <td className="py-2.5 tabular-nums text-zinc-400">{t.messageCount ?? 0}</td>
              <td className="py-2.5 text-zinc-400">{t.assignee?.name || "Unassigned"}</td>
              <td className="py-2.5 text-zinc-500">{new Date(t.updatedAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
