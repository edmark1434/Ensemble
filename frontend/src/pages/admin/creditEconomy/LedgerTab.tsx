import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Loader2, Search } from 'lucide-react';
import {
  downloadCsv,
  ECONOMY_ACCENT,
  ECONOMY_API,
  EmptyRow,
  formatCredits,
  formatDateTime,
  INPUT,
  LedgerAmount,
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
  type EconomyVariant,
  type LedgerEntry,
  type LedgerParty,
} from './creditEconomyTypes';

const PAGE_SIZE = 50;

type Filters = {
  search: string;
  kind: string;
  type: string;
  status: string;
  from: string;
  to: string;
  minAmount: string;
  sort: string;
};

const DEFAULTS: Filters = {
  search: '',
  kind: 'all',
  type: 'all',
  status: 'all',
  from: '',
  to: '',
  minAmount: '',
  sort: 'newest',
};

function partyLabel(p: LedgerParty) {
  return p.handle ? `${p.name} (@${p.handle})` : p.name;
}

export function exportLedger(entries: LedgerEntry[], filename = `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`) {
  downloadCsv(
    filename,
    ['Transaction ID', 'Date', 'Category', 'Type', 'Status', 'Amount', 'Signed', 'From', 'From wallet', 'To', 'To wallet', 'Reason', 'By', 'Reference table', 'Reference ID', 'Dispute ID', 'Reverses'],
    entries.map((e) => [
      e.id,
      e.createdAt,
      e.category,
      e.type,
      e.status,
      e.amount,
      e.signedAmount ?? '',
      partyLabel(e.source),
      e.source.walletId || '',
      partyLabel(e.destination),
      e.destination.walletId || '',
      e.adjustment?.reason || '',
      e.adjustment?.actorName || '',
      e.referenceTable || '',
      e.referenceId || '',
      e.relatedDisputeId || '',
      e.reversesTransactionId || '',
    ])
  );
}

type LedgerTabProps = {
  variant: EconomyVariant;
  preset?: Partial<Filters>;
  refreshToken: number;
  onOpenWallet: (walletId: string) => void;
};

export default function LedgerTab({ variant, preset, refreshToken, onOpenWallet }: LedgerTabProps) {
  const accent = ECONOMY_ACCENT[variant];
  const [filters, setFilters] = useState<Filters>({ ...DEFAULTS, ...preset });
  const [offset, setOffset] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const search = useDebounced(filters.search);
  const minAmount = useDebounced(filters.minAmount);

  const presetKey = JSON.stringify(preset || {});
  useEffect(() => {
    setFilters({ ...DEFAULTS, ...preset });
    setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetKey]);

  const dateError = filters.from && filters.to && filters.from > filters.to ? 'From must be on or before To' : '';
  const amountError = minAmount !== '' && !/^\d+$/.test(minAmount) ? 'Whole credits only' : '';

  const params = useMemo(
    () => ({
      search,
      kind: filters.kind,
      type: filters.type,
      status: filters.status,
      from: dateError ? undefined : filters.from,
      to: dateError ? undefined : filters.to,
      minAmount: amountError ? undefined : minAmount,
      sort: filters.sort,
      limit: PAGE_SIZE,
      offset,
    }),
    [search, filters.kind, filters.type, filters.status, filters.from, filters.to, minAmount, filters.sort, offset, dateError, amountError]
  );
  const { page, loading, error, reload } = usePagedList<LedgerEntry>(ECONOMY_API.ledger, params, refreshToken);
  const items = page?.items || [];
  const total = page?.total || 0;

  const update = (patch: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setOffset(0);
  };
  const hasFilters = (Object.keys(DEFAULTS) as (keyof Filters)[]).some((k) => k !== 'sort' && filters[k] !== DEFAULTS[k]);

  const openParty = (party: LedgerParty) => {
    if (party.walletId && party.walletType === 'Account') onOpenWallet(party.walletId);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-col gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              placeholder="Search party, transaction / wallet / reference ID, reason…"
              className={`${INPUT} pl-9 ${accent.ring}`}
            />
          </div>
          <select value={filters.kind} onChange={(e) => update({ kind: e.target.value })} className={SELECT} aria-label="Category">
            <option value="all">All categories</option>
            {LEDGER_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
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
            <input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} className={`mt-1 block ${SELECT}`} />
          </label>
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">
            To
            <input type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} className={`mt-1 block ${SELECT}`} />
          </label>
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">
            Min amount
            <input
              type="number"
              min={0}
              value={filters.minAmount}
              onChange={(e) => update({ minAmount: e.target.value })}
              placeholder="Any"
              className={`mt-1 block w-28 ${SELECT}`}
            />
          </label>
          {(dateError || amountError) && <p className="pb-2 text-[11px] text-amber-300">{dateError || amountError}</p>}
          {hasFilters && (
            <button type="button" onClick={() => update({ ...DEFAULTS, sort: filters.sort })} className="pb-2 text-xs text-zinc-400 hover:text-white">
              Reset filters
            </button>
          )}
          <div className="flex items-center gap-2 sm:ml-auto">
            <p className="text-xs text-zinc-500">
              {loading && <Loader2 className={`mr-1 inline h-3 w-3 animate-spin ${accent.spinner}`} />}
              {total.toLocaleString()} entr{total === 1 ? 'y' : 'ies'}
            </p>
            <button
              type="button"
              disabled={!items.length}
              onClick={() => exportLedger(items)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-xs text-zinc-300 hover:text-white disabled:opacity-40"
              title="Exports the rows on this page"
            >
              <Download className="h-3.5 w-3.5" /> Export page (CSV)
            </button>
          </div>
        </div>
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
                    className={`cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02] ${open ? 'bg-white/[0.02]' : ''}`}
                  >
                    <td className="px-3 py-3 text-zinc-500">
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">{formatDateTime(e.createdAt)}</td>
                    <td className="px-3 py-3">
                      <p className="text-sm text-white">{e.isAdjustment ? 'Staff adjustment' : e.type}</p>
                      <p className="text-[10px] text-zinc-600">
                        {e.isAdjustment ? e.adjustment?.reason || 'No reason recorded' : e.category}
                      </p>
                    </td>
                    <td className="max-w-[200px] px-3 py-3" onClick={(ev) => { ev.stopPropagation(); openParty(e.source); }}>
                      <PartyCell party={e.source} />
                    </td>
                    <td className="max-w-[200px] px-3 py-3" onClick={(ev) => { ev.stopPropagation(); openParty(e.destination); }}>
                      {e.isAdjustment ? <p className="text-xs text-zinc-500">Same wallet</p> : <PartyCell party={e.destination} />}
                    </td>
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
                        <LedgerEntryDetail entry={e} onOpenWallet={onOpenWallet} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && items.length === 0 && <EmptyRow colSpan={7}>No ledger entries match these filters.</EmptyRow>}
            {loading && items.length === 0 && <EmptyRow colSpan={7}>Loading ledger…</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pager total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} loading={loading} />
    </section>
  );
}

