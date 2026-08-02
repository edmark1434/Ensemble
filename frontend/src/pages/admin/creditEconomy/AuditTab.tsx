import { useMemo, useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { showSuccessToast } from '@/components/utility/toast.ts';
import BulkActionsMenu from '../userTeam/components/BulkActionsMenu';
import TableFilterBar, { uniqueOptions } from '../userTeam/components/TableFilterBar';
import type { AuditEntry } from './creditEconomyTypes';
import { CREDIT_TRANSACTION_TYPES } from './creditEconomyTypes';

const AUDIT_BULK_ITEMS = [
  { id: 'export', label: 'Export selected JSON', section: 'Tools' },
  { id: 'clear', label: 'Clear selection', section: 'Other' },
];

type AuditTabProps = {
  entries: AuditEntry[];
  onViewWallet: (walletId: string) => void;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatAmount(n: number) {
  const prefix = n >= 0 ? '+' : '';
  return `${prefix}${n.toLocaleString()}`;
}

function exportJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditTab({ entries, onViewWallet }: AuditTabProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [txStatusFilter, setTxStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const typeOptions = useMemo(
    () => CREDIT_TRANSACTION_TYPES.map((t) => ({ value: t.toLowerCase(), label: t })),
    []
  );
  const accountTypeOptions = useMemo(
    () => uniqueOptions(entries.map((e) => e.accountType)),
    [entries]
  );
  const txStatusOptions = useMemo(
    () => uniqueOptions(entries.map((e) => e.transactionStatus)),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = entries.filter((a) => {
      if (typeFilter !== 'all' && a.type.toLowerCase() !== typeFilter) return false;
      if (accountTypeFilter !== 'all' && a.accountType.toLowerCase() !== accountTypeFilter) {
        return false;
      }
      if (txStatusFilter !== 'all' && a.transactionStatus.toLowerCase() !== txStatusFilter) {
        return false;
      }
      if (directionFilter === 'credit' && a.creditAmount < 0) return false;
      if (directionFilter === 'debit' && a.creditAmount >= 0) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.username.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q) ||
        a.transactionStatus.toLowerCase().includes(q) ||
        a.walletId.toLowerCase().includes(q) ||
        String(a.creditAmount).includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'amountHigh':
          return Math.abs(b.creditAmount) - Math.abs(a.creditAmount);
        case 'amountLow':
          return Math.abs(a.creditAmount) - Math.abs(b.creditAmount);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

    return list;
  }, [
    entries,
    search,
    typeFilter,
    accountTypeFilter,
    directionFilter,
    txStatusFilter,
    sortBy,
  ]);

  const visibleIds = filtered.map((e) => e.id);
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

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = (actionId: string) => {
    if (actionId === 'clear') {
      setSelectedIds(new Set());
      return;
    }
    if (actionId === 'export') {
      const selected = entries.filter((e) => selectedIds.has(e.id));
      if (!selected.length) return;
      exportJson(`audit-export-${Date.now()}.json`, selected);
      showSuccessToast(`Exported ${selected.length} audit entr${selected.length === 1 ? 'y' : 'ies'}`);
    }
  };

  const q = search.trim();
  const hasFilters =
    q ||
    typeFilter !== 'all' ||
    accountTypeFilter !== 'all' ||
    directionFilter !== 'all' ||
    txStatusFilter !== 'all';

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c]">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user / type / wallet / amount…"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white outline-none focus:ring-2 focus:ring-rose-500/15"
          />
        </div>
        <p className="text-xs text-zinc-500 sm:order-last sm:w-full lg:order-none lg:w-auto">
          {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
          {hasFilters ? ` matching filters (of ${entries.length})` : ''}
          {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
        </p>
        <div className="hidden flex-1 lg:block" />
        <TableFilterBar
          filters={[
            { id: 'type', label: 'Transaction type', value: typeFilter, options: typeOptions },
            {
              id: 'accountType',
              label: 'Account type',
              value: accountTypeFilter,
              options: accountTypeOptions,
            },
            {
              id: 'direction',
              label: 'Direction',
              value: directionFilter,
              options: [
                { value: 'credit', label: 'Credits in (+)' },
                { value: 'debit', label: 'Debits out (−)' },
              ],
            },
            {
              id: 'txStatus',
              label: 'Tx status',
              value: txStatusFilter,
              options: txStatusOptions,
            },
          ]}
          sort={{
            value: sortBy,
            options: [
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'amountHigh', label: 'Largest amount' },
              { value: 'amountLow', label: 'Smallest amount' },
              { value: 'name', label: 'Name A–Z' },
            ],
          }}
          onFilterChange={(id, value) => {
            if (id === 'type') setTypeFilter(value);
            if (id === 'accountType') setAccountTypeFilter(value);
            if (id === 'direction') setDirectionFilter(value);
            if (id === 'txStatus') setTxStatusFilter(value);
          }}
          onSortChange={setSortBy}
          onClear={() => {
            setTypeFilter('all');
            setAccountTypeFilter('all');
            setDirectionFilter('all');
            setTxStatusFilter('all');
            setSortBy('newest');
          }}
        />
        <BulkActionsMenu
          selectedCount={selectedIds.size}
          items={AUDIT_BULK_ITEMS}
          onAction={handleBulkAction}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
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
                  aria-label="Select all visible audit entries"
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                />
              </th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Account type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Credit amount</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const isChecked = selectedIds.has(a.id);
              return (
                <tr
                  key={a.id}
                  className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${
                    isChecked ? 'bg-rose-500/[0.07]' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(a.id)}
                      aria-label={`Select transaction ${a.id}`}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{a.name}</p>
                    <p className="text-[10px] text-zinc-600">@{a.username}</p>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{a.accountType}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        a.transactionStatus === 'Pending'
                          ? 'bg-amber-500/15 text-amber-200'
                          : a.transactionStatus === 'Cancelled'
                            ? 'bg-zinc-500/15 text-zinc-400'
                            : a.status === 'Deducted'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium tabular-nums ${
                      a.creditAmount >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {formatAmount(a.creditAmount)}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{a.type}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500">{formatDateTime(a.timestamp)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onViewWallet(a.walletId)}
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
                  No audit entries match your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
