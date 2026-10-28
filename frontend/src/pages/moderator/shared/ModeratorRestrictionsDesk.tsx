import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Ban, Loader2, RefreshCw, Search, ShieldAlert, Activity, AlertTriangle, Clock, X } from 'lucide-react';
import api from '@/lib/axios';
import { showErrorToast, showSuccessToast } from '@/components/utility/toast';
import type { AccountActivityItem } from '@/pages/admin/userTeam/userTeamTypes';
import { SanctionScheduleFields, type SanctionTiming } from '@/pages/admin/userTeam/components/SanctionSchedule';
import { WarningPresetFields } from '@/pages/admin/userTeam/components/WarningPresetFields';
import { getUserTeamCapabilities, type UserTeamVariant } from '@/pages/admin/userTeam/userTeamCapabilities';
import { accentText, titleCaseWords, type Accent } from './ui';

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

type QueueView = 'warnings' | 'held' | 'activity';
type WarningScope = 'all' | 'active' | 'expired' | 'rescinded';
type HeldScope = 'all' | 'timeout';
type WorkMode = 'warning' | 'standing';
type ChipTone = 'red' | 'amber' | 'emerald' | 'zinc';
type ActionTone = 'amber' | 'emerald' | 'red';

type StandingFact = {
  key: string;
  label: string;
  detail: string;
  tone: ChipTone;
};

type DeskAction = {
  id: string;
  label: string;
  tone: ActionTone;
};

const ACCENT_BTN: Record<Accent, string> = {
  sky: 'border-sky-500/40 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25',
  violet: 'border-violet-500/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25',
  emerald: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25',
  rose: 'border-rose-500/40 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25',
};

const CHIP_CLASS: Record<ChipTone, string> = {
  red: 'border-red-500/30 bg-red-500/10 text-red-200',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  zinc: 'border-white/10 bg-white/[0.04] text-zinc-300',
};

const FIELD_CLASS =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25';

const ACCENT_DOT: Record<Accent, string> = {
  sky: 'bg-sky-400',
  violet: 'bg-violet-400',
  emerald: 'bg-emerald-400',
  rose: 'bg-rose-400',
};

function formatDateTime(value: string | null | undefined) {
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

function relativeTime(value: string | null | undefined) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (Math.abs(minutes) < 1) return 'Just now';
  const abs = Math.abs(minutes);
  const suffix = minutes < 0 ? '' : ' ago';
  const prefix = minutes < 0 ? 'in ' : '';
  if (abs < 60) return `${prefix}${abs}m${suffix}`;
  const hours = Math.round(abs / 60);
  if (hours < 24) return `${prefix}${hours}h${suffix}`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${prefix}${days}d${suffix}`;
  return formatDateTime(value);
}

function untilPhrase(value: string | null | undefined) {
  if (!value) return 'Until staff remove it';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'Until staff remove it';
  if (then <= Date.now()) return `Ended ${relativeTime(value)}`;
  return `Until ${formatDateTime(value)}`;
}

function statusTone(status: string): ChipTone {
  const value = String(status || '').toLowerCase();
  if (value === 'banned' || value === 'rescinded') return 'red';
  if (value === 'suspended' || value === 'locked') return 'amber';
  if (value === 'active') return 'emerald';
  return 'zinc';
}

function warningBucket(row: ViolationRow): Exclude<WarningScope, 'all'> {
  const status = String(row.status || '').toLowerCase();
  if (status === 'rescinded') return 'rescinded';
  if (status === 'expired' || row.active === false) return 'expired';
  return 'active';
}

function standingFacts(account: DeskAccount): StandingFact[] {
  const status = String(account.status || '').toLowerCase();
  const facts: StandingFact[] = [];
  if (status === 'banned') {
    facts.push({ key: 'ban', label: 'Banned', detail: untilPhrase(account.banEndsAt), tone: 'red' });
  } else if (status === 'suspended') {
    facts.push({ key: 'suspension', label: 'Suspended', detail: untilPhrase(account.suspensionEndsAt), tone: 'amber' });
  } else if (status === 'locked') {
    facts.push({ key: 'lock', label: 'Locked', detail: untilPhrase(account.lockEndsAt), tone: 'amber' });
  } else {
    facts.push({ key: 'active', label: 'Active', detail: 'No account hold', tone: 'emerald' });
  }
  if (account.forumTimeout) {
    facts.push({ key: 'timeout', label: 'Forum timeout', detail: untilPhrase(account.timeoutEndsAt), tone: 'amber' });
  }
  return facts;
}

function initials(name: string) {
  const letters = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
  return letters || '?';
}

function shortId(value: string) {
  if (!value || value.length <= 14) return value || '—';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function matchesQuery(parts: Array<string | null | undefined>, query: string) {
  if (!query) return true;
  return parts.filter(Boolean).some((part) => String(part).toLowerCase().includes(query));
}

function apiMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;
}

function availableActions(standing: string, timeout: boolean, can: (action: string) => boolean) {
  const apply: DeskAction[] = [];
  const lift: DeskAction[] = [];
  if (can('suspend') && standing !== 'suspended') apply.push({ id: 'suspend', label: 'Suspend', tone: 'amber' });
  if (can('lock') && standing !== 'locked') apply.push({ id: 'lock', label: 'Lock', tone: 'amber' });
  if (can('ban') && standing !== 'banned') apply.push({ id: 'ban', label: 'Ban', tone: 'red' });
  if (can('timeout') && !timeout) apply.push({ id: 'timeout', label: 'Timeout', tone: 'amber' });
  if (can('unsuspend') && standing === 'suspended') lift.push({ id: 'unsuspend', label: 'Remove suspension', tone: 'emerald' });
  if (can('unlock') && standing === 'locked') lift.push({ id: 'unlock', label: 'Remove lock', tone: 'emerald' });
  if (can('unban') && standing === 'banned') lift.push({ id: 'unban', label: 'Remove ban', tone: 'emerald' });
  if (can('clear_timeout') && timeout) lift.push({ id: 'clear_timeout', label: 'Remove timeout', tone: 'emerald' });
  return { apply, lift };
}

function StatusPill({ status, tone }: { status: string; tone?: ChipTone }) {
  return (
    <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CHIP_CLASS[tone || statusTone(status)]}`}>
      {titleCaseWords(status || 'Unknown')}
    </span>
  );
}

