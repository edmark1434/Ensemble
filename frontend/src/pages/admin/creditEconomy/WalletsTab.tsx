import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Loader2, Lock, Search, Unlock } from 'lucide-react';
import BulkActionsMenu from '../userTeam/components/BulkActionsMenu';
import { HoldCreditsDialog, ReleaseHoldDialog } from './CreditActionDialogs';
import {
  downloadCsv,
  ECONOMY_ACCENT,
  ECONOMY_API,
  EmptyRow,
  formatCredits,
  formatDate,
  formatDateTime,
  formatRelative,
  HoldPill,
  INPUT,
  Pager,
  SELECT,
  StatusPill,
  useDebounced,
  usePagedList,
} from './economyUi';
import type { EconomyVariant, EconomyViewer, EconomyWallet } from './creditEconomyTypes';

const PAGE_SIZE = 50;

type Mode = 'wallets' | 'holds';

type Filters = {
  search: string;
  accountType: string;
  hold: string;
  balance: string;
  accountStatus: string;
  sort: string;
};

const WALLET_DEFAULTS: Filters = {
  search: '',
  accountType: 'all',
  hold: 'all',
  balance: 'all',
  accountStatus: 'all',
  sort: 'balance_desc',
};

const HOLD_DEFAULTS: Filters = { ...WALLET_DEFAULTS, hold: 'held', sort: 'hold_ending' };

/**
 * Wallets and Holds keep their filters in the URL like the Ledger, so a link from the
 * overview ("Negative balances", "Holds releasing within 7 days") can be copied as is.
 */
const WALLET_PARAM: Record<keyof Filters, string> = {
  search: 'q',
  accountType: 'accountType',
  hold: 'hold',
  balance: 'balance',
  accountStatus: 'accountStatus',
  sort: 'sort',
};
export const WALLET_PARAM_KEYS = Object.values(WALLET_PARAM);

function defaultsFor(mode: Mode) {
  return mode === 'holds' ? HOLD_DEFAULTS : WALLET_DEFAULTS;
}

function readWalletFilters(params: URLSearchParams, mode: Mode): Filters {
  const out = { ...defaultsFor(mode) };
  for (const key of Object.keys(WALLET_PARAM) as (keyof Filters)[]) {
    const value = params.get(WALLET_PARAM[key]);
    if (value) out[key] = value;
  }
  return out;
}

/** Writes wallet filters into `params` (values equal to the mode's defaults are removed). */
export function writeWalletFilters(params: URLSearchParams, patch: Record<string, string>, mode: Mode) {
  const defaults = defaultsFor(mode);
  for (const key of Object.keys(patch) as (keyof Filters)[]) {
    const name = WALLET_PARAM[key];
    if (!name) continue;
    const value = patch[key];
    if (!value || value === defaults[key]) params.delete(name);
    else params.set(name, value);
  }
  return params;
}

const HOLD_VIEWS = [
  { value: 'held', label: 'All holds' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'expiring', label: 'Releasing ≤ 7 days' },
  { value: 'indefinite', label: 'Until review' },
];

const BULK_ITEMS = [
  { id: 'freeze', label: 'Freeze credits', danger: true, section: 'Credits' },
  { id: 'release', label: 'Release holds', section: 'Credits' },
  { id: 'export', label: 'Export selected (CSV)', section: 'Tools' },
  { id: 'clear', label: 'Clear selection', section: 'Other' },
];

type WalletsTabProps = {
  variant: EconomyVariant;
  viewer: EconomyViewer;
  mode: Mode;
  statuses: string[];
  refreshToken: number;
  onView: (wallet: EconomyWallet) => void;
  onChanged: () => void;
};

