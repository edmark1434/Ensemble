import { useEffect, useState } from 'react';
import { Archive, CheckCircle2, Loader2, RotateCcw, XCircle } from 'lucide-react';
import type { MarketplaceListing } from './marketplaceTypes';

/** Moderation actions a listing can receive, independent of where they are triggered from. */
export type ListingAction = 'approve' | 'reject' | 'delist' | 'rereview';

export type ListingActionMeta = {
  /** Status written to `marketplace_listings.status`. */
  status: MarketplaceListing['status'];
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
    label: 'Approve and publish',
    icon: CheckCircle2,
    tone: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10',
    wideTone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    requiresReason: false,
    dialogTitle: 'Approve listing',
    dialogHint: 'The asset is published to the catalog and the seller is notified.',
    placeholder: '',
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
      'The asset returns to draft and the seller sees this reason, so write what has to change before it can be resubmitted.',
    placeholder: 'Why this listing cannot be published…',
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
      'Use this for a takedown: the asset leaves the live catalog immediately and goes back to draft. The seller is notified with this reason.',
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
export function actionsForStatus(status: MarketplaceListing['status']): ListingAction[] {
  if (status === 'pending') return ['approve', 'reject'];
  if (status === 'approved') return ['rereview', 'delist', 'reject'];
  if (status === 'delisted') return ['approve', 'rereview'];
  return ['approve'];
}

/** Reason prompt shared by the queue table and the listing detail modal. */
export function ListingReasonDialog({
  action,
  listingTitle,
  saving,
  onCancel,
  onConfirm,
}: {
  action: ListingAction;
  listingTitle: string;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const meta = LISTING_ACTIONS[action];
  const [reason, setReason] = useState('');

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

  const blocked = saving || (meta.requiresReason && reason.trim().length < 5);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/[0.06] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">{meta.dialogTitle}</h2>
          <p className="mt-1 truncate text-xs text-zinc-500">{listingTitle}</p>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-xs leading-relaxed text-zinc-400">{meta.dialogHint}</p>
          {meta.requiresReason && (
            <>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Reason (required)
              </label>
              <textarea
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
                placeholder={meta.placeholder}
                className="w-full resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
              />
              <p className="text-[11px] text-zinc-600">
                Stored on the listing and sent to the seller. Minimum 5 characters.
              </p>
            </>
          )}
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
            onClick={() => onConfirm(reason.trim())}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${meta.wideTone}`}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