function Avatar({ account }: { account: DeskAccount }) {
  const tone = statusTone(account.forumTimeout && String(account.status).toLowerCase() === 'active' ? 'locked' : account.status);
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${CHIP_CLASS[tone]}`}>
      {initials(account.name)}
    </span>
  );
}

function Fact({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate text-sm text-zinc-100" title={title || value}>
        {value}
      </dd>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
              active ? 'bg-white/[0.08] text-white' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            {option.label}
            {option.count != null ? <span className="tabular-nums text-[10px] text-zinc-500">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
      <p className="text-sm text-zinc-300">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{detail}</p>
    </div>
  );
}

function QueueSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-[72px] animate-pulse rounded-xl bg-white/[0.04]" />
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function AccountSearch({
  endpointBase,
  onSelect,
}: {
  endpointBase: string;
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
      <Field label="Find account">
        <div className="relative">
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
            className={`${FIELD_CLASS} py-2.5 pl-10 pr-10`}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
          />
          {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" /> : null}
        </div>
      </Field>
      {open && text.trim().length >= 2 ? (
        <ul className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#12131a] p-1 shadow-2xl">
          {results.length === 0 && !searching ? (
            <li className="px-3 py-3 text-sm text-zinc-500">No accounts match that search.</li>
          ) : (
            results.map((account, index) => (
              <li key={account.accountId}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => choose(account)}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${index === highlight ? 'bg-white/[0.06]' : ''}`}
                >
                  <Avatar account={account} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-white">{account.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      @{account.handle || 'no-handle'}
                      {account.email ? ` · ${account.email}` : ''}
                    </span>
                  </span>
                  <StatusPill status={account.status} />
                </button>
              </li>
            ))
          )}
        </ul>
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
  const [queue, setQueue] = useState<QueueView>('warnings');
  const [warningScope, setWarningScope] = useState<WarningScope>('all');
  const [heldScope, setHeldScope] = useState<HeldScope>('all');
  const [workMode, setWorkMode] = useState<WorkMode>('warning');
  const [selected, setSelected] = useState<DeskAccount | null>(null);
  const [warnForm, setWarnForm] = useState({ warningId: 'harassment', reason: '' });
  const [sanctionTiming, setSanctionTiming] = useState<SanctionTiming>({ duration: 'temporary', endsAt: null, summary: '' });
  const [sanctionReason, setSanctionReason] = useState('');
  const [submittingWarn, setSubmittingWarn] = useState(false);
  const workRef = useRef<HTMLElement>(null);
  const previousAccountId = useRef<string | null>(null);

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

  useEffect(() => {
    const nextId = selected?.accountId || null;
    if (previousAccountId.current && previousAccountId.current !== nextId) {
      setSanctionReason('');
      setWarnForm((prev) => ({ ...prev, reason: '' }));
    }
    previousAccountId.current = nextId;
  }, [selected?.accountId]);

  function focusAccount(account: DeskAccount, mode: WorkMode) {
    setSelected(account);
    setWorkMode(mode);
    workRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const normalizedQuery = query.trim().toLowerCase();

  const queriedViolations = useMemo(() => {
    return (data?.violations || []).filter((row) =>
      matchesQuery(
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
        ],
        normalizedQuery
      )
    );
  }, [data?.violations, normalizedQuery]);

  const warningCounts = useMemo(
    () => ({
      all: queriedViolations.length,
      active: queriedViolations.filter((row) => warningBucket(row) === 'active').length,
      expired: queriedViolations.filter((row) => warningBucket(row) === 'expired').length,
      rescinded: queriedViolations.filter((row) => warningBucket(row) === 'rescinded').length,
    }),
    [queriedViolations]
  );

  const filteredViolations = useMemo(() => {
    if (warningScope === 'all') return queriedViolations;
    return queriedViolations.filter((row) => warningBucket(row) === warningScope);
  }, [queriedViolations, warningScope]);

  const queriedRestricted = useMemo(() => {
    return (data?.restrictedAccounts || []).filter((account) =>
      matchesQuery(
        [account.name, account.handle, account.email, account.legalName, account.type, account.status],
        normalizedQuery
      )
    );
  }, [data?.restrictedAccounts, normalizedQuery]);

  const filteredRestricted = useMemo(() => {
    if (heldScope === 'timeout') return queriedRestricted.filter((account) => account.forumTimeout);
    return queriedRestricted;
  }, [heldScope, queriedRestricted]);

  const filteredActivity = useMemo(() => {
    return (data?.recentActivity || []).filter((item) =>
      matchesQuery(
        [item.action, item.eventCode, item.accountName, item.accountHandle, item.actorName, item.actorRole],
        normalizedQuery
      )
    );
  }, [data?.recentActivity, normalizedQuery]);

  const selectedWarnings = useMemo(() => {
    if (!selected) return [];
    return (data?.violations || []).filter((row) => row.account.accountId === selected.accountId);
  }, [data?.violations, selected]);

  const activePoints = selectedWarnings
    .filter((row) => warningBucket(row) === 'active')
    .reduce((sum, row) => sum + (Number(row.points) || 0), 0);

  async function runAction(action: string) {
    if (!selected) return;
    const removing = ['unsuspend', 'unban', 'unlock', 'clear_timeout'].includes(action);
    if (!sanctionReason.trim()) {
      showErrorToast('A reason is required');
      return;
    }
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
        reason: sanctionReason.trim(),
      });
      setData(res.data?.data || null);
      setSanctionReason('');
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
    if (!selected || !warnForm.warningId || !warnForm.reason.trim()) {
      if (!warnForm.reason.trim()) showErrorToast('A reason is required');
      if (!warnForm.warningId) showErrorToast('Pick a predefined warning');
      return;
    }
    setSubmittingWarn(true);
    setError(null);
    try {
      const res = await api.post(`${endpointBase}/violations`, {
        accountId: selected.accountId,
        warningId: warnForm.warningId,
        reason: warnForm.reason.trim(),
      });
      setData(res.data?.data || null);
      setWarnForm((prev) => ({ ...prev, reason: '' }));
      showSuccessToast('Warning issued');
    } catch (err: unknown) {
      const message = apiMessage(err, 'Failed to issue violation');
      setError(message);
      showErrorToast(message);
    } finally {
      setSubmittingWarn(false);
    }
  }

  const activeViolations = (data?.violations || []).filter((row) => warningBucket(row) === 'active').length;
  const timeoutCount = (data?.restrictedAccounts || []).filter((account) => account.forumTimeout).length;
  const standing = String(selected?.status || '').toLowerCase();
  const can = (action: string) => caps.statusActions.has(action);
  const actions = availableActions(standing, Boolean(selected?.forumTimeout), can);
  const queueCount = queue === 'warnings' ? filteredViolations.length : queue === 'held' ? filteredRestricted.length : filteredActivity.length;
  const queueTitle = queue === 'warnings' ? 'Warnings' : queue === 'held' ? 'Held accounts' : 'Activity';

  function openQueue(next: QueueView, scope?: HeldScope) {
    setQueue(next);
    if (scope) setHeldScope(scope);
  }

  const summaries: {
    id: string;
    label: string;
    value: number;
    sub: string;
    icon: typeof AlertTriangle;
    active: boolean;
    onClick: () => void;
  }[] = [
    {
      id: 'warnings',
      label: 'Active warnings',
      value: activeViolations,
      sub: 'Still counting toward a hold',
      icon: AlertTriangle,
      active: queue === 'warnings',
      onClick: () => {
        setWarningScope('active');
        openQueue('warnings');
      },
    },
    {
      id: 'held',
      label: 'Held accounts',
      value: data?.restrictedAccounts?.length || 0,
      sub: 'Banned, suspended, locked, or timed out',
      icon: Ban,
      active: queue === 'held' && heldScope === 'all',
      onClick: () => openQueue('held', 'all'),
    },
    {
      id: 'timeouts',
      label: 'Timeouts',
      value: timeoutCount,
      sub: 'Forum writes blocked',
      icon: Clock,
      active: queue === 'held' && heldScope === 'timeout',
      onClick: () => openQueue('held', 'timeout'),
    },
    {
      id: 'activity',
      label: 'Recent activity',
      value: data?.recentActivity?.length || 0,
      sub: 'Latest standing changes',
      icon: Activity,
      active: queue === 'activity',
      onClick: () => openQueue('activity'),
    },
  ];

  return (
    <main
      className="relative z-10 min-h-screen min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 md:pl-[260px] md:px-10 md:py-8"
      style={{ animation: 'fadeIn 420ms ease' }}
    >
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${accentText(accent)}`}>{roleLabel}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Restrictions</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summaries.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                aria-pressed={item.active}
                className={`rounded-2xl border bg-[#14151c] p-4 text-left transition ${
                  item.active ? 'border-white/25' : 'border-white/[0.08] hover:border-white/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-white">
                      {loading && !data ? '—' : item.value}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">{item.sub}</p>
                  </div>
                  <Icon className={`h-4 w-4 ${accentText(accent)}`} />
                </div>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="order-2 min-w-0 rounded-2xl border border-white/[0.08] bg-[#14151c] xl:order-1">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-sm font-semibold text-white">{queueTitle}</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  {loading && !data ? 'Loading records' : `${queueCount} shown`}
                </p>
              </div>
              {queue === 'warnings' ? (
                <Segmented
                  label="Warning status"
                  value={warningScope}
                  onChange={setWarningScope}
                  options={[
                    { id: 'all', label: 'All', count: warningCounts.all },
                    { id: 'active', label: 'Active', count: warningCounts.active },
                    { id: 'expired', label: 'Expired', count: warningCounts.expired },
                    { id: 'rescinded', label: 'Rescinded', count: warningCounts.rescinded },
                  ]}
                />
              ) : null}
              {queue === 'held' ? (
                <Segmented
                  label="Hold type"
                  value={heldScope}
                  onChange={setHeldScope}
                  options={[
                    { id: 'all', label: 'All holds', count: queriedRestricted.length },
                    { id: 'timeout', label: 'Timeouts', count: queriedRestricted.filter((account) => account.forumTimeout).length },
                  ]}
                />
              ) : null}
            </div>

            <div className="border-b border-white/[0.06] px-4 py-3 sm:px-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter by name, email, handle, or reason"
                  className={`${FIELD_CLASS} bg-black/20 py-2 pl-10 pr-10`}
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-500 hover:text-white"
                    aria-label="Clear filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="px-4 py-4 sm:px-5">
              {loading && !data ? (
                <QueueSkeleton />
              ) : queue === 'warnings' ? (
                filteredViolations.length === 0 ? (
                  <EmptyState
                    title="No warnings in this view"
                    detail={normalizedQuery ? 'Try a different name, handle, or reason.' : 'Issued warnings will show up here.'}
                  />
                ) : (
                  <ul className="space-y-2">
                    {filteredViolations.map((row) => {
                      const selectedRow = selected?.accountId === row.account.accountId;
                      const bucket = warningBucket(row);
                      return (
                        <li
                          key={row.id}
                          className={`rounded-xl border transition ${
                            selectedRow ? 'border-white/20 bg-white/[0.045]' : 'border-white/[0.06] bg-black/10 hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-start gap-3 px-3 py-3">
                            <button type="button" onClick={() => focusAccount(row.account, 'warning')} className="min-w-0 flex-1 text-left">
                              <div className="flex items-start gap-3">
                                <Avatar account={row.account} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-white">{row.account.name}</p>
                                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                                        @{row.account.handle || 'no-handle'}
                                        {row.account.email ? ` · ${row.account.email}` : ''}
                                      </p>
                                    </div>
                                    <StatusPill status={row.status} />
                                  </div>
                                  <p className="mt-2 text-sm text-zinc-200">
                                    {row.type}
                                    <span className="text-zinc-500"> · {row.points} pts</span>
                                  </p>
                                  {row.reason ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-400">{row.reason}</p> : null}
                                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                    <span>{row.number || shortId(row.id)}</span>
                                    <span title={formatDateTime(row.createdAt)}>{relativeTime(row.createdAt)}</span>
                                    <span>by {row.issuedBy}</span>
                                    <span>{row.expiresAt ? `Expires ${formatDateTime(row.expiresAt)}` : 'No expiry'}</span>
                                  </p>
                                </div>
                              </div>
                            </button>
                            {bucket === 'active' ? (
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() => void rescindDeskWarning(row.account.accountId, row.id)}
                                className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-zinc-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                              >
                                {busyId === row.id ? 'Rescinding…' : 'Rescind'}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : queue === 'held' ? (
                filteredRestricted.length === 0 ? (
                  <EmptyState
                    title="No held accounts in this view"
                    detail={heldScope === 'timeout' ? 'Accounts with a forum timeout will show up here.' : 'Bans, suspensions, locks, and timeouts will show up here.'}
                  />
                ) : (
                  <ul className="space-y-2">
                    {filteredRestricted.map((account) => {
                      const selectedRow = selected?.accountId === account.accountId;
                      return (
                        <li key={account.accountId}>
                          <button
                            type="button"
                            onClick={() => focusAccount(account, 'standing')}
                            className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition ${
                              selectedRow ? 'border-white/20 bg-white/[0.045]' : 'border-white/[0.06] bg-black/10 hover:border-white/15'
                            }`}
                          >
                            <Avatar account={account} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium text-white">{account.name}</span>
                                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                                    @{account.handle || 'no-handle'}
                                    {account.email ? ` · ${account.email}` : ''}
                                  </span>
                                </span>
                                <StatusPill status={account.status} />
                              </span>
                              <span className="mt-2 flex flex-wrap gap-1.5">
                                {standingFacts(account).map((fact) => (
                                  <span key={fact.key} className={`rounded-md border px-1.5 py-0.5 text-[10px] ${CHIP_CLASS[fact.tone]}`}>
                                    {fact.label} · {fact.detail}
                                  </span>
                                ))}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : filteredActivity.length === 0 ? (
                <EmptyState
                  title="No activity in this view"
                  detail={normalizedQuery ? 'Try a different name or action.' : 'Warnings and standing changes will show up here.'}
                />
              ) : (
                <ol className="space-y-0">
                  {filteredActivity.map((item, index) => (
                    <li key={item.id} className="relative flex gap-3 pb-4">
                      <div className="flex w-3 shrink-0 flex-col items-center">
                        <span className={`mt-1.5 h-2 w-2 rounded-full ${ACCENT_DOT[accent]}`} />
                        {index < filteredActivity.length - 1 ? <span className="mt-1 w-px flex-1 bg-white/10" /> : null}
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white">{item.action}</p>
                          <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                            {titleCaseWords(item.eventCode)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {item.accountName || item.accountHandle || shortId(item.accountId)}
                          {item.actorName ? ` · ${item.actorName}` : ''}
                          {item.actorRole ? ` · ${titleCaseWords(item.actorRole)}` : ''}
                        </p>
                        <p className="mt-2 text-[11px] text-zinc-500" title={formatDateTime(item.createdAt)}>
                          {relativeTime(item.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>

          <aside
            ref={workRef}
            className="order-1 min-w-0 rounded-2xl border border-white/[0.08] bg-[#14151c] xl:sticky xl:top-6 xl:order-2"
          >
            <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Account workspace</h2>
                  <p className="mt-1 text-xs text-zinc-500">Search, then issue a warning or change standing.</p>
                </div>
                <ShieldAlert className={`h-4 w-4 ${accentText(accent)}`} />
              </div>
              <AccountSearch endpointBase={endpointBase} onSelect={setSelected} />
            </div>

            {selected ? (
              <div className="px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3">
                  <Avatar account={selected} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{selected.name}</p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">@{selected.handle || 'no-handle'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {standingFacts(selected).map((fact) => (
                        <span key={fact.key} className={`rounded-md border px-1.5 py-0.5 text-[10px] ${CHIP_CLASS[fact.tone]}`}>
                          {fact.label}
                          <span className="text-zinc-400"> · {fact.detail}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-3">
                  <Fact label="Email" value={selected.email || 'No email on file'} />
                  <Fact label="Legal name" value={selected.legalName || '—'} />
                  <Fact label="Account type" value={selected.type || '—'} />
                  <Fact label="Active points" value={String(activePoints)} />
                  <Fact label="Warnings" value={String(selectedWarnings.length)} />
                  <Fact label="Account id" value={shortId(selected.accountId)} title={selected.accountId} />
                </dl>

                <div className="mt-4">
                  <Segmented
                    label="Workspace action"
                    value={workMode}
                    onChange={setWorkMode}
                    options={[
                      { id: 'warning', label: 'Issue warning' },
                      { id: 'standing', label: 'Change standing' },
                    ]}
                  />
                </div>

                <div className={workMode === 'warning' ? 'mt-4' : 'hidden'}>
                  <form onSubmit={submitWarning} className="space-y-3">
                    <p className="text-xs leading-relaxed text-zinc-500">
                      Pick a predefined warning. Points and duration are locked to that row until it expires or is rescinded.
                    </p>
                    <WarningPresetFields
                      desk={variant}
                      warningId={warnForm.warningId}
                      reason={warnForm.reason}
                      onWarningId={(id) => setWarnForm((prev) => ({ ...prev, warningId: id }))}
                      onReason={(reason) => setWarnForm((prev) => ({ ...prev, reason }))}
                      fieldClass={FIELD_CLASS}
                    />
                    <button
                      type="submit"
                      disabled={submittingWarn || !warnForm.reason.trim() || !warnForm.warningId}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${ACCENT_BTN[accent]}`}
                    >
                      {submittingWarn ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Issue warning
                    </button>
                  </form>
                </div>

                <div className={workMode === 'standing' ? 'mt-4 space-y-4' : 'hidden'}>
                  <p className="text-xs leading-relaxed text-zinc-500">
                    Lift actions appear only while that sanction is active. A reason is stored with every change.
                  </p>
                  <SanctionScheduleFields key={`${selected.accountId}-standing`} defaultDuration="temporary" onChange={setSanctionTiming} />
                  <Field label="Reason">
                    <textarea
                      value={sanctionReason}
                      onChange={(event) => setSanctionReason(event.target.value)}
                      rows={3}
                      placeholder="Why this is being applied or removed"
                      className={FIELD_CLASS}
                    />
                  </Field>
                  {actions.apply.length > 0 ? (
                    <ActionGroup title="Apply" actions={actions.apply} busy={busyId === selected.accountId} onRun={(id) => void runAction(id)} />
                  ) : null}
                  {actions.lift.length > 0 ? (
                    <ActionGroup title="Lift" actions={actions.lift} busy={busyId === selected.accountId} onRun={(id) => void runAction(id)} />
                  ) : null}
                  {actions.apply.length === 0 && actions.lift.length === 0 ? (
                    <p className="text-xs text-zinc-500">This role cannot change standing from here.</p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-center sm:px-5">
                <ShieldAlert className="mx-auto h-5 w-5 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-200">No account selected</p>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-zinc-500">
                  Search by name, email, handle, or account id. You can also open someone from the list.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function ActionGroup({
  title,
  actions,
  busy,
  onRun,
}: {
  title: string;
  actions: DeskAction[];
  busy: boolean;
  onRun: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <ActionButton key={action.id} tone={action.tone} busy={busy} onClick={() => onRun(action.id)}>
            {action.label}
          </ActionButton>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  busy,
  tone,
}: {
  children: string;
  onClick: () => void;
  busy?: boolean;
  tone: ActionTone;
}) {
  const tones: Record<ActionTone, string> = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20',
    red: 'border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20',
  };
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}
