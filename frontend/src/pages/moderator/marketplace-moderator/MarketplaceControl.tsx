import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ChevronDown,
  Clock,
  Coins,
  Gauge,
  History,
  Inbox,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  ShoppingBag,
  SquareArrowOutUpRight,
  Timer,
} from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import RowActionsMenu, { type MenuItem } from '@/pages/admin/userTeam/components/RowActionsMenu';
import ListingDetailModal, {
  SellerListingsModal,
  listingStatusPill,
} from './ListingDetailModal';
import {
  LISTING_ACTIONS,
  ListingReasonDialog,
  actionsForStatus,
  type ListingAction,
} from './listingActions';
import type {
  MarketplaceListing,
  MarketplaceOverview,
  MarketplaceSummary,
} from './marketplaceTypes';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'delisted';

const STATUS_TABS: {
  id: StatusFilter;
  label: string;
  countKey: keyof MarketplaceSummary;
}[] = [
  { id: 'pending', label: 'Pending review', countKey: 'pendingListings' },
  { id: 'approved', label: 'Live catalog', countKey: 'approvedListings' },
  { id: 'rejected', label: 'Rejected', countKey: 'rejectedListings' },
  { id: 'delisted', label: 'Delisted', countKey: 'delistedListings' },
  { id: 'all', label: 'All listings', countKey: 'totalListings' },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest submitted' },
  { id: 'oldest', label: 'Oldest submitted' },
  { id: 'reviewed', label: 'Recently reviewed' },
  { id: 'price_desc', label: 'Price: high to low' },
  { id: 'price_asc', label: 'Price: low to high' },
  { id: 'title', label: 'Title A–Z' },
] as const;

type SortId = (typeof SORT_OPTIONS)[number]['id'];

const PAGE_STEPS = [100, 250, 500] as const;
const DEFAULT_API_BASE = '/api/moderator/marketplace';

/** Help text under the queue heading, so every tab says what it is for. */
const STATUS_HINTS: Record<StatusFilter, string> = {
  pending: 'Submissions waiting on a first decision, oldest first inside the queue.',
  approved:
    'Assets live in the catalog right now. Delist one for a takedown, or send it back for re-approval when a copyright report still has to be checked.',
  rejected: 'Turned down submissions. Approving one publishes it without a resubmission.',
  delisted: 'Pulled from the catalog. Relist it, or send it back to the queue for a fresh review.',
  all: 'Every listing in the marketplace, whatever state it is in.',
};

function listingParams(
  status: StatusFilter,
  category: string,
  search: string,
  sort: SortId,
  limit: number
) {
  return {
    status: status === 'all' ? undefined : status,
    category: category === 'all' ? undefined : category,
    search: search.trim() || undefined,
    sort,
    limit,
  };
}

