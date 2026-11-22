import { useMemo, useState } from 'react';

/** Who besides the team account a team ban / suspend / lock (or its lift) reaches. */
export type TeamMemberScope = 'none' | 'leader' | 'selected' | 'all';
export type TeamScopeValue = { scope: TeamMemberScope; memberAccountIds: string[] };
export type TeamScopeMember = {
  accountId: string;
  name: string;
  handle?: string | null;
  role?: string | null;
  /** The member's own account standing. */
  status?: string | null;
};
type ScopeLeader = { accountId: string; name: string; status?: string | null } | null | undefined;

/** Higher is stricter; a member already at the same or a stricter standing is left alone. */
const SEVERITY: Record<string, number> = { active: 0, deactivated: 0, suspended: 1, locked: 2, banned: 3 };

function standingOf(status: string | null | undefined) {
  return String(status || 'active').toLowerCase();
}

/** Sanctions reach the leader by default; lifts reach every member whose penalty came with the team. */
export function defaultTeamScope(mode: 'apply' | 'lift', leader: ScopeLeader): TeamScopeValue {
  if (mode === 'lift') return { scope: 'all', memberAccountIds: [] };
  return { scope: leader ? 'leader' : 'none', memberAccountIds: [] };
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

export function TeamMemberScopeFields({
  mode,
  verb,
  targetStatus,
  leader,
  members,
  value,
  onChange,
  dense = false,
}: {
  mode: 'apply' | 'lift';
  /** e.g. "ban", "suspend", "lock", "remove the ban from". */
  verb: string;
  /** For `apply`: the standing the action sets, to mark members already as strict or stricter. */
  targetStatus?: 'banned' | 'suspended' | 'locked';
  leader: ScopeLeader;
  /** Active members (leader included). */
  members: TeamScopeMember[];
  value: TeamScopeValue;
  onChange: (next: TeamScopeValue) => void;
  dense?: boolean;
}) {
  const [query, setQuery] = useState('');
  const text = dense ? 'text-xs' : 'text-sm';
  const hint = dense ? 'text-[11px]' : 'text-xs';
  const leaderId = leader?.accountId ? String(leader.accountId) : null;

  const alreadyStrict = (member: TeamScopeMember) =>
    mode === 'apply' && targetStatus
      ? (SEVERITY[standingOf(member.status)] ?? 0) >= SEVERITY[targetStatus]
      : false;
  const eligibleCount = members.filter((member) => !alreadyStrict(member)).length;
  const leaderStrict = Boolean(leader && alreadyStrict(leader));

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return members;
    return members.filter((member) =>
      [member.name, member.handle, member.role].some((part) => String(part || '').toLowerCase().includes(term))
    );
  }, [members, query]);

  const picked = new Set(value.memberAccountIds);
  const setPicked = (ids: Iterable<string>) => onChange({ scope: 'selected', memberAccountIds: [...new Set(ids)] });

  const options: { id: TeamMemberScope; label: string; hint: string; disabled?: boolean }[] = [
    {
      id: 'none',
      label: 'Team only',
      hint: 'Member accounts stay as they are.',
    },
    {
      id: 'leader',
      label: leader ? `Team leader only, ${leader.name}` : 'Team leader only',
      hint: !leader
        ? 'This team has no active leader.'
        : mode === 'apply'
          ? leaderStrict
            ? `${leader.name} is already ${standingOf(leader.status)}, so their account stays as it is.`
            : 'The leader answers for the team. Their personal account gets the same penalty and length.'
          : 'Lifts the leader’s penalty if it was set together with this team.',
      disabled: !leader,
    },
    {
      id: 'selected',
      label: 'Specific members',
      hint: members.length ? 'Pick who gets it below.' : 'This team has no active members.',
      disabled: !members.length,
    },
    {
      id: 'all',
      label: `All members (${members.length})`,
      hint:
        mode === 'apply'
          ? `Every active member, the leader included${
              eligibleCount < members.length ? `; ${members.length - eligibleCount} already as strict or stricter stay as they are` : ''
            }. Accounts you may not act on are skipped.`
          : 'Every active member whose penalty was set together with this team.',
      disabled: !members.length,
    },
  ];

  return (
    <div className={`rounded-xl border border-white/[0.08] bg-white/[0.02] ${dense ? 'p-2.5' : 'p-3'}`}>
      <p className={`${hint} font-semibold uppercase tracking-wide text-zinc-500`}>
        {mode === 'apply' ? `Who else to ${verb}` : 'Also lift member penalties for'}
      </p>
      <div className="mt-2 space-y-1.5">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex items-start gap-2.5 ${text} ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} text-zinc-200`}
          >
            <input
              type="radio"
              name="team-member-scope"
              checked={value.scope === option.id}
              disabled={option.disabled}
              onChange={() => onChange({ scope: option.id, memberAccountIds: option.id === 'selected' ? value.memberAccountIds : [] })}
              className="mt-0.5 h-4 w-4 border-white/20 bg-transparent accent-rose-500"
            />
            <span>
              <span className="font-medium text-white">{option.label}</span>
              <span className={`mt-0.5 block ${hint} text-zinc-500`}>{option.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {value.scope === 'selected' && members.length ? (
        <div className="mt-3 rounded-lg border border-white/[0.08] bg-black/20 p-2">
          <div className="flex flex-wrap items-center gap-2">
            {members.length > 6 ? (
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members"
                className={`min-w-0 flex-1 rounded-lg border border-white/10 bg-transparent px-2 py-1 ${hint} text-white outline-none placeholder:text-zinc-600 focus:border-sky-400/50`}
              />
            ) : (
              <span className={`flex-1 ${hint} text-zinc-500`}>{picked.size} picked</span>
            )}
            <button
              type="button"
              onClick={() => setPicked([...picked, ...filtered.filter((member) => !alreadyStrict(member)).map((member) => member.accountId)])}
              className={`rounded-md border border-white/10 px-2 py-0.5 ${hint} text-zinc-300 hover:bg-white/[0.05]`}
            >
              Pick {query.trim() ? 'shown' : 'all'}
            </button>
            <button
              type="button"
              onClick={() => setPicked([])}
              className={`rounded-md border border-white/10 px-2 py-0.5 ${hint} text-zinc-300 hover:bg-white/[0.05]`}
            >
              Clear
            </button>
          </div>
          <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto pr-1">
            {filtered.map((member) => {
              const strict = alreadyStrict(member);
              const status = standingOf(member.status);
              const isLeader = leaderId === String(member.accountId);
              return (
                <li key={member.accountId}>
                  <label
                    className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${text} ${
                      strict ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/[0.03]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={strict}
                      checked={!strict && picked.has(member.accountId)}
                      onChange={(event) => {
                        const next = new Set(picked);
                        if (event.target.checked) next.add(member.accountId);
                        else next.delete(member.accountId);
                        setPicked(next);
                      }}
                      className="h-4 w-4 rounded border-white/20 bg-transparent accent-rose-500"
                    />
                    <span className="min-w-0 flex-1 truncate text-zinc-200">
                      {member.name}
                      {member.handle ? <span className="text-zinc-500"> @{member.handle}</span> : null}
                    </span>
                    {isLeader || member.role ? (
                      <span className={`${hint} text-zinc-500`}>{isLeader ? 'Leader' : member.role}</span>
                    ) : null}
                    {status !== 'active' ? (
                      <span className={`rounded-full border border-white/10 px-1.5 ${hint} capitalize text-zinc-300`}>
                        {strict ? `already ${status}` : status}
                      </span>
                    ) : null}
                  </label>
                </li>
              );
            })}
            {!filtered.length ? <li className={`px-1.5 py-1 ${hint} text-zinc-500`}>No member matches.</li> : null}
          </ul>
          {!picked.size ? <p className={`mt-1 ${hint} text-amber-300`}>Pick at least one member.</p> : null}
        </div>
      ) : null}

      {mode === 'lift' && value.scope !== 'none' ? (
        <p className={`mt-2 ${hint} text-zinc-500`}>
          Only penalties set together with this team are lifted. Other member penalties stay; change them from the Users tab.
        </p>
      ) : mode === 'apply' && value.scope !== 'none' ? (
        <p className={`mt-2 ${hint} text-zinc-500`}>
          Each member gets the same penalty and length, and the reason tells them it came with the team.
        </p>
      ) : null}
    </div>
  );
}
