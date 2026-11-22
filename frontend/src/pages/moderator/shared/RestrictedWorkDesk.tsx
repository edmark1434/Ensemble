import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { AlertTriangle, Coins, ExternalLink, Info, Loader2, RefreshCw, Scale, Search, X } from 'lucide-react';
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

/** Same rule as the dashboards' red alert (countStaleRestrictedContracts). */
const STALE_DAYS = 7;
/** Which restriction decides the next step when both sides are restricted. */
const REASON_ORDER: Reason[] = ['banned', 'locked', 'team_leader', 'suspended'];

const REASON_GUIDE: { id: Reason; label: string; tone: string; text: string }[] = [
  {
    id: 'banned',
    label: 'Banned',
    tone: 'text-red-300',
    text: 'Will not come back. Settle the escrow with the other side.',
  },
  {
    id: 'locked',
    label: 'Locked',
    tone: 'text-amber-300',
    text: 'Frozen while staff review the account. Settle if the review will take a while.',
  },
  {
    id: 'suspended',
    label: 'Suspended',
    tone: 'text-sky-300',
    text: 'Ends on its own at a set time. Usually just wait.',
  },
  {
    id: 'team_leader',
    label: 'Team leader',
    tone: 'text-zinc-200',
    text: "The team's leader is banned, locked or missing. The team keeps working but cannot take new work or pay out until Support transfers ownership or the penalty ends.",
  },
];

const POP_WIDTH = 340;
const EDGE = 12;
const GAP = 8;

/**
 * Explanation that stays out of the way: hovering the button shows it, clicking keeps it open,
 * Esc or a click elsewhere closes it.
 */
