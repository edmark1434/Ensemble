import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  ECONOMY_ACCENT,
  ECONOMY_API,
  EmptyRow,
  fetchAllPages,
  formatCredits,
  formatDateTime,
  INPUT,
  LedgerAmount,
  localDate,
  Pager,
  PartyCell,
  SELECT,
  shortId,
  StatusPill,
  useDebounced,
  usePagedList,
} from './economyUi';
import {
  LEDGER_SHOW_OPTIONS,
  LEDGER_STATUS_OPTIONS,
  LINKED_KIND_LABELS,
  referenceLabel,
  typeLabel,
  type EconomyVariant,
  type LedgerEntry,
  type LedgerFilters,
  type LedgerParty,
} from './creditEconomyTypes';
import {
  entrySubtitle,
  entryTitle,
  exportLedger,
  formatHours,
  LEDGER_DEFAULTS,
  LedgerEntryDetail,
  LedgerLinkChips,
  readLedgerFilters,
  writeLedgerFilters,
  type LedgerNav,
} from './ledgerShared';

// Re-exported for older imports.
export { exportLedger, LedgerEntryDetail } from './ledgerShared';

const PAGE_SIZE = 50;
const EXPORT_MAX = 5000;
const WHOLE = /^\d+$/;

/** What a quick view replaces; search, period and scope (wallet, contract…) are kept. */
const VIEW_KEYS: (keyof LedgerFilters)[] = ['kind', 'type', 'status', 'sort', 'minAmount', 'maxAmount', 'olderThanHours'];

/** The few views staff need most; everything else is in the Show picker. */
const QUICK_VIEWS: { id: string; label: string; patch: Partial<LedgerFilters> }[] = [
  { id: 'pending', label: 'Pending', patch: { status: 'Pending', sort: 'oldest' } },
  { id: 'failed', label: 'Failed', patch: { status: 'Failed' } },
  { id: 'reversed', label: 'Reversed', patch: { status: 'Reversed' } },
  { id: 'cashout_open', label: 'Unpaid cashouts', patch: { kind: 'cashout_open', sort: 'oldest' } },
  { id: 'adjustment', label: 'Staff adjustments', patch: { kind: 'adjustment' } },
];

const PERIODS: { value: string; label: string }[] = [
  { value: 'any', label: 'Any time' },
  { value: 'since:24', label: 'Last 24 hours' },
  { value: 'since:168', label: 'Last 7 days' },
  { value: 'since:720', label: 'Last 30 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom dates…' },
];

const SHOW_GROUPS = LEDGER_SHOW_OPTIONS.reduce<Record<string, typeof LEDGER_SHOW_OPTIONS>>((acc, o) => {
  (acc[o.group] ||= []).push(o);
  return acc;
}, {});
const SHOW_VALUES = new Set(LEDGER_SHOW_OPTIONS.map((o) => o.value));

