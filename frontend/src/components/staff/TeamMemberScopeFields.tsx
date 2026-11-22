import { useMemo, useState, type ComponentType } from 'react';
import { Check, Crown, Info, ListChecks, Search, Users } from 'lucide-react';

/**
 * Who a team penalty reaches: the team leader, specific members or all members. Ban / suspend /
 * lock (and their lifts) also change the team account; warnings and forum timeouts land only on
 * the people, because teams have no Platform Merit and never post. A team penalty always reaches
 * people: there is no "team only" choice (the server refuses one too).
 */
export type TeamMemberScope = 'leader' | 'selected' | 'all';
export type TeamScopeValue = { scope: TeamMemberScope; memberAccountIds: string[] };
export type TeamScopeMember = {
  accountId: string;
  name: string;
  handle?: string | null;
  role?: string | null;
  /** The member's own account standing. */
  status?: string | null;
  /** The member's own Platform Merit, shown beside them (warnings move it). */
  merit?: number | null;
  forumTimeout?: boolean;
  /** The running forum timeout was set together with this team. */
  forumTimeoutViaTeam?: boolean;
};
type ScopeLeader = { accountId: string; name: string; status?: string | null } | null | undefined;
export type ScopeTone = 'rose' | 'amber' | 'zinc' | 'emerald';

/** Higher is stricter; a member already at the same or a stricter standing is left alone. */
const SEVERITY: Record<string, number> = { active: 0, deactivated: 0, suspended: 1, locked: 2, banned: 3 };

/** Literal class strings per tone, so Tailwind keeps them. Matches each action's confirm button. */
const TONES: Record<ScopeTone, { card: string; iconBox: string; icon: string; check: string; row: string; badge: string }> = {
  rose: {
    card: 'border-rose-400/45 bg-rose-500/[0.07]',
    iconBox: 'bg-rose-500/15',
    icon: 'text-rose-300',
    check: 'border-rose-400 bg-rose-500 text-white',
    row: 'border-rose-400/25 bg-rose-500/[0.06]',
    badge: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  },
  amber: {
    card: 'border-amber-400/45 bg-amber-500/[0.07]',
    iconBox: 'bg-amber-500/15',
    icon: 'text-amber-300',
    check: 'border-amber-400 bg-amber-500 text-zinc-950',
    row: 'border-amber-400/25 bg-amber-500/[0.06]',
    badge: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  },
  zinc: {
    card: 'border-white/35 bg-white/[0.06]',
    iconBox: 'bg-white/10',
    icon: 'text-zinc-100',
    check: 'border-white bg-white text-zinc-900',
    row: 'border-white/20 bg-white/[0.05]',
    badge: 'border-white/20 bg-white/[0.06] text-zinc-200',
  },
  emerald: {
    card: 'border-emerald-400/45 bg-emerald-500/[0.07]',
    iconBox: 'bg-emerald-500/15',
    icon: 'text-emerald-300',
    check: 'border-emerald-400 bg-emerald-500 text-zinc-950',
    row: 'border-emerald-400/25 bg-emerald-500/[0.06]',
    badge: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  },
};

export function teamScopeTone(mode: 'apply' | 'lift', targetStatus?: 'banned' | 'suspended' | 'locked'): ScopeTone {
  if (mode === 'lift') return 'emerald';
  if (targetStatus === 'banned') return 'rose';
  if (targetStatus === 'locked') return 'zinc';
  return 'amber';
}

function standingOf(status: string | null | undefined) {
  return String(status || 'active').toLowerCase();
}

/**
 * Sanctions reach the leader by default (every member when the team has no leader); lifts reach
 * every member whose penalty came with the team.
 */
export function defaultTeamScope(mode: 'apply' | 'lift', leader: ScopeLeader): TeamScopeValue {
  if (mode === 'lift' || !leader) return { scope: 'all', memberAccountIds: [] };
  return { scope: 'leader', memberAccountIds: [] };
}

export function teamScopeReady(value: TeamScopeValue) {
  return value.scope !== 'selected' || value.memberAccountIds.length > 0;
}

/** Request fields for the chosen scope (the server checks each member again). */
export function teamScopeRequest(value: TeamScopeValue) {
  return {
    memberScope: value.scope,
    memberAccountIds: value.scope === 'selected' ? value.memberAccountIds : undefined,
  };
}

