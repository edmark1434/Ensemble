import { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import type { ListingStatus } from './marketplaceTypes';

/** Moderation actions a listing can receive, independent of where they are triggered from. */
export type ListingAction = 'approve' | 'reject' | 'delist' | 'rereview';

/** When an approval goes live (`publishMode` on the PATCH). */
export type PublishMode = 'now' | '24h' | '7d' | 'date';

/** What the decision dialog collects. `reason` is the message the seller reads. */
export type ListingDecisionInput = {
  reason: string;
  publishMode: PublishMode;
  /** ISO time, only for `publishMode: 'date'`. */
  publishAt?: string;
};

export type ListingActionMeta = {
  /** Status sent as `status` on the PATCH (approval may be stored as `scheduled`). */
  status: Exclude<ListingStatus, 'scheduled'>;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Border/background/text classes for a compact icon button. */
  tone: string;
  /** Classes for the wide button used in the detail modal. */
  wideTone: string;
  requiresReason: boolean;
  dialogTitle: string;
  dialogHint: string;
  placeholder: string;
  confirmLabel: string;
  successMessage: string;
};

export const LISTING_ACTIONS: Record<ListingAction, ListingActionMeta> = {
  approve: {
    status: 'approved',
    label: 'Approve',
    icon: CheckCircle2,
    tone: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10',
    wideTone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    requiresReason: false,
    dialogTitle: 'Approve listing',
    dialogHint:
      'Pick when the asset goes live. Until then it stays out of the catalog, and you can still publish it early, move the time, or reject it. The seller is notified now.',
    placeholder: 'Optional note to the seller…',
    confirmLabel: 'Approve',
    successMessage: 'Listing approved',
  },
  reject: {
    status: 'rejected',
    label: 'Reject',
    icon: XCircle,
    tone: 'border-red-500/30 text-red-300 hover:bg-red-500/10',
    wideTone: 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20',
    requiresReason: true,
    dialogTitle: 'Reject listing',
    dialogHint:
      'The asset returns to draft and the seller reads this message in the review conversation. Say what has to change: they answer by resubmitting with a message of their own.',
    placeholder: 'What has to change before this can be published…',
    confirmLabel: 'Confirm reject',
    successMessage: 'Listing rejected',
  },
  delist: {
    status: 'delisted',
    label: 'Delist from catalog',
    icon: Archive,
    tone: 'border-zinc-500/30 text-zinc-300 hover:bg-zinc-500/10',
    wideTone: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-300 hover:bg-zinc-500/20',
    requiresReason: true,
    dialogTitle: 'Delist from the catalog',
    dialogHint:
      'Use this for a takedown: the asset leaves the live catalog immediately and goes back to draft. Buyers keep their licenses. The seller reads this reason and can resubmit with a message for a fresh review.',
    placeholder: 'Takedown reason, e.g. verified copyright claim from CLM-1024…',
    confirmLabel: 'Delist asset',
    successMessage: 'Listing delisted',
  },
  rereview: {
    status: 'pending',
    label: 'Require re-approval',
    icon: RotateCcw,
    tone: 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10',
    wideTone: 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
    requiresReason: true,
    dialogTitle: 'Send back for re-approval',
    dialogHint:
      'The asset leaves the live catalog and returns to the pending queue for a fresh review. Use this when a published asset is flagged, for example by a copyright report, and you still have to check it.',
    placeholder: 'Why this asset has to be reviewed again…',
    confirmLabel: 'Send to review',
    successMessage: 'Listing sent back for re-approval',
  },
};

/** Actions offered for a listing in its current state, in the order they should appear. */
export function actionsForStatus(status: ListingStatus): ListingAction[] {
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'scheduled') return ['approve', 'reject'];
  if (status === 'approved') return ['rereview', 'delist', 'reject'];
  if (status === 'delisted') return ['approve', 'rereview'];
  return ['approve'];
}

/** Button label for an action on a listing in `status`. */
export function actionLabel(action: ListingAction, status: ListingStatus) {
  if (action === 'approve' && status === 'scheduled') return 'Publish now or reschedule';
  if (action === 'approve' && status === 'delisted') return 'Approve and relist';
  return LISTING_ACTIONS[action].label;
}

/** PATCH body for a decision, shared by the queue table and the detail modal. */
export function listingDecisionPayload(action: ListingAction, input: ListingDecisionInput) {
  const meta = LISTING_ACTIONS[action];
  if (action === 'approve') {
    return {
      status: meta.status,
      publishMode: input.publishMode,
      publishAt: input.publishMode === 'date' ? input.publishAt : undefined,
      message: input.reason || undefined,
    };
  }
  if (action === 'reject') {
    return { status: meta.status, rejectionReason: input.reason, reason: input.reason };
  }
  return { status: meta.status, moderationNote: input.reason, reason: input.reason };
}

