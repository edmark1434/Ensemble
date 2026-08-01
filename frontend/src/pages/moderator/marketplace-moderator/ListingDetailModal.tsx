import { useEffect, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Coins,
  History,
  Loader2,
  Package,
  Tag,
  User,
  X,
  XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type { MarketplaceListing, SellerListingsHistory } from './marketplaceTypes';

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

export function listingStatusPill(status: string) {
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
}: {
  accountId: number | string;
  onClose: () => void;
  onOpenListing?: (listingId: number) => void;
}) {
  const [history, setHistory] = useState<SellerListingsHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get(`/api/moderator/marketplace/users/${accountId}/listings`);
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
  }, [accountId]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
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
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-amber-500/20 text-base font-bold text-rose-200 ring-1 ring-white/10">
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
                  </p>
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

export default function ListingDetailModal({
  listingId,
  seed,
  onClose,
  onUpdated,
  onViewSeller,
}: {
  listingId: number;
  seed?: MarketplaceListing | null;
  onClose: () => void;
  onUpdated: (listing?: MarketplaceListing) => void;
  onViewSeller: (accountId: number) => void;
}) {
  const [detail, setDetail] = useState<MarketplaceListing | null>(seed || null);
  const [loading, setLoading] = useState(!seed);
  const [saving, setSaving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/api/moderator/marketplace/listings/${listingId}`);
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
  }, [listingId]);

  const review = async (status: 'approved' | 'rejected' | 'delisted', reason?: string) => {
    setSaving(true);
    try {
      const res = await api.patch(`/api/moderator/marketplace/listings/${listingId}`, {
        status,
        rejectionReason: reason,
      });
      const labels = {
        approved: 'Listing approved',
        rejected: 'Listing rejected',
        delisted: 'Listing delisted',
      } as const;
      showSuccessToast(labels[status]);
      if (res.data?.success && res.data.data) {
        setDetail(res.data.data);
        onUpdated(res.data.data);
      } else {
        onUpdated();
      }
      onClose();
    } catch {
      showErrorToast('Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const listing = detail;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-gradient-to-r from-rose-500/[0.12] via-transparent to-transparent bg-[#0f1016]/95 px-6 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                  <Package className="h-3 w-3" /> Listing
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {listing?.number || '…'}
                </span>
                {listing && listingStatusPill(listing.status)}
              </div>
              <h2 className="mt-1.5 truncate pr-4 text-lg font-bold text-white">
                {listing?.title || 'Loading…'}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && !listing ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-rose-400" />
            </div>
          ) : !listing ? (
            <p className="py-12 text-center text-sm text-zinc-500">Could not load this listing.</p>
          ) : (
            <div className="space-y-6">
              {listing.thumbnailUrl && (
                <img
                  src={listing.thumbnailUrl}
                  alt={listing.title}
                  className="h-44 w-full rounded-xl object-cover ring-1 ring-white/10"
                />
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <MiniStat
                  icon={Coins}
                  label="Price"
                  value={`${listing.priceCredits.toLocaleString()} cr`}
                />
                <MiniStat icon={Tag} label="Category" value={listing.category || 'Uncategorized'} />
                <MiniStat icon={Clock} label="Submitted" value={relativeTime(listing.createdAt)} />
                <MiniStat icon={Package} label="Status" value={listingStatusPill(listing.status)} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-amber-500/20 text-sm font-bold text-rose-200 ring-1 ring-white/10">
                    {initials(listing.submittedBy.name) || '?'}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {listing.submittedBy.name}{' '}
                      <span className="font-normal text-zinc-500">@{listing.submittedBy.handle}</span>
                    </p>
                    <p className="text-xs text-zinc-500">Seller / submitter</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onViewSeller(listing.submittedBy.accountId)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <History className="h-3.5 w-3.5" />
                  Seller listings
                </button>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-white">Description</p>
                <p className="whitespace-pre-wrap rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-zinc-300">
                  {listing.description || 'No description.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <p className="mb-2 text-sm font-semibold text-white">Listing details</p>
                  <DetailRow label="Listing ID" value={<span className="font-mono">{listing.number}</span>} />
                  <DetailRow label="Category" value={listing.category || 'Uncategorized'} />
                  <DetailRow
                    label="Price"
                    value={`${listing.priceCredits.toLocaleString()} credits`}
                  />
                  <DetailRow label="Internal id" value={listing.id} />
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <p className="mb-2 text-sm font-semibold text-white">Review activity</p>
                  <DetailRow label="Created" value={formatDateTime(listing.createdAt)} />
                  <DetailRow label="Updated" value={relativeTime(listing.updatedAt)} />
                  <DetailRow
                    label="Reviewed by"
                    value={listing.reviewedBy?.name || '—'}
                  />
                  <DetailRow label="Reviewed at" value={formatDateTime(listing.reviewedAt)} />
                </div>
              </div>

              {listing.rejectionReason && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-200">
                  Rejection reason: {listing.rejectionReason}
                </div>
              )}
            </div>
          )}
        </div>

        {listing && (
          <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0f1016]/95 px-6 py-3.5 backdrop-blur">
            {showRejectForm ? (
              <div className="space-y-3">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for rejection…"
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-sm text-white outline-none focus:border-rose-500/40"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="rounded-lg px-4 py-2 text-sm text-zinc-400 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || !rejectionReason.trim()}
                    onClick={() => void review('rejected', rejectionReason.trim())}
                    className="rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Moderate
                </span>
                {listing.status !== 'approved' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void review('approved')}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                {listing.status !== 'rejected' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowRejectForm(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                )}
                {listing.status === 'approved' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void review('delisted')}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-500/30 bg-zinc-500/10 px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-500/20 disabled:opacity-50"
                  >
                    <Archive className="h-3.5 w-3.5" /> Delist
                  </button>
                )}
                {saving && <Loader2 className="ml-1 h-4 w-4 animate-spin text-zinc-500" />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
