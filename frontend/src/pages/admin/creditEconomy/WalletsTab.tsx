import { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import BulkActionsMenu from '../userTeam/components/BulkActionsMenu';
import TableFilterBar, { uniqueOptions } from '../userTeam/components/TableFilterBar';
import {
  freezeAccountCredits,
  handleAccountActionError,
} from '../userTeam/accountActions';
import type { EconomyWallet } from './creditEconomyTypes';

const WALLET_BULK_ITEMS = [
  { id: 'freeze', label: 'Freeze credits', danger: true, section: 'Credits' },
  { id: 'unfreeze', label: 'Unfreeze credits', section: 'Credits' },
  { id: 'export', label: 'Export selected JSON', section: 'Tools' },
  { id: 'clear', label: 'Clear selection', section: 'Other' },
];

type WalletsTabProps = {
  wallets: EconomyWallet[];
  onView: (wallet: EconomyWallet) => void;
  onChanged?: () => void;
};

function exportJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WalletsTab({ wallets, onView, onChanged }: WalletsTabProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [frozenFilter, setFrozenFilter] = useState('all');
  const [sortBy, setSortBy] = useState('credits');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const typeOptions = useMemo(
    () => uniqueOptions(wallets.map((w) => w.accountType)),
    [wallets]
  );
  const statusOptions = useMemo(
    () => uniqueOptions(wallets.map((w) => w.status)),
    [wallets]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = wallets.filter((w) => {
      if (typeFilter !== 'all' && w.accountType.toLowerCase() !== typeFilter) return false;
      if (statusFilter !== 'all' && w.status.toLowerCase() !== statusFilter) return false;
      if (frozenFilter === 'frozen' && !w.frozen) return false;
      if (frozenFilter === 'active' && w.frozen) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.email.toLowerCase().includes(q) ||
        w.username.toLowerCase().includes(q) ||
        w.walletId.toLowerCase().includes(q) ||
        String(w.accountId).includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'merit':
          return b.meritScore - a.meritScore;
        case 'assets':
          return b.totalAssets - a.totalAssets;
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'credits':
        default:
          return b.totalCredits - a.totalCredits;
      }
    });

    return list;
  }, [wallets, search, typeFilter, statusFilter, frozenFilter, sortBy]);

  const visibleIds = filtered.map((w) => w.walletId);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));

  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  const toggleOne = (walletId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(walletId)) next.delete(walletId);
      else next.add(walletId);
      return next;
    });
  };

  const selectedWallets = wallets.filter((w) => selectedIds.has(w.walletId));

  const handleBulkAction = async (actionId: string) => {
    if (actionId === 'clear') {
      setSelectedIds(new Set());
      return;
    }
    if (selectedWallets.length === 0) return;

    if (actionId === 'export') {
      exportJson(`wallets-export-${Date.now()}.json`, selectedWallets);
      showSuccessToast(`Exported ${selectedWallets.length} wallet(s)`);
      return;
    }

    if (actionId !== 'freeze' && actionId !== 'unfreeze') return;

    const freeze = actionId === 'freeze';
    setBulkBusy(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const wallet of selectedWallets) {
        try {
          await freezeAccountCredits(String(wallet.accountId), freeze, { silent: true });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      if (ok > 0) {
        showSuccessToast(
          `${freeze ? 'Froze' : 'Unfroze'} credits on ${ok} wallet${ok === 1 ? '' : 's'}${
            failed ? ` (${failed} failed)` : ''
          }`
        );
        setSelectedIds(new Set());
        onChanged?.();
      } else {
        showErrorToast('Bulk credit action failed for all selected wallets');
      }
    } catch (err) {
      handleAccountActionError(err);
    } finally {
      setBulkBusy(false);
    }
  };

  const q = search.trim();
  const hasFilters =
    q || typeFilter !== 'all' || statusFilter !== 'all' || frozenFilter !== 'all';

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name / email / username / wallet…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
          />
        </div>
        <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
          {filtered.length} wallet{filtered.length === 1 ? '' : 's'}
          {hasFilters ? ` matching filters (of ${wallets.length})` : ''}
          {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
        </p>
        <div className="hidden flex-1 lg:block" />
        <TableFilterBar
          filters={[
            { id: 'type', label: 'Account type', value: typeFilter, options: typeOptions },
            { id: 'status', label: 'Status', value: statusFilter, options: statusOptions },
            {
              id: 'frozen',
              label: 'Credits',
              value: frozenFilter,
              options: [
                { value: 'active', label: 'Not frozen' },
                { value: 'frozen', label: 'Frozen' },
              ],
            },
          ]}
          sort={{
            value: sortBy,
            options: [
              { value: 'credits', label: 'Highest credits' },
              { value: 'name', label: 'Name A–Z' },
              { value: 'merit', label: 'Highest merit' },
              { value: 'assets', label: 'Most assets' },
              { value: 'revenue', label: 'Highest revenue' },
            ],
          }}
          onFilterChange={(id, value) => {
            if (id === 'type') setTypeFilter(value);
            if (id === 'status') setStatusFilter(value);
            if (id === 'frozen') setFrozenFilter(value);
          }}
          onSortChange={setSortBy}
          onClear={() => {
            setTypeFilter('all');
            setStatusFilter('all');
            setFrozenFilter('all');
            setSortBy('credits');
          }}
        />
        <BulkActionsMenu
          selectedCount={selectedIds.size}
          busy={bulkBusy}
          items={WALLET_BULK_ITEMS}
          onAction={(id) => void handleBulkAction(id)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0f1016] text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                  }}
                  onChange={toggleAllVisible}
                  aria-label="Select all visible wallets"
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                />
              </th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Account type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total credits</th>
              <th className="px-4 py-3 text-right">Total assets</th>
              <th className="px-4 py-3 text-right">Merit</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const isChecked = selectedIds.has(w.walletId);
              return (
                <tr
                  key={w.walletId}
                  className={`border-b border-white/[0.04] text-zinc-300 hover:bg-white/[0.02] ${
                    isChecked ? 'bg-rose-500/[0.07]' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(w.walletId)}
                      aria-label={`Select ${w.name}`}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{w.name}</p>
                    <p className="text-[10px] text-zinc-600">
                      @{w.username || '—'}
                      {w.frozen ? ' · Frozen' : ''}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{w.accountType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        w.frozen
                          ? 'bg-amber-500/15 text-amber-200'
                          : w.status.toLowerCase() === 'active'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-zinc-500/15 text-zinc-300'
                      }`}
                    >
                      {w.frozen ? 'Frozen' : w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-300/90">
                    {w.totalCredits.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{w.totalAssets}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-400">{w.meritScore}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onView(w)}
                      className="inline-flex rounded-lg p-2 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                      title="View wallet"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  No wallets match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
