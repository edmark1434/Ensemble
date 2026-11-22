import { useMemo, useState, type ComponentType } from "react";
import { Briefcase, Check, Crown, Info, ListChecks, Search, Users } from "lucide-react";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";

/**
 * "Who answers on their side" on the dispute form. Only a client disputing the freelancer side
 * gets it: the freelancer's team and the people working this contract (included members and
 * subcontractors). The team leader answers by default; the client may pick people or everyone.
 * The server checks the picks again against the live roster (`GET /api/contracts/:id/dispute-members`).
 */

export type DisputeMemberScope = "leader" | "selected" | "all";
export type DisputeMemberValue = { scope: DisputeMemberScope; memberAccountIds: string[] };

export type DisputeSideAccount = {
  accountId: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  isTeam: boolean;
  teamType: string | null;
  status: string;
};

export type DisputeRosterMember = {
  accountId: string;
  name: string;
  handle: string | null;
  avatar: string | null;
  teamRole: string | null;
  contractRole: string | null;
  onContract: boolean;
  onTeam: boolean;
  isLeader: boolean;
};

export type DisputeMemberOptions = {
  contractId: string;
  viewerSide: "client" | "freelancer";
  filingAs: DisputeSideAccount | null;
  respondent: DisputeSideAccount | null;
  canNameMembers: boolean;
  reason: string | null;
  group: {
    team: { accountId: string; name: string; handle: string | null; avatar: string | null; memberCount: number } | null;
    contractTeam: { accountId: string; name: string; handle: string | null } | null;
    leader: DisputeRosterMember | null;
    members: DisputeRosterMember[];
  } | null;
  defaultScope: DisputeMemberScope | null;
};

export function defaultMemberValue(options: DisputeMemberOptions | null): DisputeMemberValue {
  return { scope: options?.defaultScope || "leader", memberAccountIds: [] };
}

/** The people the current choice names, for the summary and the submit body. */
export function namedPeople(options: DisputeMemberOptions | null, value: DisputeMemberValue): DisputeRosterMember[] {
  const group = options?.group;
  if (!group) return [];
  if (value.scope === "leader") return group.leader ? [group.leader] : [];
  if (value.scope === "all") return group.members;
  const picked = new Set(value.memberAccountIds);
  return group.members.filter((member) => picked.has(member.accountId));
}

export function memberValueReady(options: DisputeMemberOptions | null, value: DisputeMemberValue) {
  if (!options?.canNameMembers) return true;
  return namedPeople(options, value).length > 0;
}

/** Request fields for the choice; nothing when the other side is one person. */
export function memberRequest(options: DisputeMemberOptions | null, value: DisputeMemberValue) {
  if (!options?.canNameMembers) return {};
  return {
    memberScope: value.scope,
    ...(value.scope === "selected" ? { memberAccountIds: value.memberAccountIds } : {}),
  };
}

function roleLine(member: DisputeRosterMember) {
  const parts = [member.handle ? `@${member.handle}` : null];
  const role = member.contractRole && member.contractRole !== "Contributor" ? member.contractRole : member.teamRole;
  if (role && !member.isLeader) parts.push(role);
  return parts.filter(Boolean).join(" · ") || "Team member";
}

function MemberAvatar({ name, avatar, size = "h-8 w-8" }: { name: string; avatar: string | null; size?: string }) {
  return (
    <img
      src={constructAvatarUrl(avatar, name)}
      alt=""
      onError={(event) => {
        (event.target as HTMLImageElement).src = getFallbackAvatarUrl(name);
      }}
      className={`${size} shrink-0 rounded-full border border-gray-200 object-cover dark:border-zinc-700`}
    />
  );
}

function OptionCard({
  checked,
  disabled,
  onSelect,
  icon: Icon,
  title,
  hint,
}: {
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`relative flex flex-col gap-2 rounded-xl border p-3 transition-colors has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-rose-500/30 ${
        checked
          ? "border-rose-400 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/10"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
      } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <input type="radio" name="dispute-member-scope" checked={checked} disabled={disabled} onChange={onSelect} className="sr-only" />
      <span className="flex items-center justify-between">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            checked ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-zinc-400"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span
          aria-hidden
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-colors ${
            checked ? "border-rose-500 bg-rose-500 text-white" : "border-gray-300 dark:border-white/20"
          }`}
        >
          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>
      </span>
      <span className="block text-sm font-bold text-gray-900 dark:text-white">{title}</span>
      <span className="block text-[11px] leading-snug text-gray-500 dark:text-zinc-400">{hint}</span>
    </label>
  );
}

