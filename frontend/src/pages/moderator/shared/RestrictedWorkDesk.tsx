import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Coins, ExternalLink, Info, Loader2, RefreshCw, Scale, Search } from 'lucide-react';
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
type Reason = Exclude<FilterId, 'all'>;

const GUIDE_KEY = 'restrictedWork.guideHidden';
/** Same rule as the dashboards' red alert (countStaleRestrictedContracts). */
const STALE_DAYS = 7;
/** Which restriction decides the next step when both sides are restricted. */
const REASON_ORDER: Reason[] = ['banned', 'locked', 'team_leader', 'suspended'];

function readPref(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writePref(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* per-browser convenience only */
  }
}

const REASON_GUIDE: { id: Reason; label: string; tone: string; text: string }[] = [
  {
    id: 'banned',
    label: 'Banned',
    tone: 'border-red-500/25 text-red-300',
    text: 'Will not come back to this contract. Settle the escrow with the side that can still act.',
  },
  {
    id: 'locked',
    label: 'Locked',
    tone: 'border-amber-500/25 text-amber-300',
    text: 'Restricted while staff review the account. Settle if the review will not end soon or the other side cannot wait.',
  },
  {
    id: 'suspended',
    label: 'Suspended',
    tone: 'border-sky-500/25 text-sky-300',
    text: 'Ends on its own at a set time. Usually wait, unless the other side asks for it to be settled sooner.',
  },
  {
    id: 'team_leader',
    label: 'Team leader',
    tone: 'border-zinc-500/25 text-zinc-200',
    text: "The team's leader is banned, locked or missing. Live work goes on, but the team cannot take new work or pay out until Support transfers ownership or the penalty ends.",
  },
];

function GuideCard({ title, items }: { title: string; items: ReactNode[] }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <p className="text-xs font-semibold text-white">{title}</p>
      <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-zinc-400">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** What this queue holds, what already happened on its own, and what staff can do about it. */
function QueueGuide({ accent, onHide }: { accent: Accent; onHide: () => void }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#0f1016] px-5 py-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Info className={`h-4 w-4 ${accentText(accent)}`} />
            How this queue works
          </p>
          <p className="mt-0.5 max-w-3xl text-xs text-zinc-500">
            A punishment never moves credits. Whatever a contract still holds in escrow waits here until staff settle
            it, so the side that can still act is never left with credits stuck on someone who cannot.
          </p>
        </div>
        <button
          type="button"
          onClick={onHide}
          className="shrink-0 rounded-lg px-2 py-1 text-[11px] text-zinc-500 transition hover:bg-white/5 hover:text-zinc-200"
        >
          Hide
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <GuideCard
          title="What's listed"
          items={[
            'Job and gig contracts that are Active, Waiting or Pending signature.',
            'At least one side is suspended, locked or banned, or is a team whose leader is banned, locked or missing.',
            'Oldest restriction first, with the credits the contract still holds in escrow and any open dispute.',
            'A contract drops off by itself once it ends or both sides can act again.',
          ]}
        />
        <GuideCard
          title="Already done automatically"
          items={[
            'The other side was notified (a team through its Owners and Admins) and is told again when the restricted side can act.',
            'Automatic abandonment refunds and auto-approved cancellations wait until the penalty ends, plus 48 hours. Missed-review warnings are skipped.',
            "A ban withdraws unsigned offers on either side, and the banned member's pending proposals and gig orders.",
            "An open dispute freezes the contract's escrow and stops its clocks.",
          ]}
        />
        <GuideCard
          title="What you can do"
          items={[
            <>
              <span className="text-zinc-200">Open contract</span> to see milestones, escrow, deadlines and the chat in
              platform view.
            </>,
            <>
              <span className="text-zinc-200">Open the dispute</span> to settle the escrow: award it or split it, then
              choose the account action.
            </>,
            'No dispute yet? The side that can still act can open one from the contract, or reach Support with a ticket.',
            'Select a name to open their profile, standing and when it ends.',
            'Filter by reason, or search by title, member or contract id.',
          ]}
        />
      </div>

      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">What each reason means</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {REASON_GUIDE.map((reason) => (
          <div key={reason.id} className={`rounded-xl border bg-white/[0.02] px-3.5 py-3 ${reason.tone}`}>
            <p className="text-xs font-semibold">{reason.label}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{reason.text}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-zinc-500">
        Contracts marked <span className="text-red-300">{STALE_DAYS}+ days, no dispute</span> have had a banned or
        locked side that long with nothing settling them. The dashboards raise the same red alert.
      </p>
    </section>
  );
}

