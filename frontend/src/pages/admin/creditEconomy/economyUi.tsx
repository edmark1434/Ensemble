import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import api from '@/lib/axios';
import { peekStaffGet, staffGet } from '@/lib/staffCache';
import type { EconomyVariant, LedgerBalance, LedgerEntry, LedgerParty, Page } from './creditEconomyTypes';

export const ECONOMY_API = {
  overview: '/api/admin/economy-overview',
  wallets: '/api/admin/economy/wallets',
  wallet: (walletId: string) => `/api/admin/economy/wallets/${walletId}`,
  ledger: '/api/admin/economy/ledger',
  ledgerEntry: (transactionId: string) => `/api/admin/economy/ledger/${transactionId}`,
};

/** YYYY-MM-DD of a date in the viewer's own time zone (date inputs and ledger From / To). */
export function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localDateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDate(d);
}

/** Copyable id: the full value, a copy icon, and a check once copied. */
export function CopyId({ value, label, className = '' }: { value: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        });
      }}
      className={`inline-flex min-w-0 items-center gap-1 font-mono text-[10px] text-zinc-500 hover:text-zinc-200 ${className}`}
      title={`Copy ${value}`}
    >
      <span className="truncate">{label ?? value}</span>
      {done ? <Check className="h-3 w-3 shrink-0 text-emerald-400" /> : <Copy className="h-3 w-3 shrink-0" />}
    </button>
  );
}

/** Per-console accent, mirroring the admin (rose) and Support Moderator (sky) themes. */
export const ECONOMY_ACCENT: Record<
  EconomyVariant,
  { label: string; tab: string; ring: string; spinner: string; chip: string; check: string; row: string }
> = {
  admin: {
    label: 'text-rose-400/80',
    tab: 'border-rose-400 text-white',
    ring: 'focus:ring-rose-500/15',
    spinner: 'text-rose-400',
    chip: 'bg-rose-500/15 text-rose-200',
    check: 'accent-rose-500',
    row: 'bg-rose-500/[0.07]',
  },
  support: {
    label: 'text-sky-400/80',
    tab: 'border-sky-400 text-white',
    ring: 'focus:ring-sky-500/15',
    spinner: 'text-sky-400',
    chip: 'bg-sky-500/15 text-sky-200',
    check: 'accent-sky-500',
    row: 'bg-sky-500/[0.07]',
  },
};

export function formatCredits(n: number | null | undefined) {
  return Number(n || 0).toLocaleString();
}

export function formatSigned(n: number | null | undefined) {
  const v = Number(n || 0);
  if (v > 0) return `+${v.toLocaleString()}`;
  if (v < 0) return `−${Math.abs(v).toLocaleString()}`;
  return '0';
}

export function formatPhp(credits: number, creditValuePhp: number | null) {
  if (!creditValuePhp) return null;
  return `≈ ₱${(credits * creditValuePhp).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRelative(value?: string | null) {
  if (!value) return '—';
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '—';
  const future = diff < 0;
  const sec = Math.abs(diff) / 1000;
  const unit =
    sec < 60 ? 'just now'
      : sec < 3600 ? `${Math.floor(sec / 60)} min`
        : sec < 86400 ? `${Math.floor(sec / 3600)} hr`
          : `${Math.floor(sec / 86400)} d`;
  if (unit === 'just now') return unit;
  return future ? `in ${unit}` : `${unit} ago`;
}

export function shortId(id?: string | null) {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-white/[0.08] bg-[#14151c] ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-white">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'text-white',
  icon,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: string;
  icon?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
        {icon}
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
    </>
  );
  const base = 'rounded-2xl border border-white/[0.08] bg-[#14151c] p-4 text-left';
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${base} transition hover:border-white/20`}>
        {body}
      </button>
    );
  }
  return <div className={base}>{body}</div>;
}

const STATUS_TONE: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-300',
  pending: 'bg-amber-500/15 text-amber-200',
  processing: 'bg-amber-500/15 text-amber-200',
  'on hold': 'bg-amber-500/15 text-amber-200',
  failed: 'bg-red-500/15 text-red-300',
  cancelled: 'bg-red-500/15 text-red-300',
  canceled: 'bg-red-500/15 text-red-300',
  reversed: 'bg-violet-500/15 text-violet-200',
  active: 'bg-emerald-500/15 text-emerald-300',
  suspended: 'bg-amber-500/15 text-amber-200',
  banned: 'bg-red-500/15 text-red-300',
  locked: 'bg-orange-500/15 text-orange-200',
  deactivated: 'bg-zinc-500/15 text-zinc-300',
};

export function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[String(status || '').toLowerCase()] || 'bg-zinc-500/15 text-zinc-300';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{status || '—'}</span>;
}