function HoverInfo({
  title,
  label,
  width = POP_WIDTH,
  buttonClassName,
  children,
}: {
  title: string;
  /** Text beside the ⓘ; without it the button is the icon alone. */
  label?: string;
  width?: number;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const popId = useId();

  const cancelClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const show = () => {
    cancelClose();
    setOpen(true);
  };
  const hideSoon = () => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };
  const close = () => {
    cancelClose();
    setOpen(false);
    setPinned(false);
  };

  const place = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const w = Math.min(width, window.innerWidth - EDGE * 2);
    const height = popRef.current?.offsetHeight ?? 0;
    const left = Math.min(Math.max(EDGE, rect.left + rect.width / 2 - w / 2), window.innerWidth - w - EDGE);
    const below = rect.bottom + GAP;
    const fitsBelow = below + height <= window.innerHeight - EDGE;
    const above = rect.top - GAP - height;
    setPos({ top: fitsBelow || above < EDGE ? below : above, left, width: w });
  }, [width]);

  // Measured after the popover renders (hidden), so it can open above the button near the bottom.
  useLayoutEffect(() => {
    if (open) place();
    else setPos(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: Event) => {
      const target = event.target as Node;
      if (popRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
      setPinned(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setPinned(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(
    () => () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    },
    []
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label ? undefined : title}
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onMouseEnter={show}
        onMouseLeave={hideSoon}
        onClick={() => {
          if (pinned) close();
          else {
            cancelClose();
            setOpen(true);
            setPinned(true);
          }
        }}
        className={
          buttonClassName ||
          `inline-flex shrink-0 items-center gap-1 rounded-md text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${
            open ? 'text-white' : 'text-zinc-500 hover:text-zinc-200'
          }`
        }
      >
        <Info className="h-3.5 w-3.5" />
        {label ? <span>{label}</span> : null}
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            id={popId}
            role="dialog"
            aria-label={title}
            onMouseEnter={cancelClose}
            onMouseLeave={hideSoon}
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              width: pos?.width ?? width,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className="fixed z-[90] max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#0f1016] p-4 text-left shadow-2xl shadow-black/60 motion-safe:animate-[console-fade_0.15s_ease-out_backwards]"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-white">{title}</p>
              {pinned ? (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={close}
                  className="-mr-1 -mt-1 rounded-md p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

function PopSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <ul className="space-y-1 text-xs leading-relaxed text-zinc-400">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Header ⓘ: why this list exists and what to do with it. */
function QueueInfo() {
  return (
    <HoverInfo title="Why this list exists" width={380}>
      <p className="text-xs leading-relaxed text-zinc-300">
        When someone is punished in the middle of a contract, they can't finish it, and the credits held for it stay
        stuck in escrow. Punishments never move credits by themselves, so staff use this list to make sure the other
        side gets the work or their credits back.
      </p>
      <PopSection
        title="Shown here"
        items={[
          'Job and gig contracts still running, waiting to start or waiting on a signature.',
          'One side is suspended, locked or banned, or is a team whose leader is.',
          'Oldest first, with the credits still in escrow and any open dispute.',
          'A contract leaves the list on its own once it ends or both sides can act again.',
        ]}
      />
      <PopSection
        title="Already done automatically"
        items={[
          'The other side was told, and is told again when the restricted side is back.',
          'Automatic refunds, cancellations and missed-review warnings wait or are skipped, so nobody is punished twice.',
          "An open dispute freezes the contract's escrow.",
        ]}
      />
      <PopSection
        title="What you can do"
        items={[
          'Open contract: see the milestones, escrow and chat.',
          'Open the dispute: give the escrow to one side or split it, then close the case.',
          'No dispute yet: the other side can open one from the contract, or contact Support.',
          'Hover "What to do" on a contract for the next step.',
        ]}
      />
    </HoverInfo>
  );
}

/** Filter ⓘ: what each restriction means for the contract. */
function ReasonInfo() {
  return (
    <HoverInfo title="What each reason means" width={320}>
      <dl className="space-y-2">
        {REASON_GUIDE.map((reason) => (
          <div key={reason.id}>
            <dt className={`text-xs font-semibold ${reason.tone}`}>{reason.label}</dt>
            <dd className="text-xs leading-relaxed text-zinc-400">{reason.text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-white/[0.06] pt-2 text-[11px] leading-relaxed text-zinc-500">
        <span className="text-red-300">{STALE_DAYS}+ days, no dispute</span> marks a banned or locked side that long with
        nothing settling it. The dashboards show the same red alert.
      </p>
    </HoverInfo>
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
    return `Settle the escrow in ${item.openDispute.number || 'the open dispute'}: give it to one side or split it, then close the case.`;
  }
  if (item.escrowCredits === 0) {
    return 'No credits are held, so nothing is stuck. It leaves this list when the contract ends or the penalty lifts.';
  }
  const parties = restrictedParties(item);
  const reason = REASON_ORDER.find((id) => parties.some((party) => party.reason === id));
  switch (reason) {
    case 'banned':
      return 'The banned side will not come back. Ask the other side to open a dispute from the contract so the escrow can be settled.';
    case 'locked':
      return 'Locked while staff review the account. If that will take a while, the other side can open a dispute to settle the escrow.';
    case 'team_leader':
      return "The team keeps working on this contract. Support can transfer the team's ownership, or it resumes when the leader's penalty ends.";
    case 'suspended': {
      const ends = formatWhen(parties.find((party) => party.reason === 'suspended')?.standing?.endsAt);
      return `${ends ? `The suspension ends ${ends}.` : 'The suspension ends on its own.'} Usually just wait; the other side can open a dispute if they can't.`;
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
            <h1 className="flex items-center gap-2 text-xl font-bold text-white">
              Live work with a restricted party
              <QueueInfo />
            </h1>
            <p className="mt-1 max-w-2xl text-xs text-zinc-500">
              Contracts where one side was punished and can't act. Make sure the other side isn't left with stuck credits.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-200 transition hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="space-y-4 px-6 py-6 md:px-8">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="ml-1">
              <ReasonInfo />
            </span>
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
                    <HoverInfo
                      title="What to do"
                      label="What to do"
                      width={300}
                      buttonClassName="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 transition hover:bg-white/10"
                    >
                      <p className="text-xs leading-relaxed text-zinc-300">{nextStep(item)}</p>
                    </HoverInfo>
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
