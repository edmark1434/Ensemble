import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Search } from 'lucide-react';
import api from '@/lib/axios';
import { staffGet } from '@/lib/staffCache';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast.ts';
import type {
  AnalyticsRange,
  CashoutRow,
  FinanceOptions,
  InvoiceRow,
  LedgerKind,
  LedgerPage,
  MemberRef,
  SubscriptionRow,
  TopupRow,
} from '../analyticsTypes';
import { fmtCredits, fmtDateTime, fmtDay, fmtInt, fmtPhp, titleCase } from '../analyticsFormat';
import { StatusPill } from '../analyticsUi';

const BASE = '/api/admin/analytics/finance';
const PAGE_SIZE = 25;

type KindSpec = {
  id: LedgerKind;
  label: string;
  statuses: { value: string; label: string }[];
  dated: boolean;
  filter: 'channel' | 'plan';
  searchHint: string;
};

const LEDGER_KINDS: KindSpec[] = [
  {
    id: 'topups',
    label: 'Top-ups',
    statuses: [
      { value: 'paid', label: 'Paid' },
      { value: 'pending', label: 'Pending' },
      { value: 'failed', label: 'Failed or expired' },
    ],
    dated: true,
    filter: 'channel',
    searchHint: 'Reference, payment ID, member or email',
  },
  {
    id: 'invoices',
    label: 'Invoices',
    statuses: [
      { value: 'paid', label: 'Paid' },
      { value: 'failed', label: 'Failed' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'cancelled', label: 'Cancelled' },
    ],
    dated: true,
    filter: 'plan',
    searchHint: 'Member, email or cycle ID',
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    statuses: [
      { value: 'active', label: 'Active, renewing' },
      { value: 'canceling', label: 'Canceling at period end' },
      { value: 'trial', label: 'In trial' },
      { value: 'ended', label: 'Ended' },
    ],
    dated: false,
    filter: 'plan',
    searchHint: 'Member or email',
  },
  {
    id: 'cashouts',
    label: 'Cashouts',
    statuses: [
      { value: 'paid', label: 'Paid out' },
      { value: 'in_flight', label: 'In flight' },
      { value: 'failed', label: 'Failed or returned' },
    ],
    dated: true,
    filter: 'channel',
    searchHint: 'Reference, member or account name',
  },
];

const control =
  'rounded-lg border border-white/10 bg-[#0c0d12] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-500/40 focus:ring-2 focus:ring-rose-500/15';

function MemberCell({ member, email }: { member: MemberRef; email?: string | null }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium text-white">{member.name}</span>
      <span className="block truncate text-[11px] text-zinc-500">
        {[member.handle ? `@${member.handle}` : null, email].filter(Boolean).join(' · ') || '—'}
      </span>
    </span>
  );
}

function subscriptionStatus(row: SubscriptionRow) {
  if (String(row.status).toUpperCase() !== 'ACTIVE') return { status: 'ended', label: titleCase(row.status || 'Ended') };
  if (row.cancelAtPeriodEnd) return { status: 'pending', label: 'Canceling' };
  if (row.trialEndsAt && new Date(row.trialEndsAt).getTime() > Date.now()) return { status: 'trial', label: 'Trial' };
  return { status: 'active', label: 'Active' };
}

type Column = { label: string; align?: 'right' };