export function HoldPill({ overdue }: { overdue?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
        overdue ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-200'
      }`}
    >
      {overdue ? 'Hold overdue' : 'On hold'}
    </span>
  );
}

export function PartyCell({ party }: { party: LedgerParty }) {
  const sub =
    party.walletType === 'Platform'
      ? 'Platform'
      : [party.handle ? `@${party.handle}` : null, party.walletType !== 'Account' ? `${party.walletType} wallet` : null]
          .filter(Boolean)
          .join(' · ');
  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-white">
        {party.name}
        {party.isStaff && <span className="ml-1 text-[10px] text-violet-300">Staff</span>}
      </p>
      <p className="truncate text-[10px] text-zinc-600">{sub || party.accountType || '—'}</p>
    </div>
  );
}

/** Amount cell: signed when the list is scoped to one wallet, otherwise unsigned. */
export function LedgerAmount({ entry }: { entry: LedgerEntry }) {
  if (entry.signedAmount != null) {
    const tone = entry.signedAmount > 0 ? 'text-emerald-400' : entry.signedAmount < 0 ? 'text-red-400' : 'text-zinc-300';
    return <span className={`font-semibold tabular-nums ${tone}`}>{formatSigned(entry.signedAmount)}</span>;
  }
  if (entry.isAdjustment) {
    return (
      <span className="font-semibold tabular-nums text-zinc-300" title="Direction not recorded">
        ±{formatCredits(entry.amount)}
      </span>
    );
  }
  return <span className="font-semibold tabular-nums text-white">{formatCredits(entry.amount)}</span>;
}

/** "1,200 → 850" (or "≈ 1,200 → 850") for a wallet's spendable credits around one row. */
export function balanceChangeText(balance: LedgerBalance) {
  return `${balance.approximate ? '≈ ' : ''}${formatCredits(balance.before)} → ${formatCredits(balance.after)}`;
}

export function balanceChangeTitle(balance: LedgerBalance) {
  const held =
    balance.heldBefore !== balance.heldAfter
      ? ` On hold: ${formatCredits(balance.heldBefore)} → ${formatCredits(balance.heldAfter)}.`
      : '';
  const approx = balance.approximate ? ' Approximate: an older adjustment on this wallet has no recorded direction.' : '';
  return `Spendable balance: ${formatCredits(balance.before)} before, ${formatCredits(balance.after)} after.${held}${approx}`;
}

/**
 * A wallet's balance just before and after a ledger row: "Bal 1,200 → 850", the new balance
 * green when it grew and red when it shrank, plus held credits when a hold moved them.
 */
export function BalanceChange({ balance, label = 'Bal' }: { balance: LedgerBalance | null | undefined; label?: string | null }) {
  if (!balance) return null;
  const delta = balance.after - balance.before;
  const tone = delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-red-300' : 'text-zinc-400';
  return (
    <span className="mt-0.5 block whitespace-nowrap text-[10px] tabular-nums text-zinc-500" title={balanceChangeTitle(balance)}>
      {label && <span className="text-zinc-600">{label} </span>}
      {balance.approximate ? '≈ ' : ''}
      {formatCredits(balance.before)} → <span className={tone}>{formatCredits(balance.after)}</span>
      {balance.heldBefore !== balance.heldAfter && (
        <span className="text-amber-300/80">
          {' '}· held {formatCredits(balance.heldBefore)} → {formatCredits(balance.heldAfter)}
        </span>
      )}
    </span>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-zinc-500">
        {children}
      </td>
    </tr>
  );
}

export function Pager({
  total,
  limit,
  offset,
  onChange,
  loading,
}: {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => void;
  loading?: boolean;
}) {
  if (total <= 0) return null;
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3 text-xs text-zinc-500">
      <span>
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={loading || offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-zinc-300 hover:text-white disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <button
          type="button"
          disabled={loading || to >= total}
          onClick={() => onChange(offset + limit)}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-zinc-300 hover:text-white disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

type Params = Record<string, string | number | undefined>;

function cleanParams(params: Params) {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'all') continue;
    out[key] = value;
  }
  return out;
}

/**
 * Server-paged list through the staff cache: renders the cached page at once, refetches,
 * and drops responses that arrive after a newer request started.
 */
export function usePagedList<T>(url: string, params: Params, refreshToken = 0) {
  const clean = cleanParams(params);
  const key = JSON.stringify(clean);
  const cached = peekStaffGet(url, clean)?.data;
  const [page, setPage] = useState<Page<T> | null>(cached?.success ? cached.data : null);
  const [loading, setLoading] = useState(!page);
  const [error, setError] = useState('');
  const seq = useRef(0);

  const load = useCallback(async () => {
    const id = ++seq.current;
    const parsed = JSON.parse(key) as Record<string, string | number>;
    const hit = peekStaffGet(url, parsed)?.data;
    if (hit?.success) setPage(hit.data);
    setLoading(true);
    setError('');
    try {
      const res = await staffGet(url, parsed);
      if (id !== seq.current) return;
      if (res.data?.success) setPage(res.data.data);
      else setError(res.data?.message || 'Failed to load');
    } catch (err) {
      if (id !== seq.current) return;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to load');
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, [url, key]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  return { page, loading, error, reload: load };
}

/**
 * Every row of a server-paged list for a CSV export (100 per request, up to `max`).
 * Uncached: an export is a one-off read.
 */
export async function fetchAllPages<T>(
  url: string,
  params: Params,
  { max = 5000, onProgress }: { max?: number; onProgress?: (done: number, total: number) => void } = {}
) {
  const clean = cleanParams(params);
  delete clean.limit;
  delete clean.offset;
  const items: T[] = [];
  let total = 0;
  for (let offset = 0; offset < max; offset += 100) {
    const res = await api.get(url, { params: { ...clean, limit: 100, offset } });
    if (!res.data?.success) throw new Error(res.data?.message || 'Export failed');
    const page = res.data.data as Page<T>;
    total = page.total;
    items.push(...page.items);
    onProgress?.(items.length, Math.min(total, max));
    if (page.items.length < 100 || items.length >= total) break;
  }
  return { items: items.slice(0, max), total, truncated: total > max };
}

/** Debounced copy of a value, for search boxes that hit the server. */
export function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function csvCell(value: unknown) {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const INPUT =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600 focus:ring-2';

export const SELECT =
  'rounded-xl border border-white/[0.08] bg-[#0f1016] px-3 py-2 text-xs text-zinc-200 outline-none focus:border-white/20';