function restrictedParties(item: Item) {
  return [item.client, item.freelancer].filter((party) => party.restricted);
}

function daysSince(value: string | null) {
  if (!value) return null;
  const ms = Date.now() - new Date(value).getTime();
  return Number.isFinite(ms) ? ms / 86400000 : null;
}

/** Banned or locked for STALE_DAYS or more with no dispute open. */
function isStale(item: Item) {
  if (item.openDispute) return false;
  return restrictedParties(item).some(
    (party) => (party.reason === 'banned' || party.reason === 'locked') && (daysSince(party.restrictedSince) ?? 0) >= STALE_DAYS
  );
}

function formatWhen(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** One line telling staff what to do with this contract. */
function nextStep(item: Item) {
  if (item.openDispute) {
    return `Settle the escrow in ${item.openDispute.number || 'the open dispute'}: award or split it, then close the case.`;
  }
  if (item.escrowCredits === 0) {
    return 'No credits are held, so nothing is stranded. It leaves this list when the contract ends or the penalty lifts.';
  }
  const parties = restrictedParties(item);
  const reason = REASON_ORDER.find((id) => parties.some((party) => party.reason === id));
  switch (reason) {
    case 'banned':
      return 'The banned side will not come back to this. Ask the other side to open a dispute from the contract so the escrow can be settled.';
    case 'locked':
      return 'Locked while staff review the account. If the review will not end soon, the other side can open a dispute to settle the escrow.';
    case 'team_leader':
      return "The team keeps working on this contract. Support can transfer the team's ownership, or it resumes when the leader's penalty ends.";
    case 'suspended': {
      const ends = formatWhen(parties.find((party) => party.reason === 'suspended')?.standing?.endsAt);
      return `${ends ? `Suspension ends ${ends}.` : 'The suspension ends on its own.'} Usually wait; the other side can open a dispute if they cannot.`;
    }
    default:
      return 'Open the contract to check where it stands.';
  }
}

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
  const [guideHidden, setGuideHidden] = useState(() => readPref(GUIDE_KEY) === '1');
  const latest = useRef({ filter, query });
  const toggleGuide = (hidden: boolean) => {
    setGuideHidden(hidden);
    writePref(GUIDE_KEY, hidden ? '1' : '0');
  };
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
              Contracts where one side is suspended, locked or banned and cannot act. The other side has been told.
              Punishments never move credits, so settle whatever is still in escrow through the dispute tools.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start">
            {guideHidden ? (
              <button
                type="button"
                onClick={() => toggleGuide(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white"
              >
                <Info className="h-3.5 w-3.5" /> How this works
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/10"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-6 py-6 md:px-8">
        {!guideHidden ? <QueueGuide accent={accent} onHide={() => toggleGuide(true)} /> : null}

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
        ) : error && !data ? null : items.length === 0 ? (
          <EmptyNote>
            {filter !== 'all' || query
              ? 'No live contracts match this filter or search.'
              : 'No live contracts have a restricted side right now. Nothing is waiting to be settled.'}
          </EmptyNote>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.contractId} className="rounded-xl border border-white/[0.08] bg-[#14151c] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill className="border-white/10 bg-white/5 text-zinc-300">{item.kind === 'job' ? 'Job' : 'Gig'}</Pill>
                      <Pill className="border-white/10 bg-white/5 text-zinc-300">{item.status}</Pill>
                      {isStale(item) ? (
                        <Pill className="border-red-500/30 bg-red-500/10 text-red-200">{STALE_DAYS}+ days, no dispute</Pill>
                      ) : null}
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
                <p className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
                  <ArrowRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${accentText(accent)}`} />
                  <span>
                    <span className="font-medium text-zinc-200">Next: </span>
                    {nextStep(item)}
                  </span>
                </p>
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