/** One selectable card in a scope radio group. Shared with the bulk team action dialog. */
export function TeamScopeOptionCard({
  name,
  checked,
  disabled = false,
  onSelect,
  icon: Icon,
  title,
  hint,
  tone,
  layout = 'row',
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  tone: ScopeTone;
  /** `tile` stacks icon, title and hint for a grid of cards; `row` lays them out in one line. */
  layout?: 'row' | 'tile';
}) {
  const t = TONES[tone];
  const check = (
    <span
      aria-hidden
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
        checked ? t.check : 'border-white/20'
      }`}
    >
      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
    </span>
  );
  const icon = (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
        checked ? t.iconBox : 'bg-white/[0.05]'
      }`}
    >
      <Icon className={`h-4 w-4 ${checked ? t.icon : 'text-zinc-400'}`} />
    </span>
  );
  return (
    <label
      className={`relative flex rounded-xl border p-3 transition-colors has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-white/25 ${
        layout === 'tile' ? 'flex-col gap-2' : 'items-center gap-3'
      } ${checked ? t.card : 'border-white/[0.08] bg-white/[0.015]'} ${
        disabled ? 'cursor-not-allowed opacity-45' : checked ? 'cursor-pointer' : 'cursor-pointer hover:border-white/[0.18] hover:bg-white/[0.035]'
      }`}
    >
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onSelect} className="sr-only" />
      {layout === 'tile' ? (
        <>
          <span className="flex items-center justify-between">
            {icon}
            {check}
          </span>
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="block text-[11px] leading-snug text-zinc-500">{hint}</span>
        </>
      ) : (
        <>
          {icon}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">{title}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-zinc-500">{hint}</span>
          </span>
          {check}
        </>
      )}
    </label>
  );
}

function MemberInitial({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-xs font-bold uppercase text-zinc-200">
      {(name || '?').charAt(0)}
    </span>
  );
}

const STATUS_CHIP: Record<string, string> = {
  banned: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  locked: 'border-white/20 bg-white/[0.06] text-zinc-200',
  suspended: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
};

/** Members already timed out are left as they are by a team timeout. */
export function timedOutAlready(member: TeamScopeMember) {
  return member.forumTimeout ? 'Already timed out' : null;
}

/** Clearing a team's timeouts ends only those set together with the team. */
export function timeoutLiftable(member: TeamScopeMember) {
  return Boolean(member.forumTimeoutViaTeam);
}

function meritChipTone(merit: number) {
  if (merit >= 80) return 'text-emerald-300';
  if (merit > 60) return 'text-amber-200';
  return 'text-rose-300';
}

