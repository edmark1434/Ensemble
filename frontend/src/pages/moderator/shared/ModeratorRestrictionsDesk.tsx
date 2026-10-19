import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Ban, Loader2, RefreshCw, Search, ShieldAlert, Activity, AlertTriangle, Clock } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import type { AccountActivityItem } from '@/pages/admin/userTeam/userTeamTypes';
import { SanctionScheduleFields, type SanctionTiming } from '@/pages/admin/userTeam/components/SanctionSchedule';
import { getUserTeamCapabilities, type UserTeamVariant } from '@/pages/admin/userTeam/userTeamCapabilities';
import { StatCard, type Accent } from './ui';

type DeskAccount = {
  accountId: string;
  name: string;
  handle: string;
  email?: string | null;
  legalName?: string | null;
  type?: string | null;
  status: string;
  forumTimeout?: boolean;
  suspensionEndsAt?: string | null;
  banEndsAt?: string | null;
  lockEndsAt?: string | null;
  timeoutEndsAt?: string | null;
};

type ViolationRow = {
  id: string;
  number?: string;
  account: DeskAccount;
  type: string;
  reason?: string | null;
  points: number;
  status: string;
  issuedBy: string;
  createdAt: string;
  expiresAt?: string | null;
  active?: boolean;
};

type RestrictionsPayload = {
  violations: ViolationRow[];
  restrictedAccounts: DeskAccount[];
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
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusClass(status: string) {
  const s = String(status || '').toLowerCase();
  if (s === 'banned' || s === 'rescinded') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (s === 'suspended' || s === 'locked') return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  if (s === 'active') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  if (s === 'expired') return 'border-white/10 bg-white/[0.04] text-zinc-400';
  return 'border-white/10 bg-white/[0.04] text-zinc-300';
}

function untilLabel(value: string | null | undefined, permanent: string) {
  return value ? formatDateTime(value) : permanent;
}

function standingLines(account: DeskAccount) {
  const status = String(account.status || '').toLowerCase();
  const lines = [
    status === 'banned'
      ? `Banned until ${untilLabel(account.banEndsAt, 'staff remove it')}`
      : status === 'suspended'
        ? `Suspended until ${untilLabel(account.suspensionEndsAt, 'staff remove it')}`
        : status === 'locked'
          ? `Locked until ${untilLabel(account.lockEndsAt, 'staff remove it')}`
          : 'Account status is Active',
  ];
  if (account.forumTimeout) {
    lines.push(`Forum timeout until ${untilLabel(account.timeoutEndsAt, 'staff remove it')}`);
  }
  return lines;
}

function apiMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

function AccountSearch({
  endpointBase,
  selected,
  onSelect,
}: {
  endpointBase: string;
  selected: DeskAccount | null;
  onSelect: (account: DeskAccount | null) => void;
}) {
  const [text, setText] = useState('');
  const [results, setResults] = useState<DeskAccount[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const query = text.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const current = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`${endpointBase}/lookup`, { params: { q: query } });
        if (current !== requestId.current) return;
        setResults(res.data?.data || []);
        setHighlight(0);
        setOpen(true);
      } catch (err: unknown) {
        if (current !== requestId.current) return;
        setResults([]);
        showErrorToast(apiMessage(err, 'Account search failed'));
      } finally {
        if (current === requestId.current) setSearching(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [endpointBase, text]);

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    return () => document.removeEventListener('mousedown', onPointer);
  }, []);

  function choose(account: DeskAccount) {
    onSelect(account);
    setText('');
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const account = results[highlight];
      if (account) choose(account);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="block text-xs text-zinc-500">
        Find account
        <div className="relative mt-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder="Name, email, handle, or account id"
            className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-10 text-sm text-white outline-none focus:border-white/25"
            autoComplete="off"
          />
          {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" /> : null}
        </div>
      </label>
      <p className="mt-1 text-[11px] text-zinc-600">Type at least two characters. Arrow keys move, Enter selects.</p>
      {open && text.trim().length >= 2 && (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#12131a] p-1 shadow-2xl">
          {results.length === 0 && !searching ? (
            <li className="px-3 py-3 text-sm text-zinc-500">No accounts match that search.</li>
          ) : (
            results.map((account, index) => (
              <li key={account.accountId}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(account)}
                  className={`w-full rounded-lg px-3 py-2 text-left ${index === highlight ? 'bg-white/[0.06]' : ''}`}
                >
                  <p className="text-sm text-white">{account.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    @{account.handle || 'no-handle'}
                    {account.email ? ` · ${account.email}` : ''}
                    {account.legalName ? ` · ${account.legalName}` : ''}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
      {selected ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">{selected.name}</p>
              <p className="mt-1 text-xs text-zinc-400">
                @{selected.handle || 'no-handle'}
                {selected.email ? ` · ${selected.email}` : ' · No email'}
              </p>
            </div>
            <button type="button" onClick={() => onSelect(null)} className="text-xs text-zinc-400 hover:text-white">
              Clear
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ModeratorRestrictionsDesk({
  endpointBase,
  accent = 'sky',
  roleLabel,
  subtitle,
  variant = 'support',
}: {
  endpointBase: string;
  accent?: Accent;
  roleLabel: string;
  subtitle: string;
  variant?: UserTeamVariant;
}) {
  const caps = useMemo(() => getUserTeamCapabilities(variant), [variant]);
  const [data, setData] = useState<RestrictionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DeskAccount | null>(null);
  const [warnForm, setWarnForm] = useState({ type: 'Community warning', reason: '', points: '1' });
  const [warnTiming, setWarnTiming] = useState<SanctionTiming>({ duration: 'temporary', endsAt: null, summary: '' });
  const [sanctionTiming, setSanctionTiming] = useState<SanctionTiming>({ duration: 'temporary', endsAt: null, summary: '' });
  const [submittingWarn, setSubmittingWarn] = useState(false);
  const workRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(endpointBase);
      setData(res.data?.data || { violations: [], restrictedAccounts: [], recentActivity: [] });
    } catch (err: unknown) {
      setError(apiMessage(err, 'Failed to load restrictions'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpointBase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelected((current) => {
      if (!current || !data) return current;
      return (
        data.restrictedAccounts.find((account) => account.accountId === current.accountId) ||
        data.violations.find((row) => row.account.accountId === current.accountId)?.account ||
        current
      );
    });
  }, [data]);

  function focusAccount(account: DeskAccount) {
    setSelected(account);
    workRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const filteredViolations = useMemo(() => {
    const list = data?.violations || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) =>
      [
        row.account.name,
        row.account.handle,
        row.account.email,
        row.account.legalName,
        row.account.type,
        row.account.status,
        row.type,
        row.reason,
        row.number,
        row.status,
        row.issuedBy,
      ]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q))
    );
  }, [data?.violations, query]);

  const filteredRestricted = useMemo(() => {
    const list = data?.restrictedAccounts || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((account) =>
      [account.name, account.handle, account.email, account.legalName, account.type, account.status]
        .filter(Boolean)
        .some((part) => String(part).toLowerCase().includes(q))
    );
  }, [data?.restrictedAccounts, query]);

  async function runAction(action: string) {
    if (!selected) return;
    const removing = ['unsuspend', 'unban', 'unlock', 'clear_timeout'].includes(action);
    if (!removing && sanctionTiming.duration === 'temporary' && !sanctionTiming.endsAt) {
      showErrorToast(sanctionTiming.summary || 'Choose how long this lasts');
      return;
    }
    setBusyId(selected.accountId);
    try {
      const res = await api.patch(`${endpointBase}/accounts/${selected.accountId}`, {
        action,
        duration: removing ? undefined : sanctionTiming.duration,
        endsAt: removing ? undefined : sanctionTiming.endsAt,
      });
      setData(res.data?.data || null);
      showSuccessToast('Account standing updated');
    } catch (err: unknown) {
      const message = apiMessage(err, 'Failed to update account status');
      setError(message);
      showErrorToast(message);
    } finally {
      setBusyId(null);
    }
  }

  async function rescindDeskWarning(accountId: string, violationId: string) {
    setBusyId(violationId);
    try {
      await api.post(`/api/admin/accounts/${accountId}/warnings/${violationId}/rescind`);
      showSuccessToast('Warning rescinded. It stays on the record and no longer counts.');
      await load();
    } catch (err: unknown) {
      const message = apiMessage(err, 'Failed to rescind warning');
      setError(message);
      showErrorToast(message);
    } finally {
      setBusyId(null);
    }
  }

  async function submitWarning(event: FormEvent) {
    event.preventDefault();
    if (!selected || !warnForm.type.trim()) return;
    if (warnTiming.duration === 'temporary' && !warnTiming.endsAt) {
      showErrorToast(warnTiming.summary || 'Choose how long this warning lasts');
      return;
    }
    setSubmittingWarn(true);
    setError(null);
    try {
      const res = await api.post(`${endpointBase}/violations`, {
        accountId: selected.accountId,
        type: warnForm.type.trim(),
        reason: warnForm.reason.trim() || undefined,
        points: Number(warnForm.points) || 1,
        duration: warnTiming.duration,
        endsAt: warnTiming.endsAt,
      });
      setData(res.data?.data || null);
      setWarnForm((prev) => ({ ...prev, reason: '', points: '1' }));
      showSuccessToast('Warning issued');
    } catch (err: unknown) {
      const message = apiMessage(err, 'Failed to issue violation');
      setError(message);
      showErrorToast(message);
    } finally {
      setSubmittingWarn(false);
    }
  }

  const activeViolations = (data?.violations || []).filter((row) => row.active !== false).length;
  const timeoutCount = (data?.restrictedAccounts || []).filter((account) => account.forumTimeout).length;
  const standing = String(selected?.status || '').toLowerCase();
  const can = (action: string) => caps.statusActions.has(action);

  return (
    <main className="relative z-10 min-h-screen min-w-0 overflow-x-hidden px-6 py-8 md:pl-[260px] md:px-10">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{roleLabel}</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Restrictions</h1>
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active warnings" value={activeViolations} sub="Still counting toward auto-suspend" icon={AlertTriangle} accent={accent} />
          <StatCard label="Held accounts" value={data?.restrictedAccounts?.length || 0} sub="Banned, suspended, locked, or timed out" icon={Ban} accent={accent} />
          <StatCard label="Forum timeouts" value={timeoutCount} sub="Forum writes blocked, rest of Ensemble open" icon={Clock} accent={accent} />
          <StatCard label="Recent activity" value={data?.recentActivity?.length || 0} sub="Latest standing changes" icon={Activity} accent={accent} />
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        <section ref={workRef} className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Work an account</h2>
              <p className="mt-1 text-xs text-zinc-500">Search first, then issue a warning or change standing.</p>
            </div>
            <ShieldAlert className="h-4 w-4 text-zinc-500" />
          </div>
          <AccountSearch endpointBase={endpointBase} selected={selected} onSelect={setSelected} />

          {selected ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ['Email', selected.email || 'No email on file'],
                ['Legal name', selected.legalName || '—'],
                ['Account type', selected.type || '—'],
                ['Standing', standingLines(selected).join(' · ')],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                  <p className="mt-1 text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-sm text-zinc-500">
              Search by display name, legal name, email, handle, account type, or account id.
            </p>
          )}

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <form onSubmit={submitWarning} className="space-y-3 rounded-xl border border-white/[0.06] p-4">
              <h3 className="text-sm font-medium text-white">Issue warning</h3>
              <label className="block text-xs text-zinc-500">
                Type
                <input
                  value={warnForm.type}
                  onChange={(event) => setWarnForm((prev) => ({ ...prev, type: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="block text-xs text-zinc-500">
                  Reason
                  <textarea
                    value={warnForm.reason}
                    onChange={(event) => setWarnForm((prev) => ({ ...prev, reason: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                    placeholder="What happened"
                  />
                </label>
                <label className="block text-xs text-zinc-500">
                  Points
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={warnForm.points}
                    onChange={(event) => setWarnForm((prev) => ({ ...prev, points: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-white/25"
                  />
                </label>
              </div>
              <SanctionScheduleFields defaultDuration="temporary" onChange={setWarnTiming} />
              <button
                type="submit"
                disabled={submittingWarn || !selected}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50 ${ACCENT_BTN[accent]}`}
              >
                {submittingWarn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Issue warning
              </button>
            </form>

            <div className="space-y-3 rounded-xl border border-white/[0.06] p-4">
              <h3 className="text-sm font-medium text-white">Change standing</h3>
              <p className="text-xs text-zinc-500">Remove actions show only while that sanction is active.</p>
              <SanctionScheduleFields defaultDuration="temporary" onChange={setSanctionTiming} />
              <div className="flex flex-wrap gap-2">
                {can('suspend') && standing !== 'suspended' ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('suspend')} tone="amber">Suspend</ActionButton>
                ) : null}
                {can('unsuspend') && standing === 'suspended' ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('unsuspend')} tone="emerald">Remove suspension</ActionButton>
                ) : null}
                {can('lock') && standing !== 'locked' ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('lock')} tone="amber">Lock</ActionButton>
                ) : null}
                {can('unlock') && standing === 'locked' ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('unlock')} tone="emerald">Remove lock</ActionButton>
                ) : null}
                {can('ban') && standing !== 'banned' ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('ban')} tone="red">Ban</ActionButton>
                ) : null}
                {can('unban') && standing === 'banned' ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('unban')} tone="emerald">Remove ban</ActionButton>
                ) : null}
                {can('timeout') && !selected?.forumTimeout ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('timeout')} tone="amber">Forum timeout</ActionButton>
                ) : null}
                {can('clear_timeout') && selected?.forumTimeout ? (
                  <ActionButton busy={busyId === selected?.accountId} disabled={!selected} onClick={() => void runAction('clear_timeout')} tone="emerald">Remove forum timeout</ActionButton>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter warnings and held accounts by name, email, handle, or reason"
            className="w-full rounded-xl border border-white/10 bg-[#14151c] py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-white/25"
          />
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <h2 className="text-sm font-semibold text-white">Warnings</h2>
            <p className="mt-1 mb-4 text-xs text-zinc-500">{filteredViolations.length} shown</p>
            {loading && !data ? (
              <LoadingLine />
            ) : filteredViolations.length === 0 ? (
              <p className="text-sm text-zinc-500">No warnings match this view.</p>
            ) : (
              <ul className="space-y-3">
                {filteredViolations.map((row) => (
                  <li key={row.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{row.type}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {row.account.name} · @{row.account.handle || 'no-handle'}
                          {row.account.email ? ` · ${row.account.email}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass(row.status)}`}>
                        {row.status}
                      </span>
                    </div>
                    {row.reason ? <p className="mt-2 text-sm text-zinc-300">{row.reason}</p> : null}
                    <dl className="mt-3 grid gap-2 text-[11px] text-zinc-500 sm:grid-cols-2">
                      <div>Number · {row.number || row.id.slice(0, 8)}</div>
                      <div>Points · {row.points}</div>
                      <div>Issued by · {row.issuedBy}</div>
                      <div>Issued · {formatDateTime(row.createdAt)}</div>
                      <div className="sm:col-span-2">
                        Expires · {row.expiresAt ? formatDateTime(row.expiresAt) : 'Stays until rescinded'}
                      </div>
                      <div className="sm:col-span-2">{standingLines(row.account).join(' · ')}</div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => focusAccount(row.account)}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-200"
                      >
                        Work this account
                      </button>
                      {row.active !== false && String(row.status || '').toLowerCase() !== 'rescinded' ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void rescindDeskWarning(row.account.accountId, row.id)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-200 disabled:opacity-50"
                        >
                          Rescind warning
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
            <h2 className="text-sm font-semibold text-white">Held accounts</h2>
            <p className="mt-1 mb-4 text-xs text-zinc-500">Includes active forum timeouts</p>
            {loading && !data ? (
              <LoadingLine />
            ) : filteredRestricted.length === 0 ? (
              <p className="text-sm text-zinc-500">No held accounts match this view.</p>
            ) : (
              <ul className="space-y-3">
                {filteredRestricted.map((account) => (
                  <li key={account.accountId} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{account.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          @{account.handle || 'no-handle'}
                          {account.email ? ` · ${account.email}` : ''}
                          {account.legalName ? ` · ${account.legalName}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass(account.status)}`}>
                        {account.status}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-1 text-xs text-zinc-400">
                      {standingLines(account).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => focusAccount(account)}
                      className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-200"
                    >
                      Work this account
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-white/[0.08] bg-[#14151c] p-5">
          <h2 className="text-sm font-semibold text-white">Activity</h2>
          <p className="mt-1 mb-4 text-xs text-zinc-500">Warnings, standing changes, and removals</p>
          {loading && !data ? (
            <LoadingLine />
          ) : (data?.recentActivity || []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-8 text-center text-sm text-zinc-500">
              No activity yet.
            </p>
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {(data?.recentActivity || []).map((item) => (
                <li key={item.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{item.action}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.accountName || item.accountHandle || item.accountId}
                        {item.actorName ? ` · by ${item.actorName}` : ''}
                        {item.actorRole ? ` · ${item.actorRole}` : ''}
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
    </main>
  );
}

function LoadingLine() {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  busy,
  tone,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone: 'amber' | 'emerald' | 'red';
}) {
  const tones = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
  };
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