function exportWallets(wallets: EconomyWallet[]) {
  downloadCsv(
    `wallets-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Wallet ID', 'Account ID', 'Name', 'Username', 'Account type', 'Account status', 'Spendable', 'Held', 'Total', 'Hold reason', 'Hold until', 'Last activity'],
    wallets.map((w) => [
      w.walletId,
      w.accountId,
      w.name,
      w.username,
      w.accountType,
      w.accountStatus,
      w.spendableCredits,
      w.heldCredits,
      w.totalCredits,
      w.hold?.reason || '',
      w.hold?.frozenUntil || (w.hold ? 'Until review' : ''),
      w.lastActivityAt || '',
    ])
  );
}

export default function WalletsTab({
  variant,
  viewer,
  mode,
  statuses,
  refreshToken,
  onView,
  onChanged,
}: WalletsTabProps) {
  const accent = ECONOMY_ACCENT[variant];
  const defaults = defaultsFor(mode);
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readWalletFilters(searchParams, mode), [searchParams, mode]);
  const [selected, setSelected] = useState<Map<string, EconomyWallet>>(new Map());
  const [dialog, setDialog] = useState<{ kind: 'hold' | 'release'; wallets: EconomyWallet[] } | null>(null);

  const update = useCallback(
    (patch: Partial<Filters>) => {
      setSearchParams((prev) => writeWalletFilters(new URLSearchParams(prev), patch as Record<string, string>, mode), { replace: true });
    },
    [setSearchParams, mode]
  );

  // The search box keeps what is typed; the URL gets it after a pause.
  const [searchText, setSearchText] = useState(filters.search);
  useEffect(() => setSearchText(filters.search), [filters.search]);
  const search = useDebounced(searchText);
  useEffect(() => {
    const v = search.trim();
    if (v !== filters.search) update({ search: v });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Page 1 whenever the filters change (opening a wallet modal does not count).
  const filterKey = JSON.stringify(filters);
  const [paging, setPaging] = useState({ key: filterKey, offset: 0 });
  const offset = paging.key === filterKey ? paging.offset : 0;
  const setOffset = (next: number) => setPaging({ key: filterKey, offset: next });

  const params = useMemo(
    () => ({
      search: filters.search,
      accountType: filters.accountType,
      hold: filters.hold,
      balance: filters.balance,
      accountStatus: filters.accountStatus,
      sort: filters.sort,
      limit: PAGE_SIZE,
      offset,
    }),
    [filters.search, filters.accountType, filters.hold, filters.balance, filters.accountStatus, filters.sort, offset]
  );
  const { page, loading, error, reload } = usePagedList<EconomyWallet>(ECONOMY_API.wallets, params, refreshToken);
  const items = page?.items || [];
  const total = page?.total || 0;

  // A page past the end (after a release or a filter change elsewhere) has no total: back to page 1.
  useEffect(() => {
    if (!loading && page && page.items.length === 0 && offset > 0) setOffset(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, page, offset]);

  const pageIds = items.map((w) => w.walletId);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someSelected = pageIds.some((id) => selected.has(id));

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (allSelected) for (const id of pageIds) next.delete(id);
      else for (const w of items) next.set(w.walletId, w);
      return next;
    });

  const toggleOne = (wallet: EconomyWallet) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(wallet.walletId)) next.delete(wallet.walletId);
      else next.set(wallet.walletId, wallet);
      return next;
    });

  const selectedWallets = [...selected.values()];

  const onBulk = (id: string) => {
    if (id === 'clear') return setSelected(new Map());
    if (!selectedWallets.length) return;
    if (id === 'export') return exportWallets(selectedWallets);
    if (id === 'freeze') return setDialog({ kind: 'hold', wallets: selectedWallets });
    if (id === 'release') return setDialog({ kind: 'release', wallets: selectedWallets });
  };

  const afterAction = () => {
    setDialog(null);
    setSelected(new Map());
    void reload();
    onChanged();
  };

  const hasFilters =
    filters.search.trim() ||
    (['accountType', 'balance', 'accountStatus'] as const).some((k) => filters[k] !== 'all') ||
    filters.hold !== defaults.hold;

  const typeOptions = viewer.canSeeStaffWallets ? ['user', 'team', 'staff'] : ['user', 'team'];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3">
        {mode === 'holds' && (
          <div className="flex flex-wrap gap-1.5">
            {HOLD_VIEWS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => update({ hold: v.value })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  filters.hold === v.value ? accent.chip : 'bg-white/[0.03] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <div className="relative min-w-[220px] flex-1 lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={mode === 'holds' ? 'Search name, username, hold reason…' : 'Search name, username, email, wallet or account ID…'}
              className={`${INPUT} pl-9 ${accent.ring}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={filters.accountType} onChange={(e) => update({ accountType: e.target.value })} className={SELECT} aria-label="Account type">
              <option value="all">All account types</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            {mode === 'wallets' && (
              <>
                <select value={filters.hold} onChange={(e) => update({ hold: e.target.value })} className={SELECT} aria-label="Hold">
                  <option value="all">Any hold state</option>
                  <option value="held">On hold</option>
                  <option value="not_held">No hold</option>
                  <option value="overdue">Hold overdue</option>
                </select>
                <select value={filters.balance} onChange={(e) => update({ balance: e.target.value })} className={SELECT} aria-label="Balance">
                  <option value="all">Any balance</option>
                  <option value="positive">Has credits</option>
                  <option value="empty">Empty</option>
                  <option value="negative">Negative</option>
                </select>
              </>
            )}
            <select value={filters.accountStatus} onChange={(e) => update({ accountStatus: e.target.value })} className={SELECT} aria-label="Account status">
              <option value="all">Any account status</option>
              {statuses.map((s) => (
                <option key={s} value={s.toLowerCase()}>
                  {s}
                </option>
              ))}
            </select>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value })} className={SELECT} aria-label="Sort">
              {mode === 'holds' && <option value="hold_ending">Releasing soonest</option>}
              <option value="balance_desc">Highest balance</option>
              <option value="balance_asc">Lowest balance</option>
              <option value="held_desc">Most held</option>
              <option value="name">Name A–Z</option>
              <option value="newest">Newest accounts</option>
            </select>
            {hasFilters && (
              <button type="button" onClick={() => {
                  setSearchText('');
                  update({ ...defaults });
                }} className="px-2 text-xs text-zinc-400 hover:text-white">
                Reset
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 lg:ml-auto">
            <p className="text-xs text-zinc-500">
              {loading && <Loader2 className={`mr-1 inline h-3 w-3 animate-spin ${accent.spinner}`} />}
              {total.toLocaleString()} {mode === 'holds' ? 'hold' : 'wallet'}
              {total === 1 ? '' : 's'}
              {selected.size > 0 ? ` · ${selected.size} selected` : ''}
            </p>
            {mode === 'wallets' && viewer.canHold && (
              <BulkActionsMenu selectedCount={selected.size} items={BULK_ITEMS} onAction={onBulk} />
            )}
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
        {mode === 'wallets' ? (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all wallets on this page"
                    className={`h-4 w-4 ${accent.check}`}
                  />
                </th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Spendable</th>
                <th className="px-4 py-3 text-right">On hold</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => {
                const checked = selected.has(w.walletId);
                return (
                  <tr
                    key={w.walletId}
                    onClick={() => onView(w)}
                    className={`cursor-pointer border-b border-white/[0.04] hover:bg-white/[0.02] ${checked ? accent.row : ''}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleOne(w)}
                        aria-label={`Select ${w.name}`}
                        className={`h-4 w-4 ${accent.check}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{w.name}</p>
                      <p className="text-[10px] text-zinc-600">@{w.username || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {w.accountType}
                      {w.staffRole && <span className="block text-[10px] text-zinc-600">{w.staffRole}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <StatusPill status={w.accountStatus} />
                        {w.hold && <HoldPill overdue={w.hold.overdue} />}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${w.spendableCredits < 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                      {formatCredits(w.spendableCredits)}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${w.heldCredits ? 'text-amber-300' : 'text-zinc-600'}`}>
                      {formatCredits(w.heldCredits)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-white">{formatCredits(w.totalCredits)}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500" title={formatDateTime(w.lastActivityAt)}>
                      {w.lastActivityAt ? formatRelative(w.lastActivityAt) : 'No activity'}
                      {w.transactionCount != null && (
                        <span className="block text-[10px] text-zinc-600">{w.transactionCount.toLocaleString()} entries</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && <EmptyRow colSpan={8}>No wallets match these filters.</EmptyRow>}
              {loading && items.length === 0 && <EmptyRow colSpan={8}>Loading wallets…</EmptyRow>}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3 text-right">Held</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Releases</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.walletId} onClick={() => onView(w)} className="cursor-pointer border-b border-white/[0.04] align-top hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{w.name}</p>
                    <p className="text-[10px] text-zinc-600">
                      @{w.username || '—'} · {w.accountType} · {w.accountStatus}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-300">{formatCredits(w.heldCredits)}</td>
                  <td className="max-w-[280px] px-4 py-3 text-xs text-zinc-300">
                    <p className="line-clamp-2">{w.hold?.reason || <span className="text-zinc-600">No reason recorded</span>}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {formatDate(w.hold?.frozenAt)}
                    <span className="block text-[10px] text-zinc-600">
                      {w.hold?.byStaffName || 'Unknown'}
                      {w.hold?.byStaffRole ? ` · ${w.hold.byStaffRole}` : ''}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {w.hold?.frozenUntil ? (
                      <span className={w.hold.overdue ? 'text-red-300' : 'text-zinc-300'}>
                        {formatDate(w.hold.frozenUntil)}
                        <span className="block text-[10px] text-zinc-600">
                          {w.hold.overdue ? `Overdue ${formatRelative(w.hold.frozenUntil)}` : formatRelative(w.hold.frozenUntil)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-zinc-400">Until staff review</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {viewer.canHold && (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'hold', wallets: [w] })}
                          disabled={w.spendableCredits <= 0}
                          title={w.spendableCredits > 0 ? 'Hold newly arrived credits too' : 'No spendable credits to add'}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 disabled:opacity-40"
                        >
                          <Lock className="h-3 w-3" /> Hold more
                        </button>
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'release', wallets: [w] })}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200"
                        >
                          <Unlock className="h-3 w-3" /> Release
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <EmptyRow colSpan={6}>No holds in this view.</EmptyRow>}
              {loading && items.length === 0 && <EmptyRow colSpan={6}>Loading holds…</EmptyRow>}
            </tbody>
          </table>
        )}
      </div>

      <Pager total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} loading={loading} />

      {dialog?.kind === 'hold' && (
        <HoldCreditsDialog wallets={dialog.wallets} onClose={() => setDialog(null)} onDone={afterAction} />
      )}
      {dialog?.kind === 'release' && (
        <ReleaseHoldDialog wallets={dialog.wallets} onClose={() => setDialog(null)} onDone={afterAction} />
      )}
    </section>
  );
}
