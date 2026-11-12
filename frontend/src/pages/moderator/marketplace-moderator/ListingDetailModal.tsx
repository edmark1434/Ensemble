import { useEffect, useState } from 'react';
import {
  AudioLines,
  Clock,
  Coins,
  Eye,
  History,
  Image as ImageIcon,
  Loader2,
  Package,
  Tag,
  User,
  Video,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import { mediaUrl } from '@/pages/user/5_assets/assetTypes';
import {
  LISTING_ACTIONS,
  ListingReasonDialog,
  actionsForStatus,
  type ListingAction,
} from './listingActions';
import type {
  ListingAssetMediaFile,
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
  apiBase = '/api/moderator/marketplace',
}: {
  accountId: number | string;
  onClose: () => void;
  onOpenListing?: (listingId: number) => void;
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
                    {' · '}Merit {history.account.merit ?? 100}
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

function MediaTypeIcon({ type }: { type: string }) {
  if (type === 'video') return <Video className="h-3.5 w-3.5" />;
  if (type === 'audio') return <AudioLines className="h-3.5 w-3.5" />;
  return <ImageIcon className="h-3.5 w-3.5" />;
}

function ListingAssetPreviewOverlay({
  media,
  onClose,
}: {
  media: ListingAssetMediaFile;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const previewUrl =
    media.processingStatus === 'ready' ? cloudUrl(media.proxyPath || media.thumbnailPath) : '';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1016] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white">{media.name}</h2>
            <p className="mt-1 text-xs capitalize text-zinc-400">
              {media.type} preview
              {media.processingStatus !== 'ready' ? ` · ${media.processingStatus}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-lg p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-72 flex-1 items-center justify-center overflow-auto bg-black/30 p-4 md:p-6">
          {!previewUrl || failed ? (
            <p className="text-sm text-zinc-400">
              {media.processingStatus === 'processing'
                ? 'Preview is still processing.'
                : media.processingStatus === 'failed'
                  ? 'Preview processing failed.'
                  : 'Watermarked preview is unavailable.'}
            </p>
          ) : media.type === 'image' ? (
            <img
              src={previewUrl}
              alt={`Preview of ${media.name}`}
              onError={() => setFailed(true)}
              draggable={false}
              onContextMenu={(event) => event.preventDefault()}
              className="max-h-[75vh] max-w-full object-contain"
            />
          ) : media.type === 'video' ? (
            <video
              src={previewUrl}
              controls
              controlsList="nodownload"
              autoPlay
              playsInline
              onError={() => setFailed(true)}
              onContextMenu={(event) => event.preventDefault()}
              className="max-h-[75vh] max-w-full bg-black"
            />
          ) : (
            <div className="flex w-full max-w-xl flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-rose-300">
              <AudioLines className="h-16 w-16" />
              <audio
                src={previewUrl}
                controls
                controlsList="nodownload"
                autoPlay
                onError={() => setFailed(true)}
                onContextMenu={(event) => event.preventDefault()}
                className="w-full"
              />
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
  apiBase = '/api/moderator/marketplace',
}: {
  listingId: number;
  seed?: MarketplaceListing | null;
  onClose: () => void;
  onUpdated: (listing?: MarketplaceListing) => void;
  onViewSeller?: (accountId: number) => void;
  apiBase?: string;
}) {
  const [detail, setDetail] = useState<MarketplaceListing | null>(seed || null);
  const [loading, setLoading] = useState(!seed);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<ListingAction | null>(null);
  const [previewMedia, setPreviewMedia] = useState<ListingAssetMediaFile | null>(null);

  useEffect(() => {
    let active = true;
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
  }, [listingId, apiBase]);

  const review = async (action: ListingAction, reason?: string) => {
    const meta = LISTING_ACTIONS[action];
    if (meta.requiresReason && !reason) {
      setPendingAction(action);
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch(`${apiBase}/listings/${listingId}`, {
        status: meta.status,
        rejectionReason: action === 'reject' ? reason : undefined,
        moderationNote: action === 'reject' ? undefined : reason,
        reason,
      });
      showSuccessToast(meta.successMessage);
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
                <button
                  type="button"
                  className="group relative block w-full overflow-hidden rounded-xl ring-1 ring-white/10"
                  onClick={() => {
                    const first = listing.asset?.mediaFiles?.[0];
                    if (first) setPreviewMedia(first);
                  }}
                  disabled={!listing.asset?.mediaFiles?.length}
                >
                  <img
                    src={cloudUrl(listing.thumbnailUrl)}
                    alt={listing.title}
                    className="h-44 w-full object-cover"
                  />
                  {listing.asset?.mediaFiles?.length ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-medium backdrop-blur">
                        <Eye className="h-3.5 w-3.5" /> View asset
                      </span>
                    </span>
                  ) : null}
                </button>
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
                {onViewSeller && (
                  <button
                    type="button"
                    onClick={() => onViewSeller(listing.submittedBy.accountId)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <History className="h-3.5 w-3.5" />
                    Seller listings
                  </button>
                )}
              </div>

              {listing.asset && (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">Linked marketplace asset</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {listing.asset.name}
                        {listing.asset.type ? ` · ${listing.asset.type}` : ''}
                        {' · '}
                        <span className="capitalize">{listing.asset.status}</span>
                      </p>
                    </div>
                    {listing.asset.mediaFiles[0] && (
                      <button
                        type="button"
                        onClick={() => setPreviewMedia(listing.asset!.mediaFiles[0])}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-500/20"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview media
                      </button>
                    )}
                  </div>

                  {listing.asset.mediaFiles.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-xs text-zinc-600">
                      No media files attached to this asset.
                    </p>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {listing.asset.mediaFiles.map((file) => {
                        const thumb = cloudUrl(file.thumbnailPath || file.proxyPath);
                        return (
                          <li key={file.mediaAssetId}>
                            <button
                              type="button"
                              onClick={() => setPreviewMedia(file)}
                              className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-[#14151c] px-3 py-2 text-left transition hover:border-rose-500/30 hover:bg-rose-500/[0.06]"
                            >
                              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white/[0.04] text-zinc-400 ring-1 ring-white/10">
                                {thumb && file.type !== 'audio' ? (
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <MediaTypeIcon type={file.type} />
                                )}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-medium text-zinc-200">
                                  {file.name}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1.5 text-[10px] capitalize text-zinc-500">
                                  <MediaTypeIcon type={file.type} />
                                  {file.type}
                                  {' · '}
                                  {file.processingStatus}
                                </span>
                              </span>
                              <Eye className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {listing.asset.thumbnails.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {listing.asset.thumbnails.map((thumb) => (
                        <img
                          key={thumb.mediaAssetId}
                          src={cloudUrl(thumb.path)}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-md object-cover ring-1 ring-white/10"
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

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
                  {listing.marketAssetId && (
                    <DetailRow
                      label="Asset id"
                      value={<span className="font-mono text-[10px]">{listing.marketAssetId}</span>}
                    />
                  )}
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
              {listing.moderationNote && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                  Moderation note: {listing.moderationNote}
                </div>
              )}
            </div>
          )}
        </div>

        {listing && (
          <div className="sticky bottom-0 border-t border-white/[0.06] bg-[#0f1016]/95 px-6 py-3.5 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Moderate
              </span>
              {actionsForStatus(listing.status).map((action) => {
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
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
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
          saving={saving}
          onCancel={() => setPendingAction(null)}
          onConfirm={(reason) => void review(pendingAction, reason)}
        />
      )}
      {previewMedia && (
        <ListingAssetPreviewOverlay media={previewMedia} onClose={() => setPreviewMedia(null)} />
      )}
    </div>
  );
}
