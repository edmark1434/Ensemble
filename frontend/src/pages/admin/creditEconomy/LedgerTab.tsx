import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Check, ChevronDown, ChevronRight, Download, Link2, Loader2, Search, X } from 'lucide-react';
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
  localDateDaysAgo,
  Pager,
  PartyCell,
  SELECT,
  shortId,
  StatusPill,
  useDebounced,
  usePagedList,
} from './economyUi';
import {
  CREDIT_TRANSACTION_STATUSES,
  CREDIT_TRANSACTION_TYPES,
  LEDGER_KINDS,
  referenceLabel,
  type EconomyVariant,
  type LedgerEntry,
  type LedgerFilters,
  type LedgerParty,
} from './creditEconomyTypes';
import {
  entryTitle,
  exportLedger,
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

/** Filters a quick view replaces; search, dates and scope (wallet, reference…) are kept. */
const VIEW_KEYS: (keyof LedgerFilters)[] = ['kind', 'type', 'status', 'minAmount', 'maxAmount', 'sort'];

const QUICK_VIEWS: { id: string; label: string; patch: Partial<LedgerFilters> }[] = [
  { id: 'pending', label: 'Pending', patch: { status: 'Pending', sort: 'oldest' } },
  { id: 'failed', label: 'Failed', patch: { status: 'Failed' } },
  { id: 'reversed', label: 'Reversed', patch: { status: 'Reversed' } },
  { id: 'cashout_open', label: 'Unpaid cashouts', patch: { kind: 'cashout_open', sort: 'oldest' } },
  { id: 'adjustment', label: 'Staff adjustments', patch: { kind: 'adjustment' } },
  { id: 'fees', label: 'Platform fees', patch: { kind: 'fees' } },
  { id: 'dispute', label: 'Dispute-linked', patch: { kind: 'dispute' } },
  { id: 'large', label: '10,000+ credits', patch: { minAmount: '10000', sort: 'amount_desc' } },
];

const DATE_PRESETS: { id: string; label: string; from: () => string }[] = [
  { id: 'today', label: 'Today', from: () => localDate() },
  { id: '7d', label: '7 days', from: () => localDateDaysAgo(6) },
  { id: '30d', label: '30 days', from: () => localDateDaysAgo(29) },
  {
    id: 'month',
    label: 'This month',
    from: () => {
      const d = new Date();
      return localDate(new Date(d.getFullYear(), d.getMonth(), 1));
    },
  },
];

const KIND_GROUPS = LEDGER_KINDS.reduce<Record<string, typeof LEDGER_KINDS>>((acc, k) => {
  (acc[k.group] ||= []).push(k);
  return acc;
}, {});

type LedgerTabProps = {
  variant: EconomyVariant;
  refreshToken: number;
  onOpenWallet: (walletId: string) => void;
  onOpenTransaction: (transactionId: string) => void;
};

function viewActive(filters: LedgerFilters, patch: Partial<LedgerFilters>) {
  return (Object.keys(patch) as (keyof LedgerFilters)[]).every((k) => k === 'sort' || filters[k] === patch[k]);
}

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
    update({ ...LEDGER_DEFAULTS, sort: filters.sort });
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

  const scopeChips: { key: string; label: string; clear: Partial<LedgerFilters> }[] = [];
  if (filters.walletId) scopeChips.push({ key: 'w', label: `Wallet: ${scopedName}`, clear: { walletId: '', direction: 'all' } });
  if (filters.accountId) scopeChips.push({ key: 'a', label: `Account ${shortId(filters.accountId)}`, clear: { accountId: '' } });
  if (filters.contractId) scopeChips.push({ key: 'c', label: `Contract ${shortId(filters.contractId)}`, clear: { contractId: '' } });
  if (filters.referenceId) {
    scopeChips.push({
      key: 'r',
      label: `${referenceLabel(filters.referenceTable)} ${shortId(filters.referenceId)}`,
      clear: { referenceId: '', referenceTable: '' },
    });
  }
  if (filters.disputeId) scopeChips.push({ key: 'd', label: `Dispute ${shortId(filters.disputeId)}`, clear: { disputeId: '' } });

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
      setNotice('The export failed. Try again, or export this page only.');
    } finally {
      setExporting(null);
    }
  };

  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    void navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
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
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-600">Quick views</span>
          {QUICK_VIEWS.map((v) => (
            <button key={v.id} type="button" onClick={() => applyView(v.patch)} className={chipClass(viewActive(filters, v.patch))}>
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[220px] flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Name, @handle, email, reason, cashout ref, or any ID (full or first 8)…"
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
          <select value={filters.kind} onChange={(e) => update({ kind: e.target.value })} className={SELECT} aria-label="Category">
            <option value="all">All categories</option>
            {Object.entries(KIND_GROUPS).map(([group, kinds]) => (
              <optgroup key={group} label={group}>
                {kinds.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select value={filters.type} onChange={(e) => update({ type: e.target.value })} className={SELECT} aria-label="Type">
            <option value="all">All types</option>
            {CREDIT_TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={filters.status} onChange={(e) => update({ status: e.target.value })} className={SELECT} aria-label="Status">
            <option value="all">All statuses</option>
            {CREDIT_TRANSACTION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={SELECT} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount_desc">Largest amount</option>
            <option value="amount_asc">Smallest amount</option>
          </select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">
            From
            <input
              type="date"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => update({ from: e.target.value })}
              className={`mt-1 block ${SELECT}`}
            />
          </label>
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">
            To
            <input
              type="date"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => update({ to: e.target.value })}
              className={`mt-1 block ${SELECT}`}
            />
          </label>
          <div className="flex flex-wrap gap-1 pb-1">
            {DATE_PRESETS.map((p) => {
              const active = filters.from === p.from() && !filters.to;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => update(active ? { from: '', to: '' } : { from: p.from(), to: '' })}
                  className={chipClass(active)}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
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
          {hasFilters && (
            <button type="button" onClick={resetAll} className="pb-2 text-xs text-zinc-400 hover:text-white">
              Reset filters
            </button>
          )}
        </div>

        {scopeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] uppercase tracking-wide text-zinc-600">Only</span>
            {scopeChips.map((c) => (
              <span key={c.key} className={`inline-flex items-center gap-1 rounded-lg py-1 pl-2.5 pr-1 text-[11px] font-medium ${accent.chip}`}>
                {c.label}
                <button type="button" onClick={() => update(c.clear)} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label={`Remove ${c.label}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {filters.walletId && (
              <span className="ml-1 inline-flex gap-1">
                {(['all', 'in', 'out'] as const).map((d) => (
                  <button key={d} type="button" onClick={() => update({ direction: d })} className={chipClass(filters.direction === d)}>
                    {d === 'all' ? 'In & out' : d === 'in' ? 'Credits in' : 'Credits out'}
                  </button>
                ))}
              </span>
            )}
            {filters.walletId && scopedParty?.walletType === 'Account' && (
              <button type="button" onClick={() => onOpenWallet(filters.walletId)} className="ml-1 text-[11px] text-zinc-400 underline hover:text-white">
                Open wallet
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-zinc-500">
            {loading && <Loader2 className={`mr-1 inline h-3 w-3 animate-spin ${accent.spinner}`} />}
            {total.toLocaleString()} entr{total === 1 ? 'y' : 'ies'}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white"
              title="Copy a link to this exact view"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            <button
              type="button"
              disabled={!items.length || Boolean(exporting)}
              onClick={() => exportLedger(items)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
              title="Exports the rows on this page"
            >
              <Download className="h-3.5 w-3.5" /> This page
            </button>
            <button
              type="button"
              disabled={!total || Boolean(exporting)}
              onClick={() => void exportAll()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
              title={`Exports every entry that matches these filters (up to ${EXPORT_MAX.toLocaleString()})`}
            >
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {exporting
                ? `Exporting ${exporting.done.toLocaleString()} / ${exporting.total.toLocaleString()}`
                : `All ${Math.min(total, EXPORT_MAX).toLocaleString()} (CSV)`}
            </button>
          </div>
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
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3">When</th>
              <th className="px-3 py-3">What</th>
              <th className="px-3 py-3">From</th>
              <th className="px-3 py-3">To</th>
              <th className="px-3 py-3 text-right">Amount</th>
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
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">
                      {formatDateTime(e.createdAt)}
                      <span className="block font-mono text-[10px] text-zinc-600">{shortId(e.id)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-white">{entryTitle(e)}</p>
                      <p className="text-[10px] text-zinc-600">
                        {e.isAdjustment ? e.adjustment?.reason || 'No reason recorded' : e.category}
                      </p>
                      <LedgerLinkChips entry={e} onOpenTransaction={onOpenTransaction} />
                    </td>
                    <td className="max-w-[200px] px-3 py-3">{partyButton(e.source)}</td>
                    <td className="max-w-[200px] px-3 py-3">{partyButton(e.destination, e.isAdjustment)}</td>
                    <td className="px-3 py-3 text-right">
                      <LedgerAmount entry={e} />
                      {e.fee && <span className="block text-[10px] text-zinc-600">fee {formatCredits(e.fee.amount)}</span>}
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
                No ledger entries match these filters.
                {hasFilters && (
                  <button type="button" onClick={resetAll} className="ml-2 text-zinc-300 underline hover:text-white">
                    Reset filters
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