export function TeamMemberScopeFields({
  mode,
  verb,
  targetStatus,
  leader,
  members,
  value,
  onChange,
  dense = false,
  covered,
  liftable,
  teamIncluded = true,
  tone: toneOverride,
  title,
  subtitle,
  footnote,
  showMerit = false,
}: {
  mode: 'apply' | 'lift';
  /** e.g. "ban", "suspend", "lock", "warn", "time out", "remove the ban from". */
  verb: string;
  /** For `apply`: the standing the action sets, to mark members already as strict or stricter. */
  targetStatus?: 'banned' | 'suspended' | 'locked';
  leader: ScopeLeader;
  /** Active members (leader included). */
  members: TeamScopeMember[];
  value: TeamScopeValue;
  onChange: (next: TeamScopeValue) => void;
  /** Narrow dialogs: one card per row. */
  dense?: boolean;
  /**
   * For `apply`: a label when the member already has it and is left as is (e.g. "Already timed
   * out"). Replaces the standing check `targetStatus` does.
   */
  covered?: (member: TeamScopeMember) => string | null;
  /** For `lift`: who actually has something to lift (others are left alone). */
  liftable?: (member: TeamScopeMember) => boolean;
  /** False for warnings and timeouts: only the people change, never the team account. */
  teamIncluded?: boolean;
  tone?: ScopeTone;
  title?: string;
  subtitle?: string;
  footnote?: string;
  /** Show each member's Platform Merit (warnings move it). */
  showMerit?: boolean;
}) {
  const [query, setQuery] = useState('');
  const tone = toneOverride || teamScopeTone(mode, targetStatus);
  const t = TONES[tone];
  const leaderId = leader?.accountId ? String(leader.accountId) : null;
  const leaderMember = members.find((member) => member.accountId === leaderId) || null;

  /** Why a member is left as is by this action, or null. */
  const coveredLabel = (member: TeamScopeMember): string | null => {
    if (mode !== 'apply') return null;
    if (covered) return covered(member);
    if (targetStatus && (SEVERITY[standingOf(member.status)] ?? 0) >= SEVERITY[targetStatus]) {
      return `Already ${standingOf(member.status)}`;
    }
    return null;
  };
  const alreadyStrict = (member: TeamScopeMember) => Boolean(coveredLabel(member));
  const eligible = members.filter((member) => !alreadyStrict(member));
  const strictCount = members.length - eligible.length;
  const leaderStrict = Boolean(leader && alreadyStrict(leaderMember || { ...leader, accountId: String(leader.accountId), name: leader.name }));
  const liftCount = mode === 'lift' && liftable ? members.filter(liftable).length : null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^@/, '');
    if (!term) return members;
    return members.filter((member) =>
      [member.name, member.handle, member.role].some((part) => String(part || '').toLowerCase().includes(term))
    );
  }, [members, query]);

  const picked = new Set(value.memberAccountIds);
  const pickedCount = members.filter((member) => picked.has(member.accountId) && !alreadyStrict(member)).length;
  const setPicked = (ids: Iterable<string>) => onChange({ scope: 'selected', memberAccountIds: [...new Set(ids)] });

  /** How many people the current choice changes (besides the team, when it changes too). */
  const reach =
    value.scope === 'leader' ? (leader && !leaderStrict ? 1 : 0) : value.scope === 'all' ? eligible.length : pickedCount;
  const verbTitle = verb.charAt(0).toUpperCase() + verb.slice(1);
  const strictWord = covered ? 'already have it' : 'already as strict';

  const options: { id: TeamMemberScope; icon: ComponentType<{ className?: string }>; title: string; hint: string; disabled?: boolean }[] = [
    {
      id: 'leader',
      icon: Crown,
      title: 'Team leader',
      hint: !leader
        ? 'This team has no active leader.'
        : mode === 'lift'
          ? `${leader.name}, if theirs was set with the team.`
          : leaderStrict
            ? `${leader.name}: ${String(coveredLabel(leaderMember || { ...leader, accountId: String(leader.accountId) })).toLowerCase()}, so stays as is.`
            : `${leader.name} answers for the team.`,
      disabled: !leader,
    },
    {
      id: 'selected',
      icon: ListChecks,
      title: 'Specific members',
      hint: !members.length
        ? 'No active members to pick.'
        : value.scope === 'selected'
          ? `${pickedCount} picked below.`
          : 'Choose exactly who from the roster.',
      disabled: !members.length,
    },
    {
      id: 'all',
      icon: Users,
      title: `All members${members.length ? ` (${members.length})` : ''}`,
      hint: !members.length
        ? 'No active members.'
        : mode === 'lift'
          ? liftCount != null
            ? `${liftCount} ${liftCount === 1 ? 'has' : 'have'} one set with the team.`
            : 'Everyone whose penalty was set with the team.'
          : strictCount
            ? `Leader included. ${strictCount} ${strictWord} and stay as is.`
            : 'Every active member, leader included.',
      disabled: !members.length,
    },
  ];

  const nobody = !leader && !members.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <header className={`flex items-start justify-between gap-3 border-b border-white/[0.06] ${dense ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${t.iconBox}`}>
            <Users className={`h-3.5 w-3.5 ${t.icon}`} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {title || (mode === 'apply' ? `${verbTitle} with the team` : 'Lift member penalties too')}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
              {subtitle ||
                (mode === 'apply'
                  ? teamIncluded
                    ? 'The team account always gets it. Choose the people who answer for it.'
                    : 'Only people get this; the team account does not change. Choose who.'
                  : 'The team is restored. Choose whose team-linked penalty ends with it.')}
            </p>
          </div>
        </div>
        {mode === 'apply' && !nobody ? (
          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tabular-nums ${t.badge}`}>
            {teamIncluded ? 'Team + ' : ''}
            {reach} {reach === 1 ? 'person' : 'people'}
          </span>
        ) : null}
      </header>

      {nobody ? (
        <p className={`flex items-start gap-2 text-xs text-zinc-400 ${dense ? 'p-3' : 'px-4 py-3'}`}>
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />
          {teamIncluded
            ? 'This team has no active leader or members, so only the team account changes.'
            : 'This team has no active members, so there is nobody to act on.'}
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label={mode === 'apply' ? `Who else to ${verb}` : 'Whose penalties to lift'}
          className={`grid gap-2 ${dense ? 'p-2.5' : 'p-3 sm:grid-cols-3'}`}
        >
          {options.map((option) => (
            <TeamScopeOptionCard
              key={option.id}
              name="team-member-scope"
              checked={value.scope === option.id}
              disabled={option.disabled}
              onSelect={() =>
                onChange({ scope: option.id, memberAccountIds: option.id === 'selected' ? value.memberAccountIds : [] })
              }
              icon={option.icon}
              title={option.title}
              hint={option.hint}
              tone={tone}
              layout={dense ? 'row' : 'tile'}
            />
          ))}
        </div>
      )}

      {value.scope === 'selected' && members.length ? (
        <div className={`border-t border-white/[0.06] ${dense ? 'p-2.5' : 'px-3 pb-3 pt-3'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, @handle or role"
                aria-label="Search team members"
                className="w-full rounded-lg border border-white/10 bg-black/25 py-1.5 pl-8 pr-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
              />
            </div>
            <button
              type="button"
              onClick={() => setPicked([...picked, ...filtered.filter((member) => !alreadyStrict(member)).map((member) => member.accountId)])}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              Select {query.trim() ? 'shown' : 'all'}
            </button>
            <button
              type="button"
              onClick={() => setPicked([])}
              disabled={!picked.size}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <ul className="scroll-thin mt-2 max-h-60 space-y-1 overflow-y-auto pr-1">
            {filtered.map((member) => {
              const strict = alreadyStrict(member);
              const strictLabel = coveredLabel(member);
              const status = standingOf(member.status);
              const isLeader = leaderId === String(member.accountId);
              const checked = !strict && picked.has(member.accountId);
              return (
                <li key={member.accountId}>
                  <label
                    className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-white/25 ${
                      checked ? t.row : 'border-transparent'
                    } ${strict ? 'cursor-not-allowed opacity-50' : checked ? 'cursor-pointer' : 'cursor-pointer hover:bg-white/[0.03]'}`}
                  >
                    <input
                      type="checkbox"
                      disabled={strict}
                      checked={checked}
                      onChange={(event) => {
                        const next = new Set(picked);
                        if (event.target.checked) next.add(member.accountId);
                        else next.delete(member.accountId);
                        setPicked(next);
                      }}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors ${
                        checked ? t.check : 'border-white/20'
                      }`}
                    >
                      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <MemberInitial name={member.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-100">{member.name}</span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        {member.handle ? `@${member.handle}` : 'No handle'}
                        {!isLeader && member.role ? ` · ${member.role}` : ''}
                      </span>
                    </span>
                    {isLeader ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                        <Crown className="h-3 w-3" />
                        Leader
                      </span>
                    ) : null}
                    {showMerit && member.merit != null ? (
                      <span className={`shrink-0 text-[10px] tabular-nums ${meritChipTone(member.merit)}`}>Merit {member.merit}</span>
                    ) : null}
                    {mode === 'lift' && liftable && liftable(member) ? (
                      <span className="shrink-0 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200">
                        Set with team
                      </span>
                    ) : null}
                    {strictLabel ? (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${
                          STATUS_CHIP[status] || 'border-white/10 text-zinc-300'
                        }`}
                      >
                        {strictLabel}
                      </span>
                    ) : status !== 'active' ? (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize ${
                          STATUS_CHIP[status] || 'border-white/10 text-zinc-300'
                        }`}
                      >
                        {status}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
            {!filtered.length ? (
              <li className="px-2.5 py-4 text-center text-xs text-zinc-500">No member matches “{query.trim()}”.</li>
            ) : null}
          </ul>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className="tabular-nums text-zinc-500">
              {pickedCount} of {eligible.length} picked
              {strictCount ? ` · ${strictCount} ${strictWord}` : ''}
            </span>
            {!pickedCount ? <span className="text-amber-300">Pick at least one member.</span> : null}
          </div>
        </div>
      ) : null}

      {!nobody ? (
        <p
          className={`flex items-start gap-2 border-t border-white/[0.06] text-[11px] leading-snug text-zinc-500 ${
            dense ? 'px-3 py-2' : 'px-4 py-2.5'
          }`}
        >
          <Info className="mt-px h-3.5 w-3.5 shrink-0 text-zinc-600" />
          {footnote ||
            (mode === 'apply'
              ? 'Each person gets the same penalty and length, and their reason says it came with the team. Accounts you may not act on stop the action, except with All members, where they are skipped.'
              : 'Only penalties set together with this team are lifted. Other member penalties stay; change them from the Users tab.')}
        </p>
      ) : null}
    </section>
  );
}