function tableFor(kind: LedgerKind, items: unknown[]): { columns: Column[]; rows: ReactNode[][] } {
  if (kind === 'topups') {
    return {
      columns: [{ label: 'Date' }, { label: 'Member' }, { label: 'Channel' }, { label: 'Amount', align: 'right' }, { label: 'Credits', align: 'right' }, { label: 'Status' }, { label: 'Reference' }],
      rows: (items as TopupRow[]).map((r) => [
        fmtDateTime(r.createdAt),
        <MemberCell key="m" member={r.member} email={r.email} />,
        r.channel || '—',
        fmtPhp(r.amountPhp),
        fmtCredits(r.credits),
        <StatusPill key="s" status={r.status} />,
        <span key="r" className="font-mono text-[11px] text-zinc-500" title={r.paymentId || undefined}>
          {r.referenceId}
        </span>,
      ]),
    };
  }
  if (kind === 'invoices') {
    return {
      columns: [{ label: 'Date' }, { label: 'Member' }, { label: 'Plan' }, { label: 'Amount', align: 'right' }, { label: 'Status' }, { label: 'Attempts', align: 'right' }, { label: 'Billing period' }],
      rows: (items as InvoiceRow[]).map((r) => [
        fmtDateTime(r.paidAt || r.failedAt || r.createdAt),
        <MemberCell key="m" member={r.member} email={r.email} />,
        r.plan,
        fmtPhp(r.amountPhp),
        <StatusPill key="s" status={r.status} />,
        fmtInt(r.attempts),
        r.periodStart ? `${fmtDay(r.periodStart, false)} – ${fmtDay(r.periodEnd)}` : '—',
      ]),
    };
  }
  if (kind === 'subscriptions') {
    return {
      columns: [{ label: 'Started' }, { label: 'Member' }, { label: 'Plan' }, { label: 'Status' }, { label: 'Next billing' }, { label: 'Billed so far', align: 'right' }],
      rows: (items as SubscriptionRow[]).map((r) => {
        const s = subscriptionStatus(r);
        return [
          fmtDay(r.startedAt),
          <MemberCell key="m" member={r.member} email={r.email} />,
          <span key="p">
            {r.plan}
            <span className="block text-[11px] text-zinc-500">
              {r.pricePhp > 0 ? `${fmtPhp(r.pricePhp)} / ${r.billingPeriod.toLowerCase()}` : 'Free'}
            </span>
          </span>,
          <StatusPill key="s" status={s.status} label={s.label} />,
          r.cancelAtPeriodEnd ? `Ends ${fmtDay(r.currentPeriodEnd)}` : fmtDay(r.nextBillingAt),
          fmtPhp(r.billedPhp),
        ];
      }),
    };
  }
  return {
    columns: [{ label: 'Requested' }, { label: 'Member' }, { label: 'Paid to' }, { label: 'Credits', align: 'right' }, { label: 'Net', align: 'right' }, { label: 'Fee', align: 'right' }, { label: 'Status' }],
    rows: (items as CashoutRow[]).map((r) => [
      fmtDateTime(r.createdAt),
      <MemberCell key="m" member={r.member} />,
      <span key="a">
        {r.channel || '—'}
        <span className="block text-[11px] text-zinc-500">{[r.accountNumber, r.accountName].filter(Boolean).join(' · ') || '—'}</span>
      </span>,
      fmtCredits(r.credits),
      fmtPhp(r.netPhp),
      fmtPhp(r.feePhp),
      <span key="s" title={r.failureCode || undefined}>
        <StatusPill status={r.status} />
      </span>,
    ]),
  };
}

function filenameFrom(disposition: string | undefined, fallback: string) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition || '');
  return match ? decodeURIComponent(match[1]) : fallback;
}

/**
 * Server-paged finance records. Remount it (via `key`) to switch kinds; filters reset then.
 */
