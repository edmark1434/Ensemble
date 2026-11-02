import type { ReactNode } from "react";

export function titleCase(value?: string | null, fallback = "") {
  const text = String(value || fallback)
    .replace(/[_-]+/g, " ")
    .trim();
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatWhen(value?: string | null, withTime = true) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function isClosedStatus(status?: string | null) {
  return String(status || "").toLowerCase() === "closed";
}

const ROLE_STYLES: Record<string, { label: string; className: string }> = {
  disputer: {
    label: "Disputer",
    className: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200",
  },
  disputee: {
    label: "Disputee",
    className: "border-cyan-300 bg-cyan-50 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-200",
  },
  staff: {
    label: "Staff",
    className: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  },
  community: {
    label: "Community",
    className: "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300",
  },
};

export function roleKey(role?: string | null) {
  const value = String(role || "").toLowerCase();
  if (value === "public") return "community";
  return ROLE_STYLES[value] ? value : null;
}

export function RoleChip({ role }: { role?: string | null }) {
  const key = roleKey(role);
  if (!key) return null;
  const style = ROLE_STYLES[key];
  return (
    <span className={`rounded-full border px-2 py-px text-[10px] font-semibold uppercase tracking-wide ${style.className}`}>
      {style.label}
    </span>
  );
}

function statusClass(status?: string | null) {
  const value = String(status || "open").toLowerCase();
  if (value === "closed") {
    return "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300";
  }
  if (value === "under review" || value === "under_review") {
    return "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  }
  return "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200";
}

export function StatusPill({ status }: { status?: string | null }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClass(status)}`}>
      {titleCase(status, "Open")}
    </span>
  );
}

export function VisibilityPill({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        isPublic
          ? "border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200"
          : "border-gray-200 bg-gray-100 text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
      }`}
    >
      {isPublic ? "Public" : "Private"}
    </span>
  );
}

export function Avatar({ name, role }: { name?: string | null; role?: string | null }) {
  const key = roleKey(role);
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";
  const tone =
    key === "disputer"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200"
      : key === "disputee"
        ? "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-200"
        : key === "staff"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
          : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-200";
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${tone}`}>
      {initial}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-dark-surface ${className}`}
    >
      {children}
    </div>
  );
}
