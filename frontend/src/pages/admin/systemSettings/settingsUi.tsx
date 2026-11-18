import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2, RotateCcw, Save, X } from 'lucide-react';
import type { NumberRule } from './settingsTypes';

export const INPUT_BASE =
  'w-full rounded-xl border bg-[#0c0d12] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50';

export function inputTone(invalid?: boolean) {
  return invalid
    ? 'border-amber-500/50 focus:border-amber-400/60 focus:ring-amber-500/15'
    : 'border-white/10 focus:border-rose-500/40 focus:ring-rose-500/15';
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function SettingsCard({
  title,
  description,
  icon,
  action,
  children,
  flush = false,
}: {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-300">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            {description && <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={flush ? '' : 'divide-y divide-white/[0.06] px-5'}>{children}</div>
    </section>
  );
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-300">
      <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/**
 * One setting: label and explanation on the left, the control on the right (stacked on phones).
 * Shows the default and a reset button once the value differs from it.
 */
export function SettingRow({
  label,
  description,
  htmlFor,
  control,
  error,
  errorId,
  modified,
  defaultLabel,
  onReset,
  children,
  wide = false,
}: {
  label: string;
  description?: ReactNode;
  htmlFor?: string;
  control: ReactNode;
  error?: string;
  errorId?: string;
  /** Differs from the saved value. */
  modified?: boolean;
  /** Human-readable default, shown with a reset action when the value is not the default. */
  defaultLabel?: string | null;
  onReset?: () => void;
  children?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="py-4">
      <div className={`grid gap-3 ${wide ? '' : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)] sm:items-start sm:gap-6'}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <label htmlFor={htmlFor} className="text-sm font-medium text-white">
              {label}
            </label>
            {modified && (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-px text-[10px] font-medium text-amber-200">Edited</span>
            )}
          </div>
          {description && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>}
          {defaultLabel && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-zinc-200"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to default ({defaultLabel})
            </button>
          )}
        </div>
        <div className="min-w-0">
          {control}
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
  describedBy,
  tone = 'rose',
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
  id?: string;
  describedBy?: string;
  tone?: 'rose' | 'amber';
}) {
  const on = tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? on : 'bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

/** A switch with its state spelled out next to it. */
export function SwitchControl({
  checked,
  onChange,
  label,
  onText,
  offText,
  id,
  describedBy,
  tone,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  onText: string;
  offText: string;
  id?: string;
  describedBy?: string;
  tone?: 'rose' | 'amber';
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 sm:justify-end">
      <span className={`text-xs font-medium ${checked ? (tone === 'amber' ? 'text-amber-200' : 'text-white') : 'text-zinc-500'}`}>
        {checked ? onText : offText}
      </span>
      <Switch
        id={id}
        checked={checked}
        onChange={onChange}
        label={label}
        describedBy={describedBy}
        tone={tone}
        disabled={disabled}
      />
    </div>
  );
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : '';
}

function parseNumber(text: string) {
  const trimmed = text.trim();
  return trimmed === '' || trimmed === '-' || trimmed === '.' ? Number.NaN : Number(trimmed);
}

/**
 * Text-based number input: keeps what the admin types ("1.", "") instead of snapping to 0,
 * and does not change on scroll like `type="number"`. Emits NaN while the field is not a number.
 */
export function NumberInput({
  id,
  value,
  onChange,
  rule,
  invalid,
  prefix,
  suffix,
  describedBy,
  disabled,
  ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  rule?: NumberRule;
  invalid?: boolean;
  prefix?: string;
  suffix?: string;
  describedBy?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const [text, setText] = useState(() => formatNumber(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // The value changed from outside (discard, reset, reload): show it, unless the text
  // already means that value (the admin is typing "1." on the way to "1.5").
  if (!Object.is(value, syncedValue)) {
    setSyncedValue(value);
    if (!Object.is(parseNumber(text), value)) setText(formatNumber(value));
  }

  const integer = rule?.integer;
  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">{prefix}</span>
      )}
      <input
        id={id}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        autoComplete="off"
        value={text}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d.,-]/g, '').replace(/,/g, '');
          setText(next);
          onChange(parseNumber(next));
        }}
        onBlur={() => {
          const parsed = parseNumber(text);
          if (Number.isFinite(parsed)) setText(formatNumber(parsed));
        }}
        className={`${INPUT_BASE} ${inputTone(invalid)} tabular-nums ${prefix ? 'pl-7' : ''} ${suffix ? 'pr-16' : ''}`}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-zinc-500">{suffix}</span>
      )}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  invalid,
  placeholder,
  type = 'text',
  maxLength,
  describedBy,
  disabled,
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  type?: 'text' | 'email';
  maxLength?: number;
  describedBy?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      maxLength={maxLength ? maxLength + 20 : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(event) => onChange(event.target.value)}
      className={`${INPUT_BASE} ${inputTone(invalid)}`}
    />
  );
}

/** Stable ids for a row's input and error, so labels and screen readers connect them. */
export function useFieldIds(name: string) {
  const base = useId();
  return { input: `${base}-${name}`, error: `${base}-${name}-error` };
}

// ---------------------------------------------------------------------------
// Save bar and dialogs
// ---------------------------------------------------------------------------

export function SaveBar({
  sectionLabel,
  changeCount,
  errorCount,
  saving,
  onSave,
  onDiscard,
}: {
  sectionLabel: string;
  changeCount: number;
  errorCount: number;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!changeCount) return null;
  const blocked = errorCount > 0;
  return (
    <div className="sticky bottom-4 z-20" role="region" aria-label={`Unsaved ${sectionLabel} changes`}>
      <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.1] bg-[#14151c]/95 px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          {blocked ? (
            <p className="flex items-center gap-2 text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Fix {errorCount} field{errorCount === 1 ? '' : 's'} before saving.
            </p>
          ) : (
            <p className="text-zinc-300">
              <span className="font-semibold text-white">{changeCount}</span> unsaved change{changeCount === 1 ? '' : 's'} in {sectionLabel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            className="flex-1 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:text-white disabled:opacity-50 sm:flex-none"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || blocked}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500/90 px-5 py-2 text-sm font-medium text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone = 'default',
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const latest = useRef({ busy, onCancel });
  useEffect(() => {
    latest.current = { busy, onCancel };
  });

  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !latest.current.busy) latest.current.onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:pl-[260px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button type="button" className="absolute inset-0 bg-black/70" onClick={busy ? undefined : onCancel} aria-label="Close" />
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <h2 id={titleId} className="text-base font-bold text-white">
            {title}
          </h2>
          <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg p-1.5 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm text-zinc-300">{children}</div>
        <div className="flex justify-end gap-2 border-t border-white/[0.08] px-5 py-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              tone === 'danger' ? 'bg-red-500/90 hover:bg-red-500' : 'bg-rose-500/90 hover:bg-rose-500'
            }`}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Warn before losing unsaved edits: on reload/close, and on in-app link clicks.
 * The console uses a non-data router (no useBlocker), so links are intercepted in the
 * capture phase before React Router handles them.
 */
export function useUnsavedChangesGuard(dirty: boolean, message = 'You have unsaved settings changes. Leave without saving?') {
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [dirty, message]);
}