export default function FinanceLedger({
  kind,
  range,
  onKindChange,
}: {
  kind: LedgerKind;
  range: AnalyticsRange;
  onKindChange: (kind: LedgerKind) => void;
}) {
  const spec = LEDGER_KINDS.find((k) => k.id === kind) || LEDGER_KINDS[0];
  const [status, setStatus] = useState('all');
  const [filterValue, setFilterValue] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [onlyPeriod, setOnlyPeriod] = useState(true);
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState<FinanceOptions | null>(null);
  const [result, setResult] = useState<{ key: string; data: LedgerPage<unknown> } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [exporting, setExporting] = useState(false);

  // A new overview range returns the list to its first page.
  const rangeKey = `${range.from}:${range.to}`;
  const [seenRange, setSeenRange] = useState(rangeKey);
  if (seenRange !== rangeKey) {
    setSeenRange(rangeKey);
    setPage(1);
  }

  useEffect(() => {
    const next = searchInput.trim();
    if (next === search) return;
    const id = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput, search]);

  useEffect(() => {
    let cancelled = false;
    staffGet(`${BASE}/options`)
      .then((res) => {
        if (!cancelled && res.data?.success) setOptions(res.data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const filterParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (status !== 'all') params.status = status;
    if (filterValue !== 'all') params[spec.filter] = filterValue;
    if (search) params.search = search;
    if (spec.dated && onlyPeriod && range.key !== 'all') {
      params.from = range.from;
      params.to = range.to;
    }
    return params;
  }, [status, filterValue, search, spec, onlyPeriod, range.key, range.from, range.to]);

  const requestParams = useMemo(() => ({ ...filterParams, page: String(page), limit: String(PAGE_SIZE) }), [filterParams, page]);
  const requestKey = `${kind}?${new URLSearchParams(requestParams).toString()}`;

  useEffect(() => {
    let cancelled = false;
    staffGet(`${BASE}/${kind}`, requestParams)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.success) setResult({ key: requestKey, data: res.data.data });
        else setFailure({ key: requestKey, message: res.data?.message || 'Could not load records.' });
      })
      .catch((err) => {
        if (!cancelled) setFailure({ key: requestKey, message: err?.response?.data?.message || 'Could not load records.' });
      });
    return () => {
      cancelled = true;
    };
  }, [kind, requestKey, requestParams]);

  const current = result?.data;
  const loading = result?.key !== requestKey && failure?.key !== requestKey;
  const error = failure?.key === requestKey ? failure.message : '';
  const { columns, rows } = tableFor(kind, current?.items || []);
  const filterChoices =
    spec.filter === 'plan'
      ? (options?.plans || []).map((p) => ({ value: p.planId, label: p.paid ? p.name : `${p.name} (free)` }))
      : (kind === 'topups' ? options?.topupChannels : options?.cashoutChannels)?.map((c) => ({ value: c, label: c })) || [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get(`${BASE}/${kind}`, { params: { ...filterParams, format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filenameFrom(String(res.headers['content-disposition'] ?? ''), `ensemble-${kind}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      const rowsOut = Number(res.headers['x-export-rows']);
      const totalOut = Number(res.headers['x-export-total']);
      showSuccessToast(
        Number.isFinite(rowsOut) && Number.isFinite(totalOut) && totalOut > rowsOut
          ? `Exported the newest ${fmtInt(rowsOut)} of ${fmtInt(totalOut)} rows. Narrow the filters to get the rest.`
          : 'CSV downloaded.'
      );
    } catch {
      showErrorToast('Could not export. Check the filters and try again.');
    } finally {
      setExporting(false);
    }
  };

  const first = current && current.total ? (current.page - 1) * current.limit + 1 : 0;
  const last = current ? Math.min(current.total, current.page * current.limit) : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#12131a]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Records</h3>
          <p className="text-xs text-zinc-500">Searched and paged on the server, so every record is reachable.</p>
        </div>
        <div role="tablist" aria-label="Record type" className="flex flex-wrap gap-1 rounded-xl bg-[#0c0d12] p-1">
          {LEDGER_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={k.id === kind}
              onClick={() => k.id !== kind && onKindChange(k.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                k.id === kind ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-5 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            maxLength={100}
            placeholder={spec.searchHint}
            aria-label="Search records"
            className={`${control} w-full pl-9`}
          />
        </div>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className={control}
        >
          <option value="all">All statuses</option>
          {spec.statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          aria-label={spec.filter === 'plan' ? 'Plan' : 'Channel'}
          value={filterValue}
          onChange={(e) => {
            setFilterValue(e.target.value);
            setPage(1);
          }}
          className={control}
        >
          <option value="all">{spec.filter === 'plan' ? 'All paid plans' : 'All channels'}</option>
          {filterChoices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {spec.dated && range.key !== 'all' && (
          <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={onlyPeriod}
              onChange={(e) => {
                setOnlyPeriod(e.target.checked);
                setPage(1);
              }}
              className="h-3.5 w-3.5 accent-rose-500"
            />
            {range.key === 'custom' ? 'Only the selected dates' : `Only ${range.label.charAt(0).toLowerCase()}${range.label.slice(1)}`}
          </label>
        )}
        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={exporting || !current?.total}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-white/20 hover:text-white disabled:opacity-40"
          title="Download these filters as CSV (up to 5,000 rows)"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export CSV
        </button>
      </div>

      {error && <p className="border-b border-white/[0.06] bg-rose-500/[0.06] px-5 py-3 text-sm text-rose-200">{error}</p>}

      <div className={`overflow-x-auto transition-opacity ${loading && current ? 'opacity-60' : ''}`} aria-busy={loading}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-[#0c0d12] text-[10px] uppercase tracking-wide text-zinc-500">
              {columns.map((c) => (
                <th key={c.label} className={`px-5 py-2.5 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!current && loading
              ? Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td colSpan={columns.length} className="px-5 py-3">
                      <div className="console-skeleton h-4 rounded bg-white/[0.04]" />
                    </td>
                  </tr>
                ))
              : rows.map((row, i) => (
                  <tr key={i} className="border-b border-white/[0.04] text-zinc-300 last:border-0 hover:bg-white/[0.02]">
                    {row.map((cell, j) => (
                      <td key={j} className={`max-w-[280px] px-5 py-2.5 align-top ${columns[j]?.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
            {current && !rows.length && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-sm text-zinc-500">
                  No records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-3 text-xs text-zinc-500">
        <span className="tabular-nums">
          {current
            ? `${fmtInt(first)}–${fmtInt(last)} of ${fmtInt(current.total)}${current.sumPhp != null ? ` · ${fmtPhp(current.sumPhp)} total` : ''}`
            : 'Loading…'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!current || current.page <= 1}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-300 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular-nums">
            Page {fmtInt(current?.page ?? page)} of {fmtInt(current?.pages ?? 1)}
          </span>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setPage((p) => p + 1)}
            disabled={!current || current.page >= current.pages}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-300 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
