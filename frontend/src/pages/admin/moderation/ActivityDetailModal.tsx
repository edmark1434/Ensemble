import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  Clock,
  Copy,
  Database,
  Info,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Undo2,
  User,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { ActivityDetail, ModerationActivity } from './moderationTypes';
import {
  copyToClipboard,
  formatDateTime,
  formatExactDateTime,
  formatRelative,
  severityClass,
  severityLabel,
  statusClass,
} from './moderationFormat';

/** Values the backend tags as dates are rendered in the viewer's time zone. */
function renderDetailValue(detail: ActivityDetail) {
  if (detail.value === null || detail.value === undefined || detail.value === '') return '—';
  if (detail.type === 'boolean') return detail.value ? 'Yes' : 'No';
  if (detail.type === 'date') return formatDateTime(String(detail.value));
  if (detail.type === 'number') return Number(detail.value).toLocaleString();
  return String(detail.value);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      title={`Copy ${label}`}
      aria-label={`Copy ${label}`}
      onClick={async () => {
        const ok = await copyToClipboard(value);
        if (ok) setCopied(true);
        else showErrorToast('Your browser blocked the copy');
      }}
      className="shrink-0 rounded-md p-1 text-zinc-500 transition hover:bg-white/[0.06] hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Field({
  label,
  children,
  copyValue,
  mono,
  wide,
}: {
  label: string;
  children: ReactNode;
  copyValue?: string | null;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 ${wide ? 'sm:col-span-2' : ''}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 flex items-start justify-between gap-2">
        <div
          className={`min-w-0 break-words text-sm text-white ${mono ? 'font-mono text-[12px] leading-relaxed' : ''}`}
        >
          {children}
        </div>
        {copyValue ? <CopyButton value={copyValue} label={label.toLowerCase()} /> : null}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  hint,
}: {
  title: string;
  icon: typeof Info;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-zinc-500" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
      </div>
      {hint ? <p className="mt-1 text-[11px] text-zinc-600">{hint}</p> : null}
      <div className="mt-2">{children}</div>
    </section>
  );
}

/**
 * The full record behind one activity entry: what happened, what it changed,
 * who it hit, who did it, the record it points at, every metadata field, the
 * reversal trail, and the raw row for an audit export.
 */