function overviewCategories(data: MarketplaceOverview) {
  return (data.charts?.listingCategories || []).map((c) => ({
    label: c.label,
    value: Number(c.value || 0),
  }));
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

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  sub: string;
  tone: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const className = `flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
    active
      ? 'border-amber-500/40 bg-amber-500/[0.07]'
      : 'border-white/[0.08] bg-[#14151c] hover:border-white/15'
  }`;
  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-1 text-2xl font-bold leading-none tabular-nums text-white">{value}</p>
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-500">{sub}</p>
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
    <div className="space-y-2 p-4">
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

const SELECT_CLASS =
  'rounded-lg border border-white/10 bg-[#0f1016] px-2.5 py-2 text-xs text-white outline-none transition focus:border-amber-500/40';

export default function MarketplaceControl({
  apiBase = DEFAULT_API_BASE,
  embedded = false,
}: {
  apiBase?: string;
  embedded?: boolean;
} = {}) {
  const overviewUrl = `${apiBase}/overview`;
  const listingsUrl = `${apiBase}/listings`;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortId>('newest');
  const [limit, setLimit] = useState<number>(PAGE_STEPS[0]);
  const firstParams = listingParams('pending', 'all', '', 'newest', PAGE_STEPS[0]);
  const [listings, setListings] = useState<MarketplaceListing[]>(() => {
    const cached = peekStaffGet(listingsUrl, firstParams);
    return cached?.data?.success ? cached.data.data : [];
  });
  const [summary, setSummary] = useState<MarketplaceSummary | null>(() => {
    const cached = peekStaffGet(overviewUrl);
    return cached?.data?.success ? cached.data.data.summary : null;
  });
  const [categories, setCategories] = useState<{ label: string; value: number }[]>(() => {
    const cached = peekStaffGet(overviewUrl);
    return cached?.data?.success ? overviewCategories(cached.data.data) : [];
  });
  const [loading, setLoading] = useState(
    () => !peekStaffGet(listingsUrl, firstParams)?.data?.success
  );
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sellerAccountId, setSellerAccountId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState<{
    listing: MarketplaceListing;
    action: ListingAction;
  } | null>(null);
  const shownListingsKey = useRef(loading ? null : JSON.stringify(firstParams));

  const loadOverview = async () => {
    try {
      const res = await staffGet(overviewUrl);
      if (res.data?.success) {
        setSummary(res.data.data.summary);
        setCategories(overviewCategories(res.data.data));
      }
    } catch {
      /* The queue still works without the headline counts. */
    }
  };

  const load = async () => {
    const params = listingParams(statusFilter, categoryFilter, search, sort, limit);
    const key = JSON.stringify(params);
    const cached = peekStaffGet(listingsUrl, params);
    if (cached?.data?.success) {
      shownListingsKey.current = key;
      setListings(cached.data.data);
    }
    if (shownListingsKey.current === key) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await staffGet(listingsUrl, params);
      if (res.data?.success) {
        shownListingsKey.current = key;
        setListings(res.data.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([load(), loadOverview()]);
  };

  useEffect(() => {
    void loadOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overviewUrl]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), search ? 350 : 0);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, search, sort, limit, listingsUrl]);

  /** A new filter is a new result set, so page size starts over. */
  const changeStatus = (next: StatusFilter) => {
    setStatusFilter(next);
    setLimit(PAGE_STEPS[0]);
  };

  const selected = useMemo(
    () => listings.find((l) => l.id === selectedId) || null,
    [listings, selectedId]
  );

  const fallbackCounts = useMemo<Record<string, number>>(
    () => ({
      totalListings: listings.length,
      pendingListings: listings.filter((l) => l.status === 'pending').length,
      approvedListings: listings.filter((l) => l.status === 'approved').length,
      rejectedListings: listings.filter((l) => l.status === 'rejected').length,
      delistedListings: listings.filter((l) => l.status === 'delisted').length,
      approvedCreditValue: listings
        .filter((l) => l.status === 'approved')
        .reduce((acc, l) => acc + l.priceCredits, 0),
    }),
    [listings]
  );

  /** Overview counts cover the whole marketplace; the page falls back to what is loaded. */
  const countFor = (key: keyof MarketplaceSummary) => {
    const value = summary?.[key];
    if (typeof value === 'number') return value;
    const fallback = fallbackCounts[key as string];
    return typeof fallback === 'number' ? fallback : 0;
  };

  const runAction = async (listing: MarketplaceListing, action: ListingAction, reason?: string) => {
    const meta = LISTING_ACTIONS[action];
    if (meta.requiresReason && !reason) {
      setPrompt({ listing, action });
      return;
    }
    setSaving(true);
    try {
      await api.patch(`${apiBase}/listings/${listing.id}`, {
        status: meta.status,
        rejectionReason: action === 'reject' ? reason : undefined,
        moderationNote: action === 'reject' ? undefined : reason,
        reason,
      });
      showSuccessToast(meta.successMessage);
      setPrompt(null);
      await refreshAll();
    } catch (err) {
      showErrorToast(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update listing'
      );
    } finally {
      setSaving(false);
    }
  };

  const menuItems = (listing: MarketplaceListing): MenuItem[] => [
    { id: 'open', label: 'Open listing detail', icon: SquareArrowOutUpRight },
    { id: 'seller', label: 'Seller listing history', icon: History },
    ...actionsForStatus(listing.status).map((action) => ({
      id: action,
      label: LISTING_ACTIONS[action].label,
      icon: LISTING_ACTIONS[action].icon,
      section: 'manage',
      danger: action === 'reject',
      disabled: saving,
    })),
  ];

  const onMenuAction = (listing: MarketplaceListing, id: string) => {
    if (id === 'open') return setSelectedId(listing.id);
    if (id === 'seller') return setSellerAccountId(listing.submittedBy.accountId);
    void runAction(listing, id as ListingAction);
  };

  const aging = summary?.pendingOver48h || 0;
  const agingWeek = summary?.pendingOver7d || 0;
  const copyrightReports = summary?.copyrightReports || 0;
  const oldestPending = summary?.oldestPendingAt || null;
  const avgReviewHours = summary?.avgReviewHours ?? null;

  const shellClass = embedded
    ? 'relative z-10 space-y-5'
    : 'relative z-10 min-h-screen px-6 py-8 md:pl-[260px] md:px-10';
  const Shell = embedded ? 'div' : 'main';

  const refreshButton = (
    <button
      type="button"
      onClick={() => void refreshAll()}
      disabled={loading || refreshing}
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading || refreshing ? 'animate-spin' : ''}`} />
      Refresh
    </button>
  );

  return (
    <Shell className={shellClass} style={embedded ? undefined : { animation: 'fadeIn 420ms ease' }}>
      {!embedded ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-400">
              Marketplace Moderator
            </p>
            <h1 className="text-2xl font-bold text-white">Marketplace Control</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-500">
              One desk for the whole catalog: review submissions, publish or reject them, and act on
              assets that are already live — a takedown, or a re-approval after a copyright report.
            </p>
          </div>
          {refreshButton}
        </div>
      ) : (
        <div className="flex justify-end">{refreshButton}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Package}
          label="Pending review"
          value={countFor('pendingListings')}
          sub={
            aging > 0
              ? `${aging} waiting over 48h · oldest ${relativeTime(oldestPending)}`
              : oldestPending
                ? `Oldest submitted ${relativeTime(oldestPending)}`
                : 'Nothing waiting on a first decision'
          }
          tone="bg-amber-500/15 text-amber-300"
          active={statusFilter === 'pending'}
          onClick={() => changeStatus('pending')}
        />
        <StatCard
          icon={ShoppingBag}
          label="Live catalog"
          value={countFor('approvedListings')}
          sub={`${countFor('approvedCreditValue').toLocaleString()} credits of approved assets`}
          tone="bg-emerald-500/15 text-emerald-300"
          active={statusFilter === 'approved'}
          onClick={() => changeStatus('approved')}
        />
        <StatCard
          icon={Archive}
          label="Off catalog"
          value={countFor('rejectedListings') + countFor('delistedListings')}
          sub={`${countFor('rejectedListings')} rejected · ${countFor('delistedListings')} delisted`}
          tone="bg-zinc-500/15 text-zinc-300"
          active={statusFilter === 'rejected' || statusFilter === 'delisted'}
          onClick={() => changeStatus('rejected')}
        />
        <StatCard
          icon={Gauge}
          label="Review throughput"
          value={summary?.reviewedLast7d ?? 0}
          sub={`Decided in 7 days · ${
            avgReviewHours === null ? 'no average yet' : `${avgReviewHours}h average wait`
          }`}
          tone="bg-sky-500/15 text-sky-300"
        />
      </div>

      {(aging > 0 || copyrightReports > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {aging > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-1.5 text-[11px] text-amber-100">
              <Timer className="h-3.5 w-3.5" />
              {aging} submission{aging === 1 ? '' : 's'} pending for more than 48 hours
              {agingWeek > 0 ? ` (${agingWeek} over a week)` : ''}
            </span>
          )}
          {copyrightReports > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/[0.07] px-3 py-1.5 text-[11px] text-red-100">
              <ShieldAlert className="h-3.5 w-3.5" />
              {copyrightReports} open marketplace report{copyrightReports === 1 ? '' : 's'} mention
              copyright — check the live catalog before closing them
            </span>
          )}
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0f1016]">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-3 py-2.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeStatus(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-amber-500/15 text-amber-100'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-[10px] tabular-nums opacity-70">
                {countFor(tab.countKey)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white">
              {STATUS_TABS.find((t) => t.id === statusFilter)?.label}
            </h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-zinc-500">
              {STATUS_HINTS[statusFilter]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(PAGE_STEPS[0]);
                }}
                placeholder="Search title, seller or LST-#"
                className="w-60 rounded-lg border border-white/10 bg-[#14151c] py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
              />
            </div>
            <label className="sr-only" htmlFor="listing-category">
              Category
            </label>
            <select
              id="listing-category"
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setLimit(PAGE_STEPS[0]);
              }}
              className={SELECT_CLASS}
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat.label} value={cat.label}>
                  {cat.label} ({cat.value})
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="listing-sort">
              Sort
            </label>
            <select
              id="listing-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className={SELECT_CLASS}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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
                Try clearing the search, or switching the status and category filters.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wide text-zinc-500">
                    <th className="px-5 py-3 font-medium">Listing</th>
                    <th className="px-4 py-3 font-medium">Asset</th>
                    <th className="px-4 py-3 font-medium">Seller</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Submitted</th>
                    <th className="px-4 py-3 font-medium">Last review</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => {
                    const note = l.status === 'rejected' ? l.rejectionReason : l.moderationNote;
                    return (
                      <tr
                        key={l.id}
                        tabIndex={0}
                        onClick={() => setSelectedId(l.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedId(l.id);
                          }
                        }}
                        className="cursor-pointer border-b border-white/[0.04] transition hover:bg-white/[0.03] focus:bg-white/[0.04] focus:outline-none"
                      >
                        <td className="px-5 py-3.5 align-top font-mono text-[11px] text-zinc-400">
                          {l.number}
                        </td>
                        <td className="max-w-[280px] px-4 py-3.5 align-top">
                          <div className="flex items-start gap-3">
                            {l.thumbnailUrl ? (
                              <img
                                src={`${import.meta.env.VITE_CLOUDFRONT_URL}/${l.thumbnailUrl}`}
                                alt=""
                                className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-600 ring-1 ring-white/10">
                                <Package className="h-4 w-4" />
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-100">{l.title}</p>
                              <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-600">
                                {l.description || 'No description'}
                              </p>
                              {note && (
                                <p className="mt-1 line-clamp-2 text-[11px] text-amber-200/80">
                                  {l.status === 'rejected' ? 'Rejected: ' : 'Note: '}
                                  {note}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[11px] font-bold text-amber-200 ring-1 ring-white/10">
                              {initials(l.submittedBy.name) || '?'}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[140px] truncate text-xs font-medium text-zinc-200">
                                {l.submittedBy.name}
                              </span>
                              <span className="block max-w-[140px] truncate text-[11px] text-zinc-500">
                                @{l.submittedBy.handle}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 align-top text-zinc-400">{l.category || '—'}</td>
                        <td className="px-4 py-3.5 align-top">
                          <span className="flex items-center gap-1 tabular-nums text-zinc-300">
                            <Coins className="h-3.5 w-3.5 text-zinc-600" />
                            {l.priceCredits.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top">{listingStatusPill(l.status)}</td>
                        <td className="px-4 py-3.5 align-top">
                          <span
                            className="flex items-center gap-1 text-xs text-zinc-500"
                            title={formatDateTime(l.createdAt)}
                          >
                            <Clock className="h-3 w-3 text-zinc-600" />
                            {relativeTime(l.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 align-top text-xs text-zinc-500">
                          {l.reviewedBy?.name ? (
                            <>
                              <p className="text-zinc-300">{l.reviewedBy.name}</p>
                              <p className="text-[11px]" title={formatDateTime(l.reviewedAt)}>
                                {relativeTime(l.reviewedAt)}
                              </p>
                            </>
                          ) : (
                            'Not reviewed yet'
                          )}
                        </td>
                        <td
                          className="px-5 py-3.5 align-top text-right"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <RowActionsMenu
                            items={menuItems(l)}
                            sectionLabels={{ primary: 'Listing', manage: 'Moderate' }}
                            onAction={(id) => onMenuAction(l, id)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-zinc-500">
              <p>
                Showing <span className="tabular-nums text-zinc-300">{listings.length}</span>{' '}
                listing{listings.length === 1 ? '' : 's'}
                {summary ? ` · ${summary.totalListings} in the marketplace` : ''}
                {refreshing ? ' · refreshing…' : ''}
              </p>
              {listings.length >= limit && limit < PAGE_STEPS[PAGE_STEPS.length - 1] && (
                <button
                  type="button"
                  onClick={() =>
                    setLimit((current) => PAGE_STEPS.find((step) => step > current) || current)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-300 transition hover:border-amber-500/30 hover:text-amber-200"
                >
                  <ChevronDown className="h-3 w-3" />
                  Load more
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {prompt && (
        <ListingReasonDialog
          action={prompt.action}
          listingTitle={`${prompt.listing.number} · ${prompt.listing.title}`}
          saving={saving}
          onCancel={() => setPrompt(null)}
          onConfirm={(reason) => void runAction(prompt.listing, prompt.action, reason)}
        />
      )}

      {selectedId !== null && (
        <ListingDetailModal
          listingId={selectedId}
          seed={selected}
          apiBase={apiBase}
          onClose={() => setSelectedId(null)}
          onUpdated={() => void refreshAll()}
          onViewSeller={(accountId) => setSellerAccountId(accountId)}
        />
      )}

      {sellerAccountId !== null && (
        <SellerListingsModal
          accountId={sellerAccountId}
          apiBase={apiBase}
          onClose={() => setSellerAccountId(null)}
          onOpenListing={(id) => {
            setSellerAccountId(null);
            setSelectedId(id);
          }}
        />
      )}
    </Shell>
  );
}
