import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Ban,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/axios';
import type { AccountActivityItem } from '@/pages/admin/userTeam/userTeamTypes';
import { StatCard, type Accent } from './ui';

type ViolationRow = {
  id: string;
  number?: string;
  account: {
    accountId: string;
    name: string;
    handle: string;
    status: string;
  };
  type: string;
  reason?: string | null;
  points: number;
  status: string;
  issuedBy: string;
  createdAt: string;
  expiresAt?: string | null;
  active?: boolean;
};

type RestrictedAccount = {
  accountId: string;
  name: string;
  handle: string;
  status: string;
};

type RestrictionsPayload = {
  violations: ViolationRow[];
  restrictedAccounts: RestrictedAccount[];
  recentActivity?: AccountActivityItem[];
};

const ACCENT_BTN: Record<Accent, string> = {
  sky: 'border-sky-500/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25',
  violet: 'border-violet-500/40 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25',
  emerald: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25',
  rose: 'border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25',
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusClass(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'banned') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (s === 'suspended' || s === 'locked') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (s === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  return 'border-white/10 bg-white/[0.04] text-zinc-300';
}

export default function ModeratorRestrictionsDesk({
  endpointBase,
  accent = 'sky',
  roleLabel,
  subtitle,
}: {
  endpointBase: string;
  accent?: Accent;
  roleLabel: string;
  subtitle: string;
}) {
  const [data, setData] = useState<RestrictionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [warnForm, setWarnForm] = useState({
    accountId: '',
    type: 'Community warning',
    reason: '',
    points: '1',
  });
  const [submittingWarn, setSubmittingWarn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpointBase);
      setData(res.data?.data || { violations: [], restrictedAccounts: [], recentActivity: [] });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load restrictions';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpointBase]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredViolations = useMemo(() => {
    const list = data?.violations || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((v) =>
      [v.account.name, v.account.handle, v.type, v.reason, v.number, v.status]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q))
    );
  }, [data?.violations, query]);

  const filteredRestricted = useMemo(() => {
    const list = data?.restrictedAccounts || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) =>
      [a.name, a.handle, a.status].some((part) => String(part).toLowerCase().includes(q))
    );
  }, [data?.restrictedAccounts, query]);

  async function setAccountStatus(accountId: string, status: string) {
    setBusyId(accountId);
    try {
      const res = await api.patch(`${endpointBase}/accounts/${accountId}`, { status });
      setData(res.data?.data || null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update account status';
      setError(message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitWarning(e: FormEvent) {
    e.preventDefault();
    if (!warnForm.accountId.trim() || !warnForm.type.trim()) return;
    setSubmittingWarn(true);
    setError(null);
    try {
      const res = await api.post(`${endpointBase}/violations`, {
        accountId: warnForm.accountId.trim(),
        type: warnForm.type.trim(),
        reason: warnForm.reason.trim() || undefined,
        points: Number(warnForm.points) || 1,
      });
      setData(res.data?.data || null);
      setWarnForm((prev) => ({ ...prev, reason: '', points: '1' }));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to issue violation';
      setError(message);
    } finally {
      setSubmittingWarn(false);
    }
  }

  const activeViolations = (data?.violations || []).filter((v) => v.active !== false).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{roleLabel}</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Restrictions & activity</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Active violations"
          value={activeViolations}
          sub="Still counting against accounts"
          icon={AlertTriangle}
          accent={accent}
        />
        <StatCard
          label="Restricted accounts"
          value={data?.restrictedAccounts?.length || 0}
          sub="Suspended, banned, or locked"
          icon={Ban}
          accent={accent}
        />
        <StatCard
          label="Recent activity"
          value={data?.recentActivity?.length || 0}
          sub="Latest moderation timeline events"
          icon={Activity}
          accent={accent}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Issue violation</h2>
            <ShieldAlert className="h-4 w-4 text-zinc-500" />
          </div>
          <form onSubmit={submitWarning} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Account ID
              <input
                value={warnForm.accountId}
                onChange={(e) => setWarnForm((p) => ({ ...p, accountId: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                placeholder="UUID of the account"
                required
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Type
              <input
                value={warnForm.type}
                onChange={(e) => setWarnForm((p) => ({ ...p, type: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                required
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Points
              <input
                type="number"
                min={1}
                max={20}
                value={warnForm.points}
                onChange={(e) => setWarnForm((p) => ({ ...p, points: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
              />
            </label>
            <label className="block text-xs text-zinc-500 sm:col-span-2">
              Reason
              <textarea
                value={warnForm.reason}
                onChange={(e) => setWarnForm((p) => ({ ...p, reason: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                placeholder="What happened and why this strike applies"
              />
            </label>
            <button
              type="submit"
              disabled={submittingWarn}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50 sm:col-span-2 ${ACCENT_BTN[accent]}`}
            >
              {submittingWarn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Issue violation & log activity
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Account activity feed</h2>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">Live from account_activity</span>
          </div>
          {loading && !data ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (data?.recentActivity || []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-zinc-500">
              No activity events yet. Warnings, status changes, and pardons will appear here.
            </p>
          ) : (
            <ul className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {(data?.recentActivity || []).map((item) => (
                <li key={item.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{item.action}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.accountName || item.accountHandle || item.accountId}
                        {item.actorName ? ` · by ${item.actorName}` : ''}
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                      {item.eventCode.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-zinc-600">{formatDateTime(item.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter violations and restricted accounts…"
          className="w-full rounded-xl border border-white/10 bg-[#14151c] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-white/25"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Violations</h2>
          {loading && !data ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filteredViolations.length === 0 ? (
            <p className="text-sm text-zinc-500">No violations found.</p>
          ) : (
            <ul className="space-y-3">
              {filteredViolations.map((v) => (
                <li key={v.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{v.type}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {v.account.name} · @{v.account.handle} · {v.number || v.id.slice(0, 8)}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass(v.status)}`}>
                      {v.status}
                    </span>
                  </div>
                  {v.reason ? <p className="mt-2 text-sm text-zinc-400">{v.reason}</p> : null}
                  <p className="mt-2 text-[11px] text-zinc-600">
                    +{v.points} pts · by {v.issuedBy} · {formatDateTime(v.createdAt)}
                    {v.expiresAt ? ` · expires ${formatDateTime(v.expiresAt)}` : ''}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === v.account.accountId}
                      onClick={() => void setAccountStatus(v.account.accountId, 'suspended')}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 disabled:opacity-50"
                    >
                      Suspend account
                    </button>
                    <button
                      type="button"
                      disabled={busyId === v.account.accountId}
                      onClick={() => void setAccountStatus(v.account.accountId, 'banned')}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-300 disabled:opacity-50"
                    >
                      Ban account
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Restricted accounts</h2>
          {loading && !data ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filteredRestricted.length === 0 ? (
            <p className="text-sm text-zinc-500">No restricted accounts.</p>
          ) : (
            <ul className="space-y-3">
              {filteredRestricted.map((a) => (
                <li key={a.accountId} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{a.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">@{a.handle}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass(a.status)}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === a.accountId}
                      onClick={() => void setAccountStatus(a.accountId, 'active')}
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 disabled:opacity-50"
                    >
                      Restore active
                    </button>
                    <button
                      type="button"
                      disabled={busyId === a.accountId}
                      onClick={() => {
                        setWarnForm((p) => ({ ...p, accountId: a.accountId }));
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300 disabled:opacity-50"
                    >
                      Use for new violation
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