function DetailFact({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className={`mt-0.5 break-all text-xs text-zinc-200 ${mono ? 'font-mono' : ''}`}>{value || '—'}</p>
    </div>
  );
}

export function LedgerEntryDetail({ entry: e, onOpenWallet }: { entry: LedgerEntry; onOpenWallet?: (walletId: string) => void }) {
  const walletLink = (p: LedgerParty) =>
    p.walletId && p.walletType === 'Account' && onOpenWallet ? (
      <button type="button" onClick={() => onOpenWallet(p.walletId as string)} className="underline decoration-white/20 hover:text-white">
        {p.walletId}
      </button>
    ) : (
      p.walletId
    );
  return (
    <div className="space-y-3">
      {e.isAdjustment && (
        <div
          className={`rounded-xl border p-3 text-xs ${
            e.adjustment?.recorded ? 'border-white/[0.08] bg-white/[0.02] text-zinc-200' : 'border-amber-500/25 bg-amber-500/[0.06] text-amber-100'
          }`}
        >
          {e.adjustment?.recorded ? (
            <>
              <p>
                <span className="font-semibold">{(e.adjustment.delta || 0) > 0 ? 'Granted' : 'Deducted'} {formatCredits(Math.abs(e.adjustment.delta || 0))} credits</span>
                {' '}by {e.adjustment.actorName || 'staff'}
                {e.adjustment.actorRole ? ` (${e.adjustment.actorRole})` : ''}
                {e.adjustment.balanceAfter != null ? ` · spendable after: ${formatCredits(e.adjustment.balanceAfter)}` : ''}
              </p>
              <p className="mt-1 text-zinc-400">{e.adjustment.reason}</p>
            </>
          ) : (
            <p>
              This adjustment was made before staff adjustments were audited. Its direction (grant or deduction), reason
              and author were not recorded.
            </p>
          )}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailFact label="Transaction ID" value={e.id} mono />
        <DetailFact label="Type / category" value={`${e.type} · ${e.category}`} />
        <DetailFact label="From wallet" value={walletLink(e.source)} mono />
        <DetailFact label="To wallet" value={walletLink(e.destination)} mono />
        <DetailFact label="Reference" value={e.referenceTable ? `${e.referenceTable} · ${shortId(e.referenceId)}` : null} />
        <DetailFact label="Dispute" value={e.relatedDisputeId} mono />
        <DetailFact label="Reverses" value={e.reversesTransactionId} mono />
        <DetailFact label="Fee entry" value={e.feeTransactionId} mono />
        {(e.source.contractId || e.destination.contractId) && (
          <DetailFact label="Escrow contract" value={e.source.contractId || e.destination.contractId} mono />
        )}
      </div>
    </div>
  );
}