function monthStart() {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function viewActive(filters: LedgerFilters, patch: Partial<LedgerFilters>) {
  return (Object.keys(patch) as (keyof LedgerFilters)[]).every((k) => k === 'sort' || filters[k] === patch[k]);
}

type LedgerTabProps = {
  variant: EconomyVariant;
  refreshToken: number;
  onOpenWallet: (walletId: string) => void;
  onOpenTransaction: (transactionId: string) => void;
};

export default function LedgerTab({ variant, refreshToken, onOpenWallet, onOpenTransaction }: LedgerTabProps) {
  const accent = ECONOMY_ACCENT[variant];
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readLedgerFilters(searchParams), [searchParams]);

  // The URL holds the committed filters; text boxes keep what is being typed.
  const [searchText, setSearchText] = useState(filters.search);
  const [minText, setMinText] = useState(filters.minAmount);
  const [maxText, setMaxText] = useState(filters.maxAmount);
  useEffect(() => setSearchText(filters.search), [filters.search]);
  useEffect(() => setMinText(filters.minAmount), [filters.minAmount]);
  useEffect(() => setMaxText(filters.maxAmount), [filters.maxAmount]);

  const update = useCallback(
    (patch: Partial<LedgerFilters>) => {
      setSearchParams((prev) => writeLedgerFilters(new URLSearchParams(prev), patch), { replace: true });
    },
    [setSearchParams]
  );

  const debouncedSearch = useDebounced(searchText);
  const debouncedMin = useDebounced(minText);
  const debouncedMax = useDebounced(maxText);
  useEffect(() => {
    const v = debouncedSearch.trim();
    if (v !== filters.search) update({ search: v });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);
  useEffect(() => {
    const v = debouncedMin.trim();
    if ((v === '' || WHOLE.test(v)) && v !== filters.minAmount) update({ minAmount: v });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin]);
  useEffect(() => {
    const v = debouncedMax.trim();
    if ((v === '' || WHOLE.test(v)) && v !== filters.maxAmount) update({ maxAmount: v });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMax]);

  const dateError = filters.from && filters.to && filters.from > filters.to ? 'From must be on or before To' : '';
  const amountTextError =
    (minText.trim() && !WHOLE.test(minText.trim())) || (maxText.trim() && !WHOLE.test(maxText.trim())) ? 'Whole credits only' : '';
  const rangeError =
    filters.minAmount && filters.maxAmount && Number(filters.minAmount) > Number(filters.maxAmount) ? 'Min is above max' : '';
  const amountError = amountTextError || rangeError;

  // Period picker: a rolling window, this month, or custom dates.
  const period = (() => {
    if (filters.from || filters.to) return !filters.to && filters.from === monthStart() && !filters.sinceHours ? 'month' : 'custom';
    if (filters.sinceHours && PERIODS.some((p) => p.value === `since:${filters.sinceHours}`)) return `since:${filters.sinceHours}`;
    return filters.sinceHours ? 'other' : 'any';
  })();
  const [showMore, setShowMore] = useState(() => Boolean(filters.from || filters.to || filters.minAmount || filters.maxAmount));
  const setPeriod = (value: string) => {
    if (value === 'custom') {
      setShowMore(true);
      update({ sinceHours: '' });
      return;
    }
    if (value === 'month') return update({ sinceHours: '', from: monthStart(), to: '' });
    if (value.startsWith('since:')) return update({ sinceHours: value.slice(6), from: '', to: '' });
    update({ sinceHours: '', from: '', to: '' });
  };

  // Show picker: one category or one exact type.
  const showValue = filters.type !== 'all' ? `type:${filters.type}` : filters.kind !== 'all' ? `kind:${filters.kind}` : 'all';
  const showExtra = showValue !== 'all' && !SHOW_VALUES.has(showValue)
    ? {
        value: showValue,
        label: showValue.startsWith('kind:')
          ? LINKED_KIND_LABELS[filters.kind] || filters.kind
          : typeLabel(filters.type),
      }
    : null;
  const setShow = (value: string) => {
    if (value.startsWith('kind:')) update({ kind: value.slice(5), type: 'all' });
    else if (value.startsWith('type:')) update({ type: value.slice(5), kind: 'all' });
    else update({ kind: 'all', type: 'all' });
  };

  // A filter change goes back to page 1 without a stale-offset request in between. Keyed on
  // the filters only: opening a wallet or an entry (`?wallet=` / `?tx=`) keeps the page.
  const filterKey = JSON.stringify(filters);
  const [paging, setPaging] = useState({ key: filterKey, offset: 0 });
  const offset = paging.key === filterKey ? paging.offset : 0;
  const setOffset = (next: number) => setPaging({ key: filterKey, offset: next });
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => setExpanded(null), [filterKey]);

  const baseParams = useMemo(
    () => ({
      search: filters.search,
      kind: filters.kind,
      type: filters.type,
      status: filters.status,
      from: dateError ? undefined : filters.from,
      to: dateError ? undefined : filters.to,
      tzOffset: !dateError && (filters.from || filters.to) ? new Date().getTimezoneOffset() : undefined,
      sinceHours: filters.sinceHours,
      olderThanHours: filters.olderThanHours,
      minAmount: rangeError ? undefined : filters.minAmount,
      maxAmount: rangeError ? undefined : filters.maxAmount,
      sort: filters.sort,
      walletId: filters.walletId,
      direction: filters.walletId ? filters.direction : undefined,
      accountId: filters.accountId,
      referenceId: filters.referenceId,
      referenceTable: filters.referenceId ? filters.referenceTable : undefined,
      disputeId: filters.disputeId,
      contractId: filters.contractId,
    }),
    [filters, dateError, rangeError]
  );
  const params = useMemo(() => ({ ...baseParams, limit: PAGE_SIZE, offset }), [baseParams, offset]);
  const { page, loading, error, reload } = usePagedList<LedgerEntry>(ECONOMY_API.ledger, params, refreshToken);
  const items = page?.items || [];
  const total = page?.total || 0;
  const totalCredits = page?.totalCredits ?? null;

  // A page past the end (rows changed since it was opened) has no total: go back to page 1.
  useEffect(() => {
    if (!loading && page && page.items.length === 0 && offset > 0) setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, page, offset]);

  const hasFilters = (Object.keys(LEDGER_DEFAULTS) as (keyof LedgerFilters)[]).some(
    (k) => k !== 'sort' && filters[k] !== LEDGER_DEFAULTS[k]
  );
  const resetAll = () => {
    setSearchText('');
    setMinText('');
    setMaxText('');
    update({ ...LEDGER_DEFAULTS });
  };

  const applyView = (patch: Partial<LedgerFilters>) => {
    const cleared = Object.fromEntries(VIEW_KEYS.map((k) => [k, LEDGER_DEFAULTS[k]])) as Partial<LedgerFilters>;
    update(viewActive(filters, patch) ? cleared : { ...cleared, ...patch });
  };

  /** From an entry's detail: show exactly that scope (other filters would hide part of it). */
  const showScope = (scope: Partial<LedgerFilters>) => {
    setSearchText('');
    setMinText('');
    setMaxText('');
    update({ ...LEDGER_DEFAULTS, ...scope });
  };

  /** The party behind the wallet scope, read from the rows on screen. */
  const scopedParty = useMemo(() => {
    if (!filters.walletId) return null;
    for (const e of items) {
      for (const p of [e.source, e.destination]) if (p.walletId === filters.walletId) return p;
    }
    return null;
  }, [items, filters.walletId]);
  const scopedName = scopedParty
    ? scopedParty.walletType === 'Platform'
      ? 'Platform wallet'
      : scopedParty.walletType === 'Escrow'
        ? 'Contract escrow'
        : scopedParty.name
    : shortId(filters.walletId);

  // Everything narrowing the list that is not one of the pickers above, as removable chips.
  const chips: { key: string; label: string; clear: Partial<LedgerFilters> }[] = [];
  if (filters.walletId) chips.push({ key: 'w', label: `Wallet: ${scopedName}`, clear: { walletId: '', direction: 'all' } });
  if (filters.accountId) chips.push({ key: 'a', label: `Account ${shortId(filters.accountId)}`, clear: { accountId: '' } });
  if (filters.contractId) chips.push({ key: 'c', label: `Contract ${shortId(filters.contractId)}`, clear: { contractId: '' } });
  if (filters.referenceId) {
    chips.push({ key: 'r', label: `${referenceLabel(filters.referenceTable)} ${shortId(filters.referenceId)}`, clear: { referenceId: '', referenceTable: '' } });
  }
  if (filters.disputeId) chips.push({ key: 'd', label: `Dispute ${shortId(filters.disputeId)}`, clear: { disputeId: '' } });
  if (period === 'other') chips.push({ key: 's', label: `Last ${formatHours(filters.sinceHours)}`, clear: { sinceHours: '' } });
  if (filters.olderThanHours) chips.push({ key: 'o', label: `Older than ${formatHours(filters.olderThanHours)}`, clear: { olderThanHours: '' } });
  if (filters.minAmount || filters.maxAmount) {
    const label = filters.minAmount && filters.maxAmount
      ? `${formatCredits(Number(filters.minAmount))}–${formatCredits(Number(filters.maxAmount))} credits`
      : filters.minAmount
        ? `${formatCredits(Number(filters.minAmount))}+ credits`
        : `Up to ${formatCredits(Number(filters.maxAmount))} credits`;
    chips.push({ key: 'm', label, clear: { minAmount: '', maxAmount: '' } });
  }

  const [exporting, setExporting] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState('');
  const exportAll = async () => {
    setNotice('');
    setExporting({ done: 0, total: Math.min(total, EXPORT_MAX) });
    try {
      const result = await fetchAllPages<LedgerEntry>(ECONOMY_API.ledger, baseParams, {
        max: EXPORT_MAX,
        onProgress: (done, all) => setExporting({ done, total: all }),
      });
      exportLedger(result.items);
      if (result.truncated) {
        setNotice(`Exported the first ${EXPORT_MAX.toLocaleString()} of ${result.total.toLocaleString()} entries. Narrow the filters to export the rest.`);
      }
    } catch {
      setNotice('The export failed. Try again.');
    } finally {
      setExporting(null);
    }
  };

  const partyButton = (party: LedgerParty, sameWallet?: boolean) => {
    if (sameWallet) return <p className="text-xs text-zinc-500">Same wallet</p>;
    if (party.walletId && party.walletType === 'Account') {
      return (
        <button
          type="button"
          onClick={(ev) => {
            ev.stopPropagation();
            onOpenWallet(party.walletId as string);
          }}
          className="block w-full min-w-0 rounded-md text-left hover:bg-white/[0.04]"
          title="Open this wallet"
        >
          <PartyCell party={party} />
        </button>
      );
    }
    return <PartyCell party={party} />;
  };

  const nav: LedgerNav = { onOpenWallet, onOpenTransaction, onShowInLedger: showScope };
  const chipClass = (active: boolean) =>
    `rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${active ? accent.chip : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search name, @handle, email, reason or ID…"
              title="Also finds cashout references and IDs by their first 8 characters"
              className={`${INPUT} pl-9 pr-8 ${accent.ring}`}
            />
            {searchText && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  update({ search: '' });
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={showValue} onChange={(e) => setShow(e.target.value)} className={SELECT} aria-label="Show">
              <option value="all">Show: everything</option>
              {showExtra && (
                <optgroup label="From the overview">
                  <option value={showExtra.value}>{showExtra.label}</option>
                </optgroup>
              )}
              {Object.entries(SHOW_GROUPS).map(([group, options]) => (
                <optgroup key={group} label={group}>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select value={filters.status} onChange={(e) => update({ status: e.target.value })} className={SELECT} aria-label="Status">
              <option value="all">Any status</option>
              {LEDGER_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select value={period === 'other' ? 'any' : period} onChange={(e) => setPeriod(e.target.value)} className={SELECT} aria-label="Period">
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={SELECT} aria-label="Sort">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount_desc">Largest first</option>
              <option value="amount_asc">Smallest first</option>
            </select>
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs transition ${
                showMore ? 'border-white/20 text-white' : 'border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
              aria-expanded={showMore}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> More
            </button>
          </div>
        </div>

        {showMore && (
          <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              From
              <input
                type="date"
                value={filters.from}
                max={filters.to || undefined}
                onChange={(e) => update({ from: e.target.value, sinceHours: '' })}
                className={`mt-1 block ${SELECT}`}
              />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              To
              <input
                type="date"
                value={filters.to}
                min={filters.from || undefined}
                onChange={(e) => update({ to: e.target.value, sinceHours: '' })}
                className={`mt-1 block ${SELECT}`}
              />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              Min credits
              <input
                type="text"
                inputMode="numeric"
                value={minText}
                onChange={(e) => setMinText(e.target.value)}
                placeholder="Any"
                className={`mt-1 block w-24 ${SELECT}`}
              />
            </label>
            <label className="text-[10px] uppercase tracking-wide text-zinc-500">
              Max credits
              <input
                type="text"
                inputMode="numeric"
                value={maxText}
                onChange={(e) => setMaxText(e.target.value)}
                placeholder="Any"
                className={`mt-1 block w-24 ${SELECT}`}
              />
            </label>
            {(dateError || amountError) && <p className="pb-2 text-[11px] text-amber-300">{dateError || amountError}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-600">Quick</span>
          {QUICK_VIEWS.map((v) => (
            <button key={v.id} type="button" onClick={() => applyView(v.patch)} className={chipClass(viewActive(filters, v.patch))}>
              {v.label}
            </button>
          ))}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-600">Only</span>
            {chips.map((c) => (
              <span key={c.key} className={`inline-flex items-center gap-1 rounded-lg py-1 pl-2.5 pr-1 text-[11px] font-medium ${accent.chip}`}>
                {c.label}
                <button type="button" onClick={() => update(c.clear)} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label={`Remove ${c.label}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {filters.walletId &&
              (['all', 'in', 'out'] as const).map((d) => (
                <button key={d} type="button" onClick={() => update({ direction: d })} className={chipClass(filters.direction === d)}>
                  {d === 'all' ? 'In & out' : d === 'in' ? 'Money in' : 'Money out'}
                </button>
              ))}
            {filters.walletId && scopedParty?.walletType === 'Account' && (
              <button type="button" onClick={() => onOpenWallet(filters.walletId)} className="ml-1 text-[11px] text-zinc-400 underline hover:text-white">
                Open wallet
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-zinc-400">
            {loading && <Loader2 className={`mr-1 inline h-3 w-3 animate-spin ${accent.spinner}`} />}
            <span className="font-semibold text-white">{total.toLocaleString()}</span> entr{total === 1 ? 'y' : 'ies'}
            {totalCredits != null && total > 0 && (
              <>
                {' · '}
                <span className="font-semibold text-white">{formatCredits(totalCredits)}</span> credits
              </>
            )}
          </p>
          {hasFilters && (
            <button type="button" onClick={resetAll} className="text-xs text-zinc-500 underline hover:text-white">
              Clear all filters
            </button>
          )}
          <button
            type="button"
            disabled={!total || Boolean(exporting)}
            onClick={() => void exportAll()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
            title={`Every entry that matches these filters (up to ${EXPORT_MAX.toLocaleString()})`}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {exporting ? `Exporting ${exporting.done.toLocaleString()} / ${exporting.total.toLocaleString()}` : 'Export CSV'}
          </button>
        </div>
        {notice && <p className="text-[11px] text-amber-300">{notice}</p>}
      </div>

      {error && (
        <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
          <button type="button" onClick={() => void reload()} className="ml-auto underline">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3">When</th>
              <th className="px-3 py-3">What</th>
              <th className="px-3 py-3">From</th>
              <th className="px-3 py-3">To</th>
              <th className="px-3 py-3 text-right">Credits</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => {
              const open = expanded === e.id;
              return (
                <Fragment key={e.id}>
                  <tr
                    onClick={() => setExpanded(open ? null : e.id)}
                    className={`cursor-pointer border-b border-white/[0.04] align-top hover:bg-white/[0.02] ${open ? 'bg-white/[0.02]' : ''}`}
                  >
                    <td className="px-3 py-3 text-zinc-500">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">{formatDateTime(e.createdAt)}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-white">{entryTitle(e)}</p>
                      <p className="text-[11px] text-zinc-500">{entrySubtitle(e)}</p>
                      <LedgerLinkChips entry={e} onOpenTransaction={onOpenTransaction} />
                    </td>
                    <td className="max-w-[200px] px-3 py-3">{partyButton(e.source)}</td>
                    <td className="max-w-[200px] px-3 py-3">{partyButton(e.destination, e.isAdjustment)}</td>
                    <td className="px-3 py-3 text-right">
                      <LedgerAmount entry={e} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={e.status} />
                    </td>
                  </tr>
                  {open && (
                    <tr className="border-b border-white/[0.04] bg-[#0f1016]">
                      <td />
                      <td colSpan={6} className="px-3 py-4">
                        <LedgerEntryDetail entry={e} {...nav} currentWalletId={filters.walletId || null} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && items.length === 0 && (
              <EmptyRow colSpan={7}>
                No entries match these filters.
                {hasFilters && (
                  <button type="button" onClick={resetAll} className="ml-2 text-zinc-300 underline hover:text-white">
                    Clear all filters
                  </button>
                )}
              </EmptyRow>
            )}
            {loading && items.length === 0 && <EmptyRow colSpan={7}>Loading ledger…</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pager total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} loading={loading} />
    </section>
  );
}