export function DisputeMemberPicker({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: DisputeMemberOptions;
  value: DisputeMemberValue;
  onChange: (next: DisputeMemberValue) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const group = options.group;
  const members = group?.members || [];
  const leader = group?.leader || null;
  const team = group?.team || null;
  const contractPeople = members.filter((member) => member.onContract);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^@/, "");
    if (!term) return members;
    return members.filter((member) =>
      [member.name, member.handle, member.teamRole, member.contractRole].some((part) =>
        String(part || "").toLowerCase().includes(term)
      )
    );
  }, [members, query]);

  if (!group) return null;

  const picked = new Set(value.memberAccountIds);
  const named = namedPeople(options, value);
  const setPicked = (ids: Iterable<string>) => onChange({ scope: "selected", memberAccountIds: [...new Set(ids)] });
  const sideName = team ? team.name : options.respondent?.name || "the freelancer";

  const cards: { id: DisputeMemberScope; icon: ComponentType<{ className?: string }>; title: string; hint: string; disabled?: boolean }[] = [
    {
      id: "leader",
      icon: Crown,
      title: team ? "Team leader" : "The freelancer only",
      hint: leader
        ? team
          ? `${leader.name} answers for ${team.name}.`
          : `${leader.name} answers alone, as the person you hired.`
        : "This team has no active leader.",
      disabled: !leader,
    },
    {
      id: "selected",
      icon: ListChecks,
      title: "Choose people",
      hint: value.scope === "selected" ? `${named.length} picked below.` : "Pick exactly who was involved.",
    },
    {
      id: "all",
      icon: Users,
      title: `Everyone (${members.length})`,
      hint: team
        ? contractPeople.length && contractPeople.length < members.length
          ? "The whole team, plus everyone on this contract."
          : "Every active member, leader included."
        : "Everyone working this contract with them.",
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/70 dark:border-white/10 dark:bg-white/[0.03]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-3">
          <MemberAvatar name={sideName} avatar={team?.avatar || options.respondent?.avatar || null} size="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
              {team ? `Team ${team.name}` : `${sideName} and their contract team`}
            </p>
            <p className="truncate text-[11px] text-gray-500 dark:text-zinc-400">
              {team ? `${team.memberCount} active member${team.memberCount === 1 ? "" : "s"}` : "Working this contract"}
              {group.contractTeam && contractPeople.length ? ` · ${contractPeople.length} on this contract` : ""}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-rose-300 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {named.length} {named.length === 1 ? "person" : "people"} named
        </span>
      </header>

      <div role="radiogroup" aria-label="Who answers on their side" className="grid gap-2 p-3 sm:grid-cols-3">
        {cards.map((card) => (
          <OptionCard
            key={card.id}
            checked={value.scope === card.id}
            disabled={disabled || card.disabled}
            onSelect={() =>
              onChange({ scope: card.id, memberAccountIds: card.id === "selected" ? value.memberAccountIds : [] })
            }
            icon={card.icon}
            title={card.title}
            hint={card.hint}
          />
        ))}
      </div>

      {value.scope === "selected" ? (
        <div className="border-t border-gray-200 px-3 pb-3 pt-3 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={disabled}
                placeholder="Search name, @handle or role"
                aria-label="Search people on their side"
                className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-2.5 text-xs text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-600"
              />
            </div>
            {contractPeople.length && contractPeople.length < members.length ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setPicked([...picked, ...contractPeople.map((member) => member.accountId)])}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              >
                Everyone on this contract
              </button>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPicked([...picked, ...filtered.map((member) => member.accountId)])}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Select {query.trim() ? "shown" : "all"}
            </button>
            <button
              type="button"
              disabled={disabled || !picked.size}
              onClick={() => setPicked([])}
              className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              Clear
            </button>
          </div>

          <ul className="scroll-thin mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
            {filtered.map((member) => {
              const checked = picked.has(member.accountId);
              return (
                <li key={member.accountId}>
                  <label
                    className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-rose-500/30 ${
                      checked
                        ? "border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/[0.08]"
                        : "border-transparent hover:bg-white dark:hover:bg-white/[0.04]"
                    } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
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
                        checked ? "border-rose-500 bg-rose-500 text-white" : "border-gray-300 bg-white dark:border-white/20 dark:bg-transparent"
                      }`}
                    >
                      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <MemberAvatar name={member.name} avatar={member.avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-zinc-100">{member.name}</span>
                      <span className="block truncate text-[11px] text-gray-500 dark:text-zinc-500">{roleLine(member)}</span>
                    </span>
                    <span className="flex shrink-0 flex-wrap justify-end gap-1">
                      {member.isLeader ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
                          <Crown className="h-3 w-3" />
                          Leader
                        </span>
                      ) : null}
                      {member.onContract && team ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200">
                          <Briefcase className="h-3 w-3" />
                          On this contract
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
            {!filtered.length ? (
              <li className="px-2.5 py-4 text-center text-xs text-gray-500 dark:text-zinc-500">
                No one matches “{query.trim()}”.
              </li>
            ) : null}
          </ul>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className="tabular-nums text-gray-500 dark:text-zinc-500">
              {named.length} of {members.length} picked
            </span>
            {!named.length ? (
              <span className="font-semibold text-rose-600 dark:text-rose-300">Pick at least one person.</span>
            ) : null}
          </div>
        </div>
      ) : named.length ? (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-gray-200 px-4 py-2.5 dark:border-white/10">
          {named.slice(0, 8).map((member) => (
            <span
              key={member.accountId}
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white py-0.5 pl-0.5 pr-2 text-[11px] font-semibold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
            >
              <MemberAvatar name={member.name} avatar={member.avatar} size="h-5 w-5" />
              {member.handle ? `@${member.handle}` : member.name}
              {member.isLeader ? <Crown className="h-3 w-3 text-amber-500" /> : null}
            </span>
          ))}
          {named.length > 8 ? (
            <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400">+{named.length - 8} more</span>
          ) : null}
        </div>
      ) : null}

      <p className="flex items-start gap-2 border-t border-gray-200 px-4 py-2.5 text-[11px] leading-snug text-gray-500 dark:border-white/10 dark:text-zinc-400">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-zinc-500" />
        Named people can read the case and give their side once staff make it public. Staff review what
        each person did before deciding anything; naming someone is not a penalty.
      </p>
    </section>
  );
}
