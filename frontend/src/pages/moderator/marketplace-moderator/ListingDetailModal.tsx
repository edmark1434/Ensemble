import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Flag,
  History,
  LayoutTemplate,
  Loader2,
  Send,
  ShieldCheck,
  ShoppingBag,
  Tag,
  User,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { useStaffLive } from '@/lib/staffLive';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import { mediaUrl, readableSize } from '@/pages/user/5_assets/assetTypes';
import ListingFileInspector, {
  FileTypeIcon,
  formatDuration,
  type InspectorTarget,
} from './ListingFileInspector';
import ListingThumb from './ListingThumb';
import { StaffPunishmentChips } from '@/components/account/MeritStatus';
import {
  LISTING_ACTIONS,
  ListingReasonDialog,
  actionLabel,
  actionsForStatus,
  decisionSuccessMessage,
  formatGoLive,
  listingDecisionPayload,
  type ListingAction,
  type ListingDecisionInput,
} from './listingActions';
import type {
  ListingReviewEvent,
  ListingThreadMessage,
  MarketplaceListing,
  SellerListingsHistory,
} from './marketplaceTypes';

function cloudUrl(path: string | null | undefined) {
  return mediaUrl(path);
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function relativeTime(value: string | null | undefined) {
  if (!value) return '—';
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function listingStatusClass(status: string) {
  switch (status) {
    case 'scheduled':
      return 'border-sky-500/25 bg-sky-500/10 text-sky-300';
    case 'approved':
      return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
    case 'rejected':
      return 'border-red-500/25 bg-red-500/10 text-red-300';
    case 'delisted':
      return 'border-zinc-500/25 bg-zinc-500/10 text-zinc-300';
    case 'pending':
    default:
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  }
}

function statusDotClass(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-sky-400';
    case 'approved':
      return 'bg-emerald-400';
    case 'rejected':
      return 'bg-red-400';
    case 'delisted':
      return 'bg-zinc-400';
    case 'pending':
    default:
      return 'bg-amber-400';
  }
}

/** `permanent` marks a rejection the seller cannot resubmit. */
export function listingStatusPill(status: string, permanent = false) {
  if (status === 'rejected' && permanent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-600/40 bg-rose-600/15 px-2 py-0.5 text-[10px] font-medium text-rose-200">
        <Ban className="h-3 w-3" />
        Permanently rejected
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${listingStatusClass(status)}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`} />
      {status}
    </span>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="h-3 w-3" />
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.04] py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-zinc-500">{label}</span>
      <span className="text-right text-xs text-zinc-200">{value}</span>
    </div>
  );
}

export function SellerListingsModal({
  accountId,
  onClose,
  onOpenListing,
  apiBase = '/api/moderator/marketplace',
}: {
  accountId: number | string;
  onClose: () => void;
  onOpenListing?: (listingId: string) => void;
  apiBase?: string;
}) {
  const [history, setHistory] = useState<SellerListingsHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`${apiBase}/users/${accountId}/listings`);
        if (active && res.data?.success) setHistory(res.data.data);
      } catch {
        if (active) showErrorToast('Failed to load seller listings');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accountId, apiBase]);

  // Live: the seller's other listings follow new uploads and decisions.
  useStaffLive(['marketplace', 'moderation'], () =>
    api
      .get(`${apiBase}/users/${accountId}/listings`)
      .then((res) => {
        if (res.data?.success) setHistory(res.data.data);
      })
      .catch(() => undefined),
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0f1016]/95 px-6 py-4 backdrop-blur">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <User className="h-5 w-5 text-rose-400" />
            Seller listings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
            </div>
          ) : !history ? (
            <p className="py-12 text-center text-sm text-zinc-500">Could not load this seller.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-base font-bold text-amber-200 ring-1 ring-white/10">
                  {initials(history.account.name) || '?'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {history.account.name}{' '}
                    <span className="font-normal text-zinc-500">@{history.account.handle}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Account status:{' '}
                    <span className="capitalize text-zinc-300">{history.account.status}</span>
                    {' · '}Merit {history.account.merit ?? 100}
                  </p>
                  <StaffPunishmentChips penalties={history.account.meritPenalties} className="mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { label: 'Total', value: history.counts.total },
                  { label: 'Pending', value: history.counts.pending },
                  { label: 'Approved', value: history.counts.approved },
                  { label: 'Rejected', value: history.counts.rejected },
                  { label: 'Delisted', value: history.counts.delisted },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center"
                  >
                    <p className="text-base font-bold text-white">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">{s.label}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-2 flex items-center justify-between text-sm font-semibold text-white">
                  Listings
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                    {history.listings.length}
                  </span>
                </p>
                {history.listings.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-zinc-600">
                    No listings from this seller.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.listings.map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          {onOpenListing ? (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenListing(l.id);
                              }}
                              className="truncate text-left font-medium text-zinc-200 hover:text-rose-300 hover:underline"
                            >
                              {l.title}
                            </button>
                          ) : (
                            <p className="truncate text-zinc-200">{l.title}</p>
                          )}
                          <p className="text-[11px] text-zinc-500">
                            {l.number} · {l.category || 'Uncategorized'} ·{' '}
                            {l.priceCredits.toLocaleString()} credits · {formatDate(l.createdAt)}
                          </p>
                        </div>
                        {listingStatusPill(l.status)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
  aside,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {hint && <p className="mt-0.5 text-[11px] text-zinc-500">{hint}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      {children}
    </div>
  );
}

function processingPill(status: string) {
  const cls =
    status === 'failed'
      ? 'border-red-500/25 bg-red-500/10 text-red-300'
      : status === 'processing'
        ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
        : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300';
  const label = status === 'ready' ? 'Preview ready' : status === 'processing' ? 'Processing' : 'Failed';
  return (
    <span className={`inline-flex rounded-full border px-1.5 py-px text-[9px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function historyTone(event: ListingReviewEvent) {
  if (event.eventCode === 'LISTING_FILE_DOWNLOADED' || event.eventCode === 'LISTING_FILE_VIEWED') {
    return 'bg-zinc-500';
  }
  if (event.status === 'approved') return 'bg-emerald-400';
  if (event.status === 'scheduled') return 'bg-sky-400';
  if (event.status === 'rejected') return 'bg-red-400';
  if (event.status === 'delisted') return 'bg-zinc-300';
  return 'bg-amber-400';
}

/** Heading for a thread entry; plain replies have none. */
function threadEntryLabel(message: ListingThreadMessage) {
  switch (message.kind) {
    case 'submitted':
      return 'Submitted for review';
    case 'resubmitted':
      return 'Resubmitted for review';
    case 'approved':
      return 'Approved — published now';
    case 'scheduled':
      return `Approved — goes live ${formatGoLive(message.publishAt)}`;
    case 'published':
      return 'Went live (scheduled)';
    case 'rejected':
      return 'Rejected';
    case 'rejected_final':
      return 'Rejected permanently';
    case 'delisted':
      return 'Delisted';
    case 'rereview':
      return 'Sent back for re-approval';
    default:
      return null;
  }
}

function threadEntryTone(message: ListingThreadMessage) {
  if (message.kind === 'rejected') return 'text-red-300';
  if (message.kind === 'rejected_final') return 'text-rose-300';
  if (message.kind === 'delisted' || message.kind === 'rereview') return 'text-amber-300';
  if (message.kind === 'approved' || message.kind === 'published') return 'text-emerald-300';
  if (message.kind === 'scheduled') return 'text-sky-300';
  return 'text-zinc-400';
}

/** The listing's conversation with the seller, as staff see it (staff names shown). */
function ListingThread({ messages }: { messages: ListingThreadMessage[] }) {
  const listRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-xs text-zinc-500">
        No messages yet. Decisions and replies appear here, and the seller sees them on their asset page.
      </p>
    );
  }
  return (
    <ol
      ref={listRef}
      className="max-h-[26rem] space-y-2.5 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-3"
    >
      {messages.map((message) => {
        const label = threadEntryLabel(message);
        if (message.authorType === 'system') {
          return (
            <li key={message.id} className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> {label} · {formatDateTime(message.createdAt)}
              </span>
            </li>
          );
        }
        const fromStaff = message.authorType === 'staff';
        return (
          <li key={message.id} className={`flex ${fromStaff ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl border px-3.5 py-2.5 ${
                fromStaff ? 'border-amber-500/20 bg-amber-500/[0.06]' : 'border-white/10 bg-[#14151c]'
              }`}
            >
              <p className="text-[10px] text-zinc-500">
                <span className="font-semibold text-zinc-300">{message.authorName}</span>
                {fromStaff ? (message.authorRole ? ` · ${message.authorRole}` : ' · Staff') : ' · Seller'}
                {' · '}
                {formatDateTime(message.createdAt)}
              </p>
              {label && <p className={`mt-0.5 text-xs font-semibold ${threadEntryTone(message)}`}>{label}</p>}
              {message.body ? (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">{message.body}</p>
              ) : (
                message.kind === 'resubmitted' && (
                  <p className="mt-1 text-[11px] italic text-zinc-500">Saved changes without a message.</p>
                )
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Statuses where staff can post a plain reply (decisions use the footer actions). */
const STAFF_REPLY_STATUSES = new Set(['pending', 'scheduled', 'rejected', 'delisted']);

export default function ListingDetailModal({
  listingId,
  seed,
  onClose,
  onUpdated,
  onViewSeller,
  onOpenListing,
  apiBase = '/api/moderator/marketplace',
}: {
  /** UUID of the marketplace listing. */
  listingId: string;
  seed?: MarketplaceListing | null;
  onClose: () => void;
  onUpdated: (listing?: MarketplaceListing) => void;
  onViewSeller?: (accountId: number) => void;
  /** Lets a duplicate-file match open its own listing in place. */
  onOpenListing?: (listingId: string) => void;
  apiBase?: string;
}) {
  const [detail, setDetail] = useState<MarketplaceListing | null>(seed || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<ListingAction | null>(null);
  const [target, setTarget] = useState<InspectorTarget | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [replying, setReplying] = useState(false);

  /** Plain staff reply on the seller conversation; the listing state does not change. */
  const sendReply = async () => {
    const body = replyDraft.trim();
    if (!body || replying) return;
    setReplying(true);
    try {
      const res = await api.post(`${apiBase}/listings/${listingId}/messages`, { body });
      const messages = res.data?.data?.messages as ListingThreadMessage[] | undefined;
      if (messages) {
        setDetail((current) =>
          current && String(current.id) === String(listingId) ? { ...current, thread: messages } : current
        );
      }
      setReplyDraft('');
      showSuccessToast('Reply sent to the seller');
    } catch (err) {
      showErrorToast(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send the reply'
      );
    } finally {
      setReplying(false);
    }
  };

  useEffect(() => {
    let active = true;
    setTarget(null);
    setReplyDraft('');
    // Switching listings (for example from a duplicate match) must not show the old one meanwhile.
    setDetail((current) =>
      current && String(current.id) === String(listingId)
        ? current
        : seed && String(seed.id) === String(listingId)
          ? seed
          : null
    );
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`${apiBase}/listings/${listingId}`);
        if (active && res.data?.success) setDetail(res.data.data);
      } catch {
        if (active) showErrorToast('Failed to load listing detail');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // `seed` only fills the first paint; refetching on every parent render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, apiBase]);

  // Live: file processing, new reports, buyer activity and other reviewers' decisions update
  // the open listing; the file being inspected and any typed reason stay.
  useStaffLive(
    ['marketplace', 'reports', 'accounts', 'moderation'],
    () =>
      api
        .get(`${apiBase}/listings/${listingId}`)
        .then((res) => {
          if (!res.data?.success) return;
          setDetail((current) => (!current || String(current.id) === String(listingId) ? res.data.data : current));
        })
        .catch(() => undefined),
    { enabled: !saving, delayMs: 1000 },
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pendingAction) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, pendingAction]);

  const asset = detail?.asset || null;
  const files = asset?.mediaFiles || [];
  const showcase = (asset?.thumbnails || []).filter((thumb) => !thumb.isContent);

  // Open the first content file once the detail arrives, so the reviewer starts on the work.
  useEffect(() => {
    if (target || !asset) return;
    if (files[0]) setTarget({ kind: 'file', file: files[0] });
    else if (showcase[0]) setTarget({ kind: 'showcase', thumb: showcase[0], index: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  /** Every action opens the decision dialog first; approve asks when the asset goes live. */
  const review = async (action: ListingAction, input?: ListingDecisionInput) => {
    if (!input) {
      setPendingAction(action);
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`${apiBase}/listings/${listingId}`, listingDecisionPayload(action, input));
      showSuccessToast(decisionSuccessMessage(action, input, res.data?.data?.publishAt, detail?.status));
      setPendingAction(null);
      if (res.data?.success && res.data.data) {
        setDetail(res.data.data);
        onUpdated(res.data.data);
      } else {
        onUpdated();
      }
      onClose();
    } catch (err) {
      showErrorToast(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update listing'
      );
    } finally {
      setSaving(false);
    }
  };

  const listing = detail;
  const processingCount = files.filter((f) => f.processingStatus === 'processing').length;
  const failedCount = files.filter((f) => f.processingStatus === 'failed').length;
  const duplicates = listing?.duplicates || [];
  const fileDuplicates = duplicates.filter((d) => d.matchedOn === 'file');
  const crossSellerFileMatches = fileDuplicates.filter((d) => !d.sameSeller).length;
  const reports = listing?.reports;
  const seller = listing?.seller;
  // Same cover the queue row shows, so the header matches the row that was clicked.
  const cover = listing?.thumbnailUrl || asset?.thumbnails?.[0]?.path || null;
  const isTemplate = asset?.type === 'template';
  const selectedId =
    target?.kind === 'file' ? target.file.mediaAssetId : target?.kind === 'showcase' ? target.thumb.mediaAssetId : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <ListingThumb
              path={cover}
              mimeType={cover === listing?.thumbnailUrl ? listing?.thumbnailMime : null}
              assetType={asset?.type || listing?.assetType}
              title={listing?.title}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-zinc-500">{listing?.number || '…'}</span>
                {listing && listingStatusPill(listing.status, listing.permanentlyRejected)}
                {asset?.type && (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] capitalize text-zinc-400">
                    {asset.type}
                  </span>
                )}
                {loading && listing && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />}
              </div>
              <h2 className="mt-1 truncate pr-4 text-lg font-bold text-white">
                {listing?.title || 'Loading…'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && !listing ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : !listing ? (
            <p className="py-16 text-center text-sm text-zinc-500">Could not load this listing.</p>
          ) : (
            <div className="grid gap-6 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 space-y-6">
                {listing.status === 'scheduled' && (
                  <p className="flex items-start gap-2 rounded-lg border border-sky-500/25 bg-sky-500/[0.07] px-3 py-2 text-xs text-sky-100">
                    <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Approved — goes live {formatGoLive(listing.publishAt)}. It stays out of the catalog
                    until then. Publish it early, move the time, or reject it from the actions below.
                  </p>
                )}
                {(crossSellerFileMatches > 0 || (reports?.open || 0) > 0 || failedCount > 0) && (
                  <div className="space-y-2">
                    {crossSellerFileMatches > 0 && (
                      <p className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.07] px-3 py-2 text-xs text-red-100">
                        <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {crossSellerFileMatches} other seller listing
                        {crossSellerFileMatches === 1 ? '' : 's'} contain a file with the exact same size
                        and type. Compare them before approving — see Copyright signals.
                      </p>
                    )}
                    {(reports?.open || 0) > 0 && (
                      <p className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.07] px-3 py-2 text-xs text-red-100">
                        <Flag className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {reports?.open} open report{reports?.open === 1 ? '' : 's'} filed against this
                        listing or its asset.
                      </p>
                    )}
                    {failedCount > 0 && (
                      <p className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-100">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {failedCount} file{failedCount === 1 ? '' : 's'} failed preview processing. Buyers
                        would see no preview — inspect the original and consider rejecting.
                      </p>
                    )}
                  </div>
                )}

                <Section
                  title="Submitted content"
                  hint={
                    isTemplate
                      ? 'Templates are reviewed through their showcase images and metadata.'
                      : processingCount > 0
                        ? `${processingCount} file${processingCount === 1 ? ' is' : 's are'} still generating a watermarked preview — use Original upload to review now.`
                        : 'Switch between the watermarked preview buyers see and the original upload.'
                  }
                >
                  {!asset ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-500">
                      {loading
                        ? 'Loading the submitted files…'
                        : 'This listing is not linked to a market asset, so there are no files to inspect.'}
                    </p>
                  ) : (
                    <>
                      {target ? (
                        <ListingFileInspector listingId={listing.id} apiBase={apiBase} target={target} />
                      ) : (
                        <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-xs text-zinc-500">
                          No content files or showcase images are attached to this asset.
                        </p>
                      )}

                      {files.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-white/10">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-500">
                                <th className="px-3 py-2 font-medium">File ({files.length})</th>
                                <th className="px-3 py-2 font-medium">Format</th>
                                <th className="px-3 py-2 font-medium">Size</th>
                                <th className="px-3 py-2 font-medium">Specs</th>
                                <th className="px-3 py-2 font-medium">Preview</th>
                              </tr>
                            </thead>
                            <tbody>
                              {files.map((file) => {
                                const thumb = file.thumbnailPath || (file.processingStatus === 'ready' ? file.proxyPath : null);
                                const active = selectedId === file.mediaAssetId;
                                const specs = [
                                  file.width && file.height ? `${file.width}×${file.height}` : null,
                                  formatDuration(file.durationSeconds),
                                ].filter(Boolean);
                                return (
                                  <tr
                                    key={file.mediaAssetId}
                                    tabIndex={0}
                                    onClick={() => setTarget({ kind: 'file', file })}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setTarget({ kind: 'file', file });
                                      }
                                    }}
                                    className={`cursor-pointer border-b border-white/[0.04] transition last:border-0 focus:outline-none ${
                                      active ? 'bg-amber-500/[0.07]' : 'hover:bg-white/[0.03] focus:bg-white/[0.04]'
                                    }`}
                                  >
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2.5">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/[0.04] text-zinc-400 ring-1 ring-white/10">
                                          {thumb && file.type !== 'audio' ? (
                                            <img src={cloudUrl(thumb)} alt="" className="h-full w-full object-cover" />
                                          ) : (
                                            <FileTypeIcon type={file.type} />
                                          )}
                                        </span>
                                        <span className="min-w-0">
                                          <span className="block max-w-[220px] truncate font-medium text-zinc-200" title={file.originalName || file.name}>
                                            {file.originalName || file.name}
                                          </span>
                                          <span className="block text-[10px] text-zinc-600">
                                            #{file.position + 1}
                                            {file.uploadedAt ? ` · uploaded ${relativeTime(file.uploadedAt)}` : ''}
                                          </span>
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className="flex items-center gap-1 capitalize text-zinc-300">
                                        <FileTypeIcon type={file.type} />
                                        {file.type}
                                      </span>
                                      <span className="block font-mono text-[10px] text-zinc-600">{file.mimeType || '—'}</span>
                                    </td>
                                    <td className="px-3 py-2 tabular-nums text-zinc-300">{readableSize(file.sizeBytes)}</td>
                                    <td className="px-3 py-2 text-zinc-400">{specs.length ? specs.join(' · ') : '—'}</td>
                                    <td className="px-3 py-2">
                                      {processingPill(file.processingStatus)}
                                      {file.processingStatus === 'failed' && file.processingAttempts ? (
                                        <span className="block text-[10px] text-zinc-600">
                                          {file.processingAttempts} attempt{file.processingAttempts === 1 ? '' : 's'}
                                        </span>
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {showcase.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[11px] font-medium text-zinc-400">
                            Showcase images ({showcase.length}) — what the store card and gallery show
                          </p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {showcase.map((thumb, index) => (
                              <button
                                key={thumb.mediaAssetId}
                                type="button"
                                onClick={() => setTarget({ kind: 'showcase', thumb, index })}
                                className={`h-16 w-16 shrink-0 overflow-hidden rounded-md ring-2 transition ${
                                  selectedId === thumb.mediaAssetId ? 'ring-amber-400' : 'ring-white/10 hover:ring-white/30'
                                }`}
                                title={`Showcase image ${index + 1}`}
                              >
                                <img src={cloudUrl(thumb.path)} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {asset.template && (
                        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-zinc-400">
                          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-white">
                            <LayoutTemplate className="h-4 w-4 text-amber-300" />
                            Editor template
                          </p>
                          <DetailRow label="Timeline snapshot" value={readableSize(asset.template.snapshotBytes)} />
                          <DetailRow label="Saved" value={formatDateTime(asset.template.createdAt)} />
                          <DetailRow
                            label="Source project"
                            value={
                              asset.template.sourceProjectId ? (
                                <span className="font-mono text-[10px]">{asset.template.sourceProjectId}</span>
                              ) : (
                                '—'
                              )
                            }
                          />
                          <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                            The editor only previews published templates, so judge a pending template
                            from its showcase images and description. If the showcase hides what the
                            template contains, reject it with a request for clearer showcase images.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </Section>

                <Section title="Listing copy" hint="Exactly what buyers read on the store page.">
                  <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-zinc-300">
                    {listing.description || 'No description.'}
                  </p>
                  {asset?.tags && asset.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {asset.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-300"
                        >
                          <Tag className="h-3 w-3 text-zinc-500" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Listings from before the conversation existed only have the stored reason. */}
                {(listing.thread || []).length === 0 && (listing.rejectionReason || listing.moderationNote) && (
                  <div className="space-y-2">
                    {listing.rejectionReason && (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                        Rejection reason: {listing.rejectionReason}
                      </div>
                    )}
                    {listing.moderationNote && (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                        Moderation note: {listing.moderationNote}
                      </div>
                    )}
                  </div>
                )}

                <Section
                  title="Conversation with the seller"
                  hint="Every decision, resubmission and reply. The seller reads this on their asset page; staff names show to them as the review team."
                >
                  <ListingThread messages={listing.thread || []} />
                  {STAFF_REPLY_STATUSES.has(listing.status) ? (
                    <div className="space-y-2">
                      <textarea
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder="Ask the seller a question or explain a decision. To approve or reject, use the actions below."
                        className="w-full resize-y rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-zinc-600">
                          {listing.status === 'rejected' || listing.status === 'delisted'
                            ? 'The seller answers by resubmitting with a message.'
                            : 'The seller is notified and can reply here.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => void sendReply()}
                          disabled={replying || !replyDraft.trim()}
                          className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          {replying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          Send reply
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-600">
                      {listing.status === 'approved'
                        ? 'Replies close while the listing is live. Delist it or require re-approval to reopen the conversation.'
                        : 'Replies open once the listing is submitted for review.'}
                    </p>
                  )}
                </Section>
              </div>

              <aside className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat icon={Coins} label="Price" value={`${listing.priceCredits.toLocaleString()} cr`} />
                  <MiniStat icon={Tag} label="Category" value={listing.category || 'Uncategorized'} />
                  <MiniStat icon={Clock} label="Submitted" value={relativeTime(listing.createdAt)} />
                  <MiniStat icon={ShoppingBag} label="Sold" value={asset?.stats?.activeLicenses ?? 0} />
                </div>

                <SideCard title="Seller">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-sm font-bold text-amber-200 ring-1 ring-white/10">
                      {initials(listing.submittedBy.name) || '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{listing.submittedBy.name}</p>
                      <p className="truncate text-xs text-zinc-500">@{listing.submittedBy.handle}</p>
                    </div>
                  </div>
                  {seller && (
                    <div className="mt-3">
                      <DetailRow label="Account status" value={<span className="capitalize">{seller.status}</span>} />
                      <DetailRow
                        label="Platform Merit"
                        value={
                          <span className="inline-flex flex-col items-end gap-1">
                            {seller.merit}
                            <StaffPunishmentChips penalties={seller.meritPenalties} showNone />
                          </span>
                        }
                      />
                      <DetailRow label="Joined" value={formatDate(seller.joinedAt)} />
                      <DetailRow
                        label="Listings"
                        value={`${seller.listings.total} total · ${seller.listings.approved} live`}
                      />
                      <DetailRow
                        label="Removed before"
                        value={
                          <span className={seller.listings.rejected + seller.listings.delisted > 0 ? 'text-amber-200' : ''}>
                            {seller.listings.rejected} rejected · {seller.listings.delisted} delisted
                          </span>
                        }
                      />
                    </div>
                  )}
                  {onViewSeller && (
                    <button
                      type="button"
                      onClick={() => onViewSeller(listing.submittedBy.accountId)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-200"
                    >
                      <History className="h-3.5 w-3.5" />
                      Seller listing history
                    </button>
                  )}
                </SideCard>

                <SideCard title="Copyright signals">
                  {loading && !listing.duplicates ? (
                    <p className="text-xs text-zinc-500">Checking other listings…</p>
                  ) : duplicates.length === 0 ? (
                    <p className="flex items-start gap-1.5 text-xs text-zinc-400">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      No other asset shares a file size and type, or this title.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {duplicates.map((dup) => {
                        const clickable = Boolean(onOpenListing && dup.listingId);
                        const body = (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-medium text-zinc-100">{dup.name}</span>
                              <span
                                className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium ${
                                  dup.matchedOn === 'file'
                                    ? 'border-red-500/30 bg-red-500/10 text-red-200'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                                }`}
                              >
                                {dup.matchedOn === 'file' ? 'Same file size' : 'Same title'}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-zinc-500">
                              {dup.seller ? `@${dup.seller.handle}` : 'Unknown seller'}
                              {dup.sameSeller ? ' (same seller)' : ''}
                              {dup.listingNumber ? ` · ${dup.listingNumber}` : ''}
                              {dup.listingStatus ? ` · ${dup.listingStatus}` : ''}
                            </p>
                            <p className="text-[10px] text-zinc-600">Listed {formatDate(dup.createdAt)}</p>
                          </>
                        );
                        return (
                          <li key={`${dup.marketAssetId}-${dup.matchedOn}`}>
                            {clickable ? (
                              <button
                                type="button"
                                onClick={() => onOpenListing?.(String(dup.listingId))}
                                className="block w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-left transition hover:border-amber-500/30"
                              >
                                {body}
                              </button>
                            ) : (
                              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">{body}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
                    Matches compare exact file size and type, or the same title. They are leads, not
                    proof — compare the originals.
                  </p>
                </SideCard>

                <SideCard title={`Reports${reports ? ` · ${reports.open} open of ${reports.total}` : ''}`}>
                  {!reports || reports.items.length === 0 ? (
                    <p className="text-xs text-zinc-500">No reports filed against this listing or asset.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {reports.items.map((report) => (
                        <li key={report.id} className="flex items-start justify-between gap-2 text-xs">
                          <span className="min-w-0">
                            <span className="block font-mono text-[10px] text-zinc-500">{report.number}</span>
                            <span className="block truncate text-zinc-200">{report.type}</span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] capitalize ${
                              report.isOpen
                                ? 'border-red-500/30 bg-red-500/10 text-red-200'
                                : 'border-white/10 text-zinc-400'
                            }`}
                          >
                            {String(report.status).replace(/_/g, ' ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </SideCard>

                {asset?.stats && (
                  <SideCard title="Buyer activity">
                    <DetailRow label="Active licenses" value={asset.stats.activeLicenses} />
                    <DetailRow label="Refunded" value={asset.stats.refundedLicenses} />
                    <DetailRow label="Likes" value={asset.stats.likes} />
                    <DetailRow
                      label="Reviews"
                      value={
                        asset.stats.reviews
                          ? `${asset.stats.reviews} · ${asset.stats.averageRating ?? '—'}★`
                          : 'None'
                      }
                    />
                  </SideCard>
                )}

                <SideCard title="Record">
                  <DetailRow label="Listing" value={<span className="font-mono">{listing.number}</span>} />
                  <DetailRow label="Created" value={formatDateTime(listing.createdAt)} />
                  <DetailRow label="Updated" value={relativeTime(listing.updatedAt)} />
                  <DetailRow label="Reviewed by" value={listing.reviewedBy?.name || '—'} />
                  <DetailRow label="Reviewed at" value={formatDateTime(listing.reviewedAt)} />
                  {(listing.status === 'scheduled' || listing.status === 'approved') && listing.publishAt && (
                    <DetailRow
                      label={listing.status === 'scheduled' ? 'Goes live' : 'Went live'}
                      value={formatDateTime(listing.publishAt)}
                    />
                  )}
                  {listing.marketAssetId && (
                    <DetailRow
                      label="Asset id"
                      value={<span className="font-mono text-[10px]">{listing.marketAssetId}</span>}
                    />
                  )}
                </SideCard>

                <SideCard title="Review history">
                  {!listing.reviewHistory || listing.reviewHistory.length === 0 ? (
                    <p className="text-xs text-zinc-500">No staff actions recorded yet.</p>
                  ) : (
                    <ol className="space-y-2.5">
                      {listing.reviewHistory.map((event) => (
                        <li key={event.id} className="flex gap-2.5">
                          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${historyTone(event)}`} />
                          <div className="min-w-0 text-xs">
                            <p className="text-zinc-200">{event.action}</p>
                            {event.reason && (
                              <p className="mt-0.5 text-[11px] text-zinc-400">“{event.reason}”</p>
                            )}
                            <p className="mt-0.5 text-[10px] text-zinc-600">
                              {event.actorName || 'System'}
                              {event.actorRole ? ` · ${event.actorRole}` : ''} · {formatDateTime(event.createdAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </SideCard>
              </aside>
            </div>
          )}
        </div>

        {listing && (
          <div className="border-t border-white/[0.06] bg-[#0f1016] px-6 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Moderate
              </span>
              {actionsForStatus(listing.status, listing.permanentlyRejected).map((action) => {
                const meta = LISTING_ACTIONS[action];
                const Icon = meta.icon;
                return (
                  <button
                    key={action}
                    type="button"
                    disabled={saving}
                    onClick={() => void review(action)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-medium transition disabled:opacity-50 ${meta.wideTone}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {actionLabel(action, listing.status)}
                  </button>
                );
              })}
              {saving && <Loader2 className="ml-1 h-4 w-4 animate-spin text-zinc-500" />}
            </div>
          </div>
        )}
      </div>
      {listing && pendingAction && (
        <ListingReasonDialog
          action={pendingAction}
          listingTitle={`${listing.number} · ${listing.title}`}
          currentStatus={listing.status}
          currentPublishAt={listing.status === 'scheduled' ? listing.publishAt : null}
          saving={saving}
          onCancel={() => setPendingAction(null)}
          onConfirm={(input) => void review(pendingAction, input)}
        />
      )}
    </div>
  );
}
