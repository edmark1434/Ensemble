import type { ComponentType, ReactNode } from "react";

export const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

export const BTN = {
  neutral: `${BTN_BASE} border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10`,
  claim: `${BTN_BASE} border-sky-500/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20`,
  warn: `${BTN_BASE} border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20`,
  danger: `${BTN_BASE} border-red-500/30 bg-red-500/10 text-red-100 hover:bg-red-500/20`,
  success: `${BTN_BASE} border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20`,
  admin: `${BTN_BASE} border-violet-500/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20`,
} as const;

export const FIELD =
  "w-full rounded-lg border border-white/10 bg-[#0f1016] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/25 disabled:cursor-not-allowed disabled:opacity-50";

export function Pill({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${className}`}>
      {children}
    </span>
  );
}

export function SidebarSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/[0.08] bg-[#14151c] p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{title}</h3>
        {action}
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-medium text-zinc-500">{children}</p>;
}

export function Fact({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 break-words text-sm text-zinc-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

export function PanelSection({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
        {title}
        {typeof count === "number" && (
          <span className="rounded-full bg-white/5 px-1.5 py-px text-[10px] font-medium text-zinc-400">{count}</span>
        )}
      </h4>
      {children}
    </section>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-zinc-500">{children}</p>
  );
}

export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel,
  busyLabel,
  busy,
  confirmDisabled,
  confirmClassName,
  hideConfirm = false,
  cancelLabel = "Cancel",
  onCancel,
  onConfirm,
}: {
  title: string;
  description: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  confirmDisabled?: boolean;
  confirmClassName: string;
  hideConfirm?: boolean;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-full w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#14151c] p-5 shadow-2xl">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <div className="mt-1 text-xs leading-relaxed text-zinc-400">{description}</div>
        </div>
        {children}
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className={BTN.neutral}>
            {cancelLabel}
          </button>
          {!hideConfirm ? (
            <button
              type="button"
              disabled={busy || confirmDisabled}
              onClick={onConfirm}
              className={confirmClassName}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string; icon: ComponentType<{ className?: string }> }[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <nav className="flex shrink-0 gap-1 border-b border-white/10 px-4" aria-label={label}>
      {tabs.map((item) => {
        const isActive = item.id === active;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-pressed={isActive}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${
              isActive ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