export default function ActivityDetailModal({
  activity,
  onClose,
  onReversed,
}: {
  activity: ModerationActivity;
  onClose: () => void;
  onReversed?: (entry: ModerationActivity | null, entries: ModerationActivity[] | null) => void;
}) {
  const [entry, setEntry] = useState<ModerationActivity>(activity);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // The row handed over by a table may predate the latest reversal, and a row
  // from a cached overview carries no metadata, so always confirm it here.
  useEffect(() => {
    setEntry(activity);
    setConfirmReverse(false);
    setShowRaw(false);
    let active = true;
    setLoadingDetail(true);
    api
      .get(`/api/admin/moderation/activity/${activity.id}`)
      .then((res) => {
        if (active && res.data?.success && res.data.data) setEntry(res.data.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoadingDetail(false);
      });
    return () => {
      active = false;
    };
  }, [activity]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const details = entry.details || [];
  const reversal = entry.reversal;
  const isReversed = Boolean(reversal?.reversed) || entry.status === 'Reversed';
  const canReverse = Boolean(entry.reversible) && !isReversed;

  const rawJson = useMemo(
    () =>
      JSON.stringify(
        {
          activityId: entry.id,
          eventCode: entry.eventCode,
          action: entry.action,
          category: entry.category,
          severity: entry.severity,
          occurredAt: entry.timestamp,
          target: {
            name: entry.target,
            handle: entry.targetHandle,
            type: entry.targetType,
            accountId: entry.accountId,
            accountStatus: entry.accountStatus,
          },
          actor: {
            name: entry.executedBy,
            role: entry.executedByRole,
            handle: entry.executedByHandle,
            kind: entry.executedByKind,
            staffId: entry.executedByStaffId,
            accountId: entry.executedByAccountId,
          },
          reference: entry.reference,
          metadata: entry.metadata,
          reversal: entry.reversal,
        },
        null,
        2
      ),
    [entry]
  );

  const reverseAction = async () => {
    if (!canReverse || reversing) return;
    setReversing(true);
    try {
      const res = await api.post(`/api/admin/moderation/activity/${entry.id}/reverse`);
      if (!res.data?.success) throw new Error(res.data?.message || 'Failed to reverse action');
      showSuccessToast(res.data.message || 'Action reversed');
      const payload = res.data?.data;
      const nextEntry: ModerationActivity | null = payload?.entry || null;
      const nextEntries: ModerationActivity[] | null = Array.isArray(payload?.entries)
        ? payload.entries
        : Array.isArray(payload)
          ? payload
          : null;
      if (nextEntry) setEntry(nextEntry);
      setConfirmReverse(false);
      onReversed?.(nextEntry, nextEntries);
    } catch (err: unknown) {
      showErrorToast(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Failed to reverse action')
      );
    } finally {
      setReversing(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 py-10 md:pl-[260px]">
      <button type="button" className="fixed inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div
        role="dialog"
        aria-label="Activity detail"
        className="relative w-full max-w-3xl rounded-2xl border border-white/[0.1] bg-[#12131a] shadow-2xl"
      >
        <header className="sticky top-0 z-10 rounded-t-2xl border-b border-white/[0.06] bg-[#12131a]/95 px-6 py-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityClass(entry.severity || 'low')}`}
                >
                  {severityLabel(entry.severity || 'low')}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                  {entry.categoryLabel || entry.category}
                </span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(entry.status)}`}>
                  {entry.status}
                </span>
                {entry.eventCode ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                    {entry.eventCode}
                  </span>
                ) : null}
                {loadingDetail ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" /> : null}
              </div>
              <h2 className="mt-2 text-lg font-bold leading-snug text-white">{entry.action}</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {entry.eventLabel ? `${entry.eventLabel} · ` : ''}
                {formatExactDateTime(entry.timestamp)} ({formatRelative(entry.timestamp)})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="space-y-6 px-6 py-5">
          {entry.impact ? (
            <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm leading-relaxed text-zinc-300">
              <Info className="mr-1.5 -mt-0.5 inline h-3.5 w-3.5 text-zinc-500" />
              {entry.impact}
            </p>
          ) : null}

          {isReversed ? (
            <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.07] px-4 py-3">
              <p className="flex items-center gap-1.5 text-sm font-medium text-violet-100">
                <Undo2 className="h-4 w-4" />
                This action was reversed
              </p>
              <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-zinc-300 sm:grid-cols-2">
                <div className="flex gap-1.5">
                  <dt className="text-zinc-500">Reversed</dt>
                  <dd>{formatDateTime(reversal?.at)}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="text-zinc-500">By</dt>
                  <dd>
                    {reversal?.by || 'Staff'}
                    {reversal?.byRole ? ` — ${reversal.byRole}` : ''}
                  </dd>
                </div>
                {reversal?.note ? (
                  <div className="flex gap-1.5 sm:col-span-2">
                    <dt className="text-zinc-500">Note</dt>
                    <dd className="break-words">{reversal.note}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          <Section title="Who it affected" icon={User}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Target">
                {entry.target}
                {entry.targetHandle && entry.targetHandle !== '—' ? (
                  <span className="ml-1.5 text-xs text-zinc-500">@{entry.targetHandle}</span>
                ) : null}
              </Field>
              <Field label="Target type">{entry.targetType}</Field>
              <Field label="Account status">{entry.accountStatus || '—'}</Field>
              <Field label="Account ID" copyValue={entry.accountId || null} mono>
                {entry.accountId || '—'}
              </Field>
            </div>
          </Section>

          <Section title="Who performed it" icon={ShieldAlert}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Executed by">
                {entry.executedBy}
                {entry.executedByHandle && entry.executedByHandle !== '—' ? (
                  <span className="ml-1.5 text-xs text-zinc-500">@{entry.executedByHandle}</span>
                ) : null}
              </Field>
              <Field label="Role">
                {entry.executedByRole}
                {entry.executedByKind && entry.executedByKind !== entry.executedByRole ? (
                  <span className="ml-1.5 text-xs text-zinc-500">({entry.executedByKind})</span>
                ) : null}
              </Field>
              <Field label="Staff ID" copyValue={entry.executedByStaffId || null} mono>
                {entry.executedByStaffId || '—'}
              </Field>
              <Field label="Actor account ID" copyValue={entry.executedByAccountId || null} mono>
                {entry.executedByAccountId || '—'}
              </Field>
            </div>
          </Section>

          <Section
            title="Details recorded with the action"
            icon={Clock}
            hint={details.length ? undefined : 'This event was written without extra fields.'}
          >
            {details.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {details.map((detail) => (
                  <Field
                    key={detail.key}
                    label={detail.label}
                    wide={detail.type === 'text' && String(detail.value || '').length > 60}
                    mono={detail.type === 'id'}
                    copyValue={detail.type === 'id' ? String(detail.value ?? '') : null}
                  >
                    <span className={detail.type === 'text' ? 'whitespace-pre-wrap' : ''}>
                      {renderDetailValue(detail)}
                    </span>
                  </Field>
                ))}
              </div>
            ) : null}
          </Section>

          <Section title="Record and audit trail" icon={Database}>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Reference" copyValue={entry.reference?.id || null}>
                {entry.reference?.label || '—'}
              </Field>
              <Field label="Stored in table" mono>
                {entry.reference?.table || '—'}
              </Field>
              <Field label="Reference ID" copyValue={entry.reference?.id || null} mono wide>
                {entry.reference?.id || '—'}
              </Field>
              <Field label="Activity ID" copyValue={entry.id} mono wide>
                {entry.id}
              </Field>
              <Field label="Occurred at" copyValue={entry.timestamp || null} wide>
                {formatExactDateTime(entry.timestamp)}
                <span className="ml-1.5 text-xs text-zinc-500">({formatRelative(entry.timestamp)})</span>
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowRaw((v) => !v)}
              className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showRaw ? 'rotate-180' : ''}`} />
              {showRaw ? 'Hide raw record' : 'Show raw record'}
            </button>
            {showRaw ? (
              <div className="mt-2 rounded-xl border border-white/[0.06] bg-[#0f1016]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    account_activity row
                  </p>
                  <CopyButton value={rawJson} label="raw record" />
                </div>
                <pre className="max-h-72 overflow-auto px-3 py-2.5 font-mono text-[11px] leading-relaxed text-zinc-400">
                  {rawJson}
                </pre>
              </div>
            ) : null}
          </Section>
        </div>

        <footer className="sticky bottom-0 rounded-b-2xl border-t border-white/[0.06] bg-[#12131a]/95 px-6 py-4 backdrop-blur">
          {canReverse ? (
            confirmReverse ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-relaxed text-zinc-400">
                  This undoes the action on the account and writes a reversal entry to this log. It
                  cannot be undone from here.
                </p>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmReverse(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={reversing}
                    onClick={() => void reverseAction()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-violet-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {reversing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    {reversing ? 'Reversing…' : 'Confirm reverse'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">This action can still be reversed.</p>
                <button
                  type="button"
                  onClick={() => setConfirmReverse(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-200 hover:bg-violet-500/20"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reverse this action
                </button>
              </div>
            )
          ) : (
            <p className="text-center text-xs text-zinc-500">
              {isReversed
                ? 'This action has already been reversed.'
                : 'This event is a record only — there is nothing to reverse.'}
            </p>
          )}
        </footer>
      </div>
    </div>,
    document.body
  );
}
