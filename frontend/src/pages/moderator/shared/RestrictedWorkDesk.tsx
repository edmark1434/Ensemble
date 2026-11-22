import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Coins, ExternalLink, Loader2, RefreshCw, Scale, Search } from 'lucide-react';
import api from '@/lib/axios';
import { useStaffLive } from '@/lib/staffLive';
import { staffPlatformViewHref } from '@/lib/staffRoutes';
import StandingChip from '@/components/account/StandingChip';
import type { PublicStanding } from '@/pages/user/7_profile/Displays/AccountStanding';
import { EmptyNote, FIELD, Pill } from './staffCaseUi';
import { accentText, type Accent } from './ui';

/**
 * Live work with a restricted party (docs/punishment-system.md §9): running, waiting or unsigned
 * contracts where one side is suspended, locked or banned (or is a team whose leader is). The
 * active side has been told; staff settle these with the contract and dispute tools so nobody's
 * escrow is stranded. Oldest restriction first.
 */

type Party = {
  accountId: string;
  name: string;
  handle: string | null;
  type: string | null;
  restricted: boolean;
  reason: string | null;
  reasonLabel: string | null;
  standing: PublicStanding | null;
  restrictedSince: string | null;
};

type Item = {
  contractId: string;
  kind: 'job' | 'gig';
  title: string;
  status: string;
  createdAt: string;
  restrictedSince: string | null;
  client: Party;
  freelancer: Party;
  escrowCredits: number | null;
  openDispute: { id: string; number: string | null } | null;
};

type Payload = {
  items: Item[];
  total: number;
  counts: { total: number; banned: number; locked: number; suspended: number; teamLeader: number };
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'banned', label: 'Banned' },
  { id: 'locked', label: 'Locked' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'team_leader', label: 'Team leader' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

function since(value: string | null) {
  if (!value) return 'unknown';
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.floor(ms / 3600000));
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

function countFor(counts: Payload['counts'] | undefined, id: FilterId) {
  if (!counts) return 0;
  if (id === 'all') return counts.total;
  if (id === 'team_leader') return counts.teamLeader;
  return counts[id];
}

function PartyCell({ party, role, consoleBase }: { party: Party; role: string; consoleBase: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{role}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          to={staffPlatformViewHref(consoleBase, `/profile/${encodeURIComponent(party.accountId)}`)}
          className={`truncate text-sm ${party.restricted ? 'font-semibold text-white' : 'text-zinc-300'} hover:underline`}
        >
          {party.name}
        </Link>
        <StandingChip standing={party.standing} />
        {party.reason === 'team_leader' ? (
          <Pill className="border-zinc-400/30 bg-zinc-500/10 text-zinc-300">Leader restricted</Pill>
        ) : null}
      </div>
      {party.handle ? <p className="truncate text-[11px] text-zinc-500">@{party.handle}</p> : null}
    </div>
  );
}

export default function RestrictedWorkDesk({
  accent,
  consoleBase,
  eyebrow = 'Live work',
}: {
  accent: Accent;
  /** Console home path, e.g. /moderator/jobs or /admin (platform-view links). */
  consoleBase: string;
  eyebrow?: string;
}) {
  const [filter, setFilter] = useState<FilterId>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef({ filter, query });
  latest.current = { filter, query };

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/api/moderator/restricted-work', {
        params: { status: latest.current.filter, search: latest.current.query || undefined, limit: 100 },
      });
      setData(res.data?.data || null);
      setError(null);
    } catch (err: any) {
      if (!silent) setError(err?.response?.data?.message || 'Could not load live work with a restricted party.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, filter, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  // Standing changes, contract moves, escrow and disputes anywhere refresh the list silently.
  useStaffLive(['accounts', 'teams', 'jobs', 'disputes', 'economy'], () => load(true), { delayMs: 1000 });

  const items = data?.items || [];

  return (
    <main className="min-h-screen md:pl-[260px]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#06070c]/90 backdrop-blur-xl">
        <div className="flex flex-col gap-3 px-6 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${accentText(accent)}`}>{eyebrow}</p>
            <h1 className="text-xl font-bold text-white">Live work with a restricted party</h1>
            <p className="mt-1 max-w-2xl text-xs text-zinc-500">
              Contracts where one side is suspended, locked or banned. The other side has been told. Settle the
              escrow, extend, or cancel with the contract and dispute tools; punishments never move credits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      <div className="space-y-4 px-6 py-6 md:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  filter === item.id
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-white/[0.06] bg-transparent text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
                <span className="ml-1.5 text-zinc-500">{countFor(data?.counts, item.id)}</span>
              </button>
            ))}
          </div>
          <label className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, member or contract id"
              className={`${FIELD} pl-9`}
            />
          </label>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4" /> {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="flex items-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <EmptyNote>No live contracts have a restricted side right now.</EmptyNote>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.contractId} className="rounded-xl border border-white/[0.08] bg-[#14151c] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill className="border-white/10 bg-white/5 text-zinc-300">{item.kind === 'job' ? 'Job' : 'Gig'}</Pill>
                      <Pill className="border-white/10 bg-white/5 text-zinc-300">{item.status}</Pill>
                      <span className="truncate text-sm font-semibold text-white">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      Restricted for {since(item.restrictedSince)} · contract {item.contractId.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-2.5 py-1 text-xs text-amber-100">
                      <Coins className="h-3.5 w-3.5" />
                      {item.escrowCredits == null ? 'Escrow unknown' : `${item.escrowCredits.toLocaleString()} credits in escrow`}
                    </span>
                    {item.openDispute ? (
                      <Link
                        to={staffPlatformViewHref(consoleBase, `/disputes/${item.openDispute.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-100 hover:bg-sky-500/20"
                      >
                        <Scale className="h-3.5 w-3.5" /> {item.openDispute.number || 'Open dispute'}
                      </Link>
                    ) : (
                      <Pill className="border-zinc-500/30 bg-zinc-500/10 text-zinc-400">No dispute</Pill>
                    )}
                    <Link
                      to={staffPlatformViewHref(consoleBase, `/contracts/${item.contractId}`)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10"
                    >
                      Open contract <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <PartyCell party={item.client} role="Client" consoleBase={consoleBase} />
                  <PartyCell party={item.freelancer} role="Freelancer" consoleBase={consoleBase} />
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && data.total > items.length ? (
          <p className="text-xs text-zinc-500">Showing the oldest {items.length} of {data.total}. Narrow with a filter or search.</p>
        ) : null}
      </div>
    </main>
  );
}