export function formatGoLive(value: string | Date | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Toast after a decision; a scheduled approval names its go-live time. */
export function decisionSuccessMessage(
  action: ListingAction,
  input: ListingDecisionInput,
  savedPublishAt?: string | null
) {
  if (action === 'approve' && input.publishMode !== 'now') {
    return `Listing approved — goes live ${formatGoLive(savedPublishAt || input.publishAt || null)}`;
  }
  if (action === 'approve') return 'Listing approved and published';
  return LISTING_ACTIONS[action].successMessage;
}

const HOUR_MS = 60 * 60 * 1000;
const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_LEAD_MS = 365 * 24 * HOUR_MS;

const PUBLISH_OPTIONS: { id: PublishMode; label: string; offsetMs: number | null }[] = [
  { id: 'now', label: 'Now', offsetMs: 0 },
  { id: '24h', label: 'In 24 hours', offsetMs: 24 * HOUR_MS },
  { id: '7d', label: 'In 7 days', offsetMs: 7 * 24 * HOUR_MS },
  { id: 'date', label: 'Pick a date', offsetMs: null },
];

/** `datetime-local` value (local time, minute precision) for a timestamp. */
function toLocalInput(ms: number) {
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Decision prompt shared by the queue table and the listing detail modal. Every action opens
 * it: approve asks when the asset goes live (message optional), the others need a message the
 * seller reads (5+ characters).
 */
export function ListingReasonDialog({
  action,
  listingTitle,
  currentStatus,
  currentPublishAt,
  saving,
  onCancel,
  onConfirm,
}: {
  action: ListingAction;
  listingTitle: string;
  currentStatus?: ListingStatus;
  /** Present when the listing is already scheduled. */
  currentPublishAt?: string | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (input: ListingDecisionInput) => void;
}) {
  const meta = LISTING_ACTIONS[action];
  const isApprove = action === 'approve';
  const [reason, setReason] = useState('');
  const [publishMode, setPublishMode] = useState<PublishMode>('now');
  const [dateValue, setDateValue] = useState(() =>
    toLocalInput(currentPublishAt ? new Date(currentPublishAt).getTime() : Date.now() + 24 * HOUR_MS)
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const dateMs = useMemo(() => (dateValue ? new Date(dateValue).getTime() : NaN), [dateValue]);
  const dateError = (() => {
    if (!isApprove || publishMode !== 'date') return '';
    if (!Number.isFinite(dateMs)) return 'Pick a date and time.';
    const lead = dateMs - Date.now();
    if (lead < MIN_LEAD_MS) return 'Pick a time at least 5 minutes from now.';
    if (lead > MAX_LEAD_MS) return 'Pick a time within the next 365 days.';
    return '';
  })();

  const goLiveMs = (() => {
    if (!isApprove) return null;
    if (publishMode === 'date') return Number.isFinite(dateMs) ? dateMs : null;
    const option = PUBLISH_OPTIONS.find((o) => o.id === publishMode);
    return Date.now() + (option?.offsetMs || 0);
  })();

  const trimmed = reason.trim();
  const blocked =
    saving ||
    (meta.requiresReason && trimmed.length < 5) ||
    trimmed.length > 2000 ||
    Boolean(dateError);

  const confirmLabel = isApprove
    ? publishMode === 'now'
      ? 'Approve and publish'
      : currentStatus === 'scheduled'
        ? 'Save new go-live time'
        : 'Approve and schedule'
    : meta.confirmLabel;

  const confirm = () => {
    if (blocked) return;
    onConfirm({
      reason: trimmed,
      publishMode: isApprove ? publishMode : 'now',
      publishAt: isApprove && publishMode === 'date' ? new Date(dateMs).toISOString() : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">
            {isApprove && currentStatus === 'scheduled' ? 'Publish now or reschedule' : meta.dialogTitle}
          </h2>
          <p className="mt-1 truncate text-xs text-zinc-500">{listingTitle}</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-xs leading-relaxed text-zinc-400">{meta.dialogHint}</p>

          {isApprove && (
            <div className="space-y-2">
              {currentStatus === 'scheduled' && currentPublishAt && (
                <p className="rounded-lg border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2 text-[11px] text-sky-100">
                  Currently scheduled for {formatGoLive(currentPublishAt)}.
                </p>
              )}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Goes live</p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="When the listing goes live">
                {PUBLISH_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={publishMode === option.id}
                    onClick={() => setPublishMode(option.id)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                      publishMode === option.id
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/[0.03]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {publishMode === 'date' && (
                <div>
                  <input
                    type="datetime-local"
                    value={dateValue}
                    min={toLocalInput(Date.now() + MIN_LEAD_MS)}
                    max={toLocalInput(Date.now() + MAX_LEAD_MS)}
                    onChange={(event) => setDateValue(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none transition [color-scheme:dark] focus:border-amber-500/40"
                  />
                  {dateError && <p className="mt-1 text-[11px] text-red-300">{dateError}</p>}
                </div>
              )}
              {goLiveMs !== null && !dateError && (
                <p className="text-[11px] text-zinc-500">
                  {publishMode === 'now'
                    ? 'Published to the catalog as soon as you confirm.'
                    : `Goes live ${formatGoLive(new Date(goLiveMs))} (your local time).`}
                </p>
              )}
            </div>
          )}

          <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {isApprove ? 'Note to the seller (optional)' : 'Message to the seller (required)'}
          </label>
          <textarea
            autoFocus={!isApprove}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={meta.placeholder}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
          />
          <p className="text-[11px] text-zinc-600">
            {meta.requiresReason
              ? 'Stored on the listing and shown to the seller in the review conversation. Minimum 5 characters.'
              : 'Shown to the seller in the review conversation.'}
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={confirm}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${meta.wideTone}`}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
