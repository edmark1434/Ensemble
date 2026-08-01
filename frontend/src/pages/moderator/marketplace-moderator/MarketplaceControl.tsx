import { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Coins,
  Eye,
  History,
  Inbox,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import ListingDetailModal, {
  SellerListingsModal,
  listingStatusPill,
} from './ListingDetailModal';
import type { MarketplaceListing, MarketplaceOverview } from './marketplaceTypes';

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected', 'delisted'] as const;

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
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  tone,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
    active
      ? 'border-rose-500/40 bg-rose-500/10'
      : 'border-white/[0.08] bg-[#14151c] hover:border-white/15'
  }`;
  const body = (
    <>
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-lg font-bold leading-tight text-white">{value}</p>
        <p className="text-[11px] text-zinc-500">{label}</p>
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

function SkeletonRows() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3"
        >
          <div className="h-10 w-10 rounded-lg bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-white/5" />
            <div className="h-2.5 w-1/5 rounded bg-white/5" />
          </div>
          <div className="h-5 w-16 rounded-full bg-white/5" />
          <div className="h-5 w-20 rounded-full bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export default function MarketplaceControl() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [overview, setOverview] = useState<MarketplaceOverview['summary'] | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sellerAccountId, setSellerAccountId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const loadOverview = async () => {
    try {
      const res = await api.get('/api/moderator/marketplace/overview');
      if (res.data?.success) {
        setOverview(res.data.data.summary);
        const cats = (res.data.data.charts?.listingCategories || []).map(
          (c: { label: string }) => c.label
        );
        setCategories(cats);
      }
    } catch {
      /* overview chips are secondary */
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/moderator/marketplace/listings', {
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          search: search.trim() || undefined,
        },
      });
      if (res.data?.success) setListings(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([load(), loadOverview()]);
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, search]);

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) || null,
    [listings, selectedId]
  );

  const moderate = async (
    listing: MarketplaceListing,
    status: 'approved' | 'rejected' | 'delisted',
    rejectionReason?: string
  ) => {
    if (status === 'rejected' && !rejectionReason) {
      setSelectedId(listing.id);
      return;
    }
    setSavingId(listing.id);
    try {
      await api.patch(`/api/moderator/marketplace/listings/${listing.id}`, {
        status,
        rejectionReason,
      });
      const labels = {
        approved: 'Listing approved',
        rejected: 'Listing rejected',
        delisted: 'Listing delisted',
      } as const;
      showSuccessToast(labels[status]);
      await refreshAll();
    } catch {
      showErrorToast('Failed to update listing');
    } finally {
      setSavingId(null);
    }
  };

  const summary = overview || {
    totalListings: listings.length,
    pendingListings: listings.filter((l) => l.status === 'pending').length,
    approvedListings: listings.filter((l) => l.status === 'approved').length,
    rejectedListings: listings.filter((l) => l.status === 'rejected').length,
    delistedListings: listings.filter((l) => l.status === 'delisted').length,
    approvedCreditValue: listings
      .filter((l) => l.status === 'approved')
      .reduce((acc, l) => acc + l.priceCredits, 0),
  };

  return (
    <main
      className="relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-400">
            Marketplace Moderator
          </p>
          <h1 className="text-2xl font-bold text-white">Marketplace Control</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review submissions, approve catalog assets, reject policy violations, and delist live
            listings.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshAll()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <SummaryChip
          icon={Package}
          label="Pending review"
          value={summary.pendingListings}
          tone="bg-amber-500/15 text-amber-300"
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
        <SummaryChip
          icon={ShoppingBag}
          label="Approved"
          value={summary.approvedListings}
          tone="bg-emerald-500/15 text-emerald-300"
          active={statusFilter === 'approved'}
          onClick={() => setStatusFilter('approved')}
        />
        <SummaryChip
          icon={XCircle}
          label="Rejected"
          value={summary.rejectedListings}
          tone="bg-red-500/15 text-red-300"
          active={statusFilter === 'rejected'}
          onClick={() => setStatusFilter('rejected')}
        />
        <SummaryChip
          icon={Archive}
          label="Delisted"
          value={summary.delistedListings ?? 0}
          tone="bg-zinc-500/15 text-zinc-300"
          active={statusFilter === 'delisted'}
          onClick={() => setStatusFilter('delisted')}
        />
        <SummaryChip
          icon={Coins}
          label="Catalog credits"
          value={(summary.approvedCreditValue ?? 0).toLocaleString()}
          tone="bg-rose-500/15 text-rose-300"
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#14151c] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, seller or LST-#"
            className="w-64 rounded-lg border border-white/10 bg-[#0f1016] py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-rose-500/40"
          />
        </div>

        <div className="h-6 w-px bg-white/[0.06]" />

        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                statusFilter === tab
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                  : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <>
            <div className="h-6 w-px bg-white/[0.06]" />
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  categoryFilter === 'all'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                    : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                All categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    categoryFilter === cat
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                      : 'border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">
            Listing queue
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {listings.length} in view
              {overview ? ` · ${overview.totalListings} total` : ''}
            </span>
          </p>
        </div>

        {loading ? (
          <SkeletonRows />
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-600">
              <Inbox className="h-7 w-7" />
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-400">No listings in this view</p>
              <p className="mt-0.5 text-xs text-zinc-600">
                Try clearing search or switching status/category filters.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pl-2">Listing #</th>
                  <th className="pb-3">Asset</th>
                  <th className="pb-3">Seller</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Price</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Age</th>
                  <th className="pb-3">Reviewed by</th>
                  <th className="pb-3 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {listings.map((l) => {
                  const saving = savingId === l.id;
                  return (
                    <tr key={l.id} className="group transition hover:bg-white/[0.03]">
                      <td className="py-3 pl-2 font-mono text-[11px] text-zinc-400">{l.number}</td>
                      <td className="max-w-[260px] py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(l.id)}
                          className="flex max-w-full items-center gap-3 text-left"
                        >
                          {l.thumbnailUrl ? (
                            <img
                              src={l.thumbnailUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                            />
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-600 ring-1 ring-white/10">
                              <Package className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-zinc-200 underline-offset-2 group-hover:text-rose-300 group-hover:underline">
                              {l.title}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-zinc-600">
                              {l.description || 'No description'}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="py-3 pr-3">
                        <button
                          type="button"
                          onClick={() => setSellerAccountId(l.submittedBy.accountId)}
                          className="group/seller flex items-center gap-2.5 text-left"
                          title="View seller listings"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500/30 to-amber-500/20 text-[11px] font-bold text-rose-200 ring-1 ring-white/10">
                            {initials(l.submittedBy.name) || '?'}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[140px] truncate text-xs font-medium text-zinc-200 group-hover/seller:text-rose-300">
                              {l.submittedBy.name}
                            </span>
                            <span className="block max-w-[140px] truncate text-[11px] text-zinc-500 underline-offset-2 group-hover/seller:underline">
                              @{l.submittedBy.handle}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="py-3 pr-3 text-zinc-400">{l.category || '—'}</td>
                      <td className="py-3 pr-3">
                        <span className="flex items-center gap-1 text-zinc-300">
                          <Coins className="h-3.5 w-3.5 text-zinc-600" />
                          {l.priceCredits.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 pr-3">{listingStatusPill(l.status)}</td>
                      <td className="py-3 pr-3">
                        <span className="text-xs text-zinc-500" title={formatDateTime(l.createdAt)}>
                          {relativeTime(l.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs text-zinc-500">
                        {l.reviewedBy?.name || '—'}
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedId(l.id)}
                            title="View details"
                            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSellerAccountId(l.submittedBy.accountId)}
                            title="Seller listings"
                            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                          {l.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => void moderate(l, 'approved')}
                                title="Approve"
                                className="rounded-lg border border-emerald-500/25 p-1.5 text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-50"
                              >
                                {saving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => setSelectedId(l.id)}
                                title="Reject"
                                className="rounded-lg border border-red-500/25 p-1.5 text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {l.status === 'approved' && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void moderate(l, 'delisted')}
                              title="Delist"
                              className="rounded-lg border border-zinc-500/25 p-1.5 text-zinc-400 transition hover:bg-zinc-500/10 disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Archive className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId !== null && (
        <ListingDetailModal
          listingId={selectedId}
          seed={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void refreshAll()}
          onViewSeller={(accountId) => setSellerAccountId(accountId)}
        />
      )}

      {sellerAccountId !== null && (
        <SellerListingsModal
          accountId={sellerAccountId}
          onClose={() => setSellerAccountId(null)}
          onOpenListing={(id) => {
            setSellerAccountId(null);
            setSelectedId(id);
          }}
        />
      )}
    </main>
  );
}
