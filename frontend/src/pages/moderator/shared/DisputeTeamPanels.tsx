import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Briefcase, Check, Crown, Info, ListChecks, Search, UserMinus, Users, Wallet } from "lucide-react";
import { TeamScopeOptionCard, type ScopeTone } from "@/components/staff/TeamMemberScopeFields";
import { Avatar } from "@/pages/user/disputes/disputeUi";
import type { DisputeMemberScope, DisputeRespondentGroup, DisputeRespondentMember } from "./moderatorTypes";
import { StaffStandingSummary, caseWhen } from "./StaffStandingSummary";

/**
 * Staff views of the people behind a dispute's disputee: the team and the contract workspace
 * (included members, subcontractors), who the filer named, and who a ban reaches.
 * Data: `respondentGroup` on the staff dispute detail (services/DisputeMemberServices.js).
 */

export type DisputeScopeValue = { scope: DisputeMemberScope; memberAccountIds: string[] };

const STATUS_CHIP: Record<string, string> = {
  banned: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  locked: "border-white/20 bg-white/[0.06] text-zinc-200",
  suspended: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  deactivated: "border-white/10 bg-white/[0.04] text-zinc-400",
};

const REMOVED_REASON: Record<string, string> = {
  staff_removed: "Taken off by staff",
  parties_swapped: "Cleared when the parties were swapped",
};

function standingOf(member: { status?: string | null }) {
  return String(member.status || "active").toLowerCase();
}

function handleOf(member: { handle: string | null; name: string }) {
  return member.handle ? `@${member.handle}` : member.name;
}

function sideTitle(group: DisputeRespondentGroup) {
  if (group.team) return `Team ${group.team.name}`;
  return `${group.respondent?.name || "The disputee"} and their contract team`;
}

/** The scope the console starts from: who the disputer named, else the leader. */
export function disputeBanScopeDefault(group: DisputeRespondentGroup | null | undefined): DisputeScopeValue {
  if (!group) return { scope: "leader", memberAccountIds: [] };
  return { scope: group.banDefault.scope, memberAccountIds: [...group.banDefault.memberAccountIds] };
}

/** The scope the "change who is named" editor starts from: exactly who is named now. */
export function disputeNamedScopeDefault(group: DisputeRespondentGroup | null | undefined): DisputeScopeValue {
  if (!group) return { scope: "leader", memberAccountIds: [] };
  const named = group.members.filter((member) => member.named && member.onRoster).map((member) => member.accountId);
  if (group.filedScope === "all") return { scope: "all", memberAccountIds: [] };
  if (named.length === 1 && group.leader && named[0] === group.leader.accountId) {
    return { scope: "leader", memberAccountIds: [] };
  }
  return named.length ? { scope: "selected", memberAccountIds: named } : { scope: group.leader ? "leader" : "all", memberAccountIds: [] };
}

/** Request fields for the chosen scope; the server checks each person again. */
export function disputeScopeRequest(value: DisputeScopeValue) {
  return {
    memberScope: value.scope,
    ...(value.scope === "selected" ? { memberAccountIds: value.memberAccountIds } : {}),
  };
}

/**
 * The people a scope reaches. `ban` uses everyone on the side plus named people who left;
 * `name` only the live roster (only someone still on the team or contract can be named).
 */
export function peopleInScope(group: DisputeRespondentGroup, value: DisputeScopeValue, mode: "ban" | "name") {
  const pool = mode === "name" ? group.members.filter((member) => member.onRoster) : group.members;
  const respondentId = group.respondent?.accountId || null;
  let people: DisputeRespondentMember[];
  if (value.scope === "leader") people = group.leader ? [group.leader] : [];
  else if (value.scope === "all") people = pool;
  else {
    const picked = new Set(value.memberAccountIds);
    people = pool.filter((member) => picked.has(member.accountId));
  }
  // In a ban the disputee account itself is banned as the respondent, not again as a member.
  return mode === "ban" ? people.filter((member) => member.accountId !== respondentId) : people;
}

/**
 * A team ban always reaches someone on the team (the team rules), so with a team disputee the
 * picks must include at least one team member, not only subcontractors or people who left.
 */
function banMissesTeam(group: DisputeRespondentGroup, people: DisputeRespondentMember[]) {
  return Boolean(group.respondent?.isTeam && group.members.some((member) => member.onTeam) && !people.some((member) => member.onTeam));
}

export function disputeScopeReady(group: DisputeRespondentGroup | null | undefined, value: DisputeScopeValue, mode: "ban" | "name") {
  if (!group) return true;
  if (value.scope === "leader") return Boolean(group.leader);
  if (value.scope === "all") return true;
  const people = peopleInScope(group, value, mode);
  if (!people.length) return false;
  return mode === "ban" ? !banMissesTeam(group, people) : true;
}

function Chip({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${className}`}>
      {children}
    </span>
  );
}

function MemberChips({ member, mode }: { member: DisputeRespondentMember; mode?: "ban" | "name" }) {
  const status = standingOf(member);
  return (
    <>
      {member.isLeader ? (
        <Chip className="border-amber-300/25 bg-amber-400/10 text-amber-200">
          <Crown className="h-3 w-3" />
          Leader
        </Chip>
      ) : null}
      {member.named && mode !== "name" ? (
        <Chip className="border-rose-400/30 bg-rose-500/10 text-rose-200">Named</Chip>
      ) : null}
      {member.onContract && member.onTeam ? (
        <Chip className="border-sky-400/25 bg-sky-400/10 text-sky-200">
          <Briefcase className="h-3 w-3" />
          On contract
        </Chip>
      ) : null}
      {!member.onRoster ? (
        <Chip className="border-white/15 bg-white/[0.04] text-zinc-400">
          <UserMinus className="h-3 w-3" />
          Left
        </Chip>
      ) : null}
      {status !== "active" ? (
        <Chip className={`capitalize ${STATUS_CHIP[status] || "border-white/10 text-zinc-300"}`}>
          {mode === "ban" && status === "banned" ? "Already banned" : status}
        </Chip>
      ) : null}
    </>
  );
}

function roleLine(member: DisputeRespondentMember) {
  const role =
    member.contractRole && member.contractRole !== "Contributor" && !member.onTeam
      ? member.contractRole
      : member.teamRole || member.contractRole;
  return [member.handle ? `@${member.handle}` : "No handle", !member.isLeader && role ? role : null]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Pick people on the disputee side. `ban`: who is banned together with the disputee (rose).
 * `name`: who is named on the case (neutral). Dense: one card per row, for narrow dialogs.
 */
export function DisputeMemberScopeFields({
  mode,
  group,
  value,
  onChange,
  disabled = false,
}: {
  mode: "ban" | "name";
  group: DisputeRespondentGroup;
  value: DisputeScopeValue;
  onChange: (next: DisputeScopeValue) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const tone: ScopeTone = mode === "ban" ? "rose" : "zinc";
  const pool = useMemo(
    () => (mode === "name" ? group.members.filter((member) => member.onRoster) : group.members),
    [group.members, mode]
  );
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase().replace(/^@/, "");
    if (!term) return pool;
    return pool.filter((member) =>
      [member.name, member.handle, member.teamRole, member.contractRole].some((part) =>
        String(part || "").toLowerCase().includes(term)
      )
    );
  }, [pool, query]);

  const respondentId = group.respondent?.accountId || null;
  const leader = group.leader;
  const leaderIsRespondent = Boolean(leader && leader.accountId === respondentId);
  const alreadyBanned = (member: DisputeRespondentMember) => mode === "ban" && standingOf(member) === "banned";
  const isRespondent = (member: DisputeRespondentMember) => mode === "ban" && member.accountId === respondentId;
  const locked = (member: DisputeRespondentMember) => alreadyBanned(member) || isRespondent(member);
  const picked = new Set(value.memberAccountIds);
  const reached = peopleInScope(group, value, mode).filter((member) => !alreadyBanned(member));
  const named = group.members.filter((member) => member.named);
  const contractPeople = pool.filter((member) => member.onContract);
  const setPicked = (ids: Iterable<string>) => onChange({ scope: "selected", memberAccountIds: [...new Set(ids)] });
  const sideName = sideTitle(group);

  const cards: { id: DisputeMemberScope; icon: ComponentType<{ className?: string }>; title: string; hint: string; disabled?: boolean }[] = [
    {
      id: "leader",
      icon: Crown,
      title: group.team ? "Team leader" : "The disputee only",
      hint: !leader
        ? "This team has no active leader."
        : leaderIsRespondent
          ? `${leader.name} is the disputee; nobody else ${mode === "ban" ? "is banned" : "is named"}.`
          : mode === "ban" && standingOf(leader) === "banned"
            ? `${leader.name} is already banned.`
            : `${leader.name} answers for ${group.team ? group.team.name : "the side"}.`,
      disabled: !leader,
    },
    {
      id: "selected",
      icon: ListChecks,
      title: mode === "ban" ? "Specific people" : "Choose people",
      hint:
        value.scope === "selected"
          ? `${reached.length} picked below.`
          : mode === "ban" && named.length
            ? `Starts from the ${named.length} named on the case.`
            : "Pick exactly who from the roster.",
      disabled: !pool.length,
    },
    {
      id: "all",
      icon: Users,
      title: `Everyone (${pool.filter((member) => !isRespondent(member)).length})`,
      hint:
        mode === "ban"
          ? "Everyone on the side and everyone named. Staff accounts are skipped."
          : "Every active member and everyone on this contract.",
      disabled: !pool.length,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
      <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-3 py-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
              mode === "ban" ? "bg-rose-500/15" : "bg-white/10"
            }`}
          >
            <Users className={`h-3.5 w-3.5 ${mode === "ban" ? "text-rose-300" : "text-zinc-100"}`} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {mode === "ban" ? `Ban with ${sideName}` : `Named with ${sideName}`}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
              {mode === "ban"
                ? "The disputee account is always banned. Choose who on its side is banned too."
                : "Named people can read and answer the case once it is public, and a ban reaches them by default."}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tabular-nums ${
            mode === "ban" ? "border-rose-400/30 bg-rose-500/10 text-rose-200" : "border-white/20 bg-white/[0.06] text-zinc-200"
          }`}
        >
          {mode === "ban" ? `Disputee + ${reached.length}` : `${reached.length} named`}
        </span>
      </header>

      <div role="radiogroup" aria-label={mode === "ban" ? "Who else is banned" : "Who is named"} className="grid gap-2 p-2.5">
        {cards.map((card) => (
          <TeamScopeOptionCard
            key={card.id}
            name={`dispute-${mode}-scope`}
            checked={value.scope === card.id}
            disabled={disabled || card.disabled}
            onSelect={() =>
              onChange({
                scope: card.id,
                memberAccountIds:
                  card.id !== "selected"
                    ? []
                    : value.memberAccountIds.length
                      ? value.memberAccountIds
                      : mode === "ban"
                        ? named.filter((member) => !locked(member)).map((member) => member.accountId)
                        : [],
              })
            }
            icon={card.icon}
            title={card.title}
            hint={card.hint}
            tone={tone}
            layout="row"
          />
        ))}
      </div>

      {value.scope === "selected" && pool.length ? (
        <div className="border-t border-white/[0.06] p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[140px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, @handle or role"
                aria-label="Search the disputee's side"
                className="w-full rounded-lg border border-white/10 bg-black/25 py-1.5 pl-8 pr-2.5 text-xs text-white outline-none placeholder:text-zinc-600 focus:border-white/25"
              />
            </div>
            {mode === "ban" && named.length ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => setPicked(named.filter((member) => !locked(member)).map((member) => member.accountId))}
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
              >
                Named only
              </button>
            ) : null}
            {contractPeople.length && contractPeople.length < pool.length ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() =>
                  setPicked([...picked, ...contractPeople.filter((member) => !locked(member)).map((member) => member.accountId)])
                }
                className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
              >
                On contract
              </button>
            ) : null}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setPicked([...picked, ...filtered.filter((member) => !locked(member)).map((member) => member.accountId)])}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
            >
              All
            </button>
            <button
              type="button"
              disabled={disabled || !picked.size}
              onClick={() => setPicked([])}
              className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <ul className="scroll-thin mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
            {filtered.map((member) => {
              const off = locked(member);
              const checked = !off && picked.has(member.accountId);
              return (
                <li key={member.accountId}>
                  <label
                    className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-colors has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-white/25 ${
                      checked
                        ? mode === "ban"
                          ? "border-rose-400/25 bg-rose-500/[0.06]"
                          : "border-white/20 bg-white/[0.05]"
                        : "border-transparent"
                    } ${off ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-white/[0.03]"}`}
                    title={isRespondent(member) ? "The disputee account is always banned." : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || off}
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
                        checked
                          ? mode === "ban"
                            ? "border-rose-400 bg-rose-500 text-white"
                            : "border-white bg-white text-zinc-900"
                          : "border-white/20"
                      }`}
                    >
                      {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <Avatar dark name={member.name} role="disputee" src={member.avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-zinc-100">{member.name}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{roleLine(member)}</span>
                    </span>
                    <span className="flex max-w-[45%] flex-wrap justify-end gap-1">
                      <MemberChips member={member} mode={mode} />
                    </span>
                  </label>
                </li>
              );
            })}
            {!filtered.length ? (
              <li className="px-2.5 py-4 text-center text-xs text-zinc-500">No one matches “{query.trim()}”.</li>
            ) : null}
          </ul>
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
            <span className="tabular-nums text-zinc-500">
              {reached.length} of {pool.filter((member) => !locked(member)).length} picked
            </span>
            {mode === "ban" && banMissesTeam(group, peopleInScope(group, value, mode)) ? (
              <span className="text-amber-300">Include at least one member of the team.</span>
            ) : !peopleInScope(group, value, mode).length ? (
              <span className="text-amber-300">Pick at least one person.</span>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="flex items-start gap-2 border-t border-white/[0.06] px-3 py-2 text-[11px] leading-snug text-zinc-500">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-zinc-600" />
        {mode === "ban"
          ? "Each person gets the same permanent ban, with a reason saying it came with this dispute. Team members go through the team rules; people already banned stay as they are. An account you may not ban stops the action unless you picked everyone."
          : "The disputer picked who answers when filing. Changes are recorded on the case; newly named people are told once the case is public."}
      </p>
    </section>
  );
}

/** Sidebar: who is named with the disputee, and the button to change it. */
export function DisputeNamedPeople({
  group,
  canEdit,
  saving,
  onEdit,
}: {
  group: DisputeRespondentGroup;
  canEdit: boolean;
  saving: boolean;
  onEdit: () => void;
}) {
  const named = group.members.filter((member) => member.named);
  const shown = named.slice(0, 6);
  return (
    <div className="space-y-2 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-cyan-200/90">
          {group.team ? `Team ${group.team.name}` : "Contract team"} · {named.length} named
        </p>
        {group.filedScope ? (
          <span className="rounded border border-white/10 px-1.5 py-px text-[10px] text-zinc-400">
            Filed: {group.filedScope === "leader" ? "leader" : group.filedScope === "all" ? "everyone" : "picked"}
          </span>
        ) : null}
      </div>
      {shown.length ? (
        <ul className="space-y-1.5">
          {shown.map((member) => (
            <li key={member.accountId} className="flex items-center gap-2 text-xs">
              <Avatar dark name={member.name} role="disputee" src={member.avatar} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-zinc-100">{member.name}</span>
                <span className="block truncate text-[10px] text-zinc-500">{roleLine(member)}</span>
              </span>
              <span className="flex shrink-0 gap-1">
                {member.isLeader ? <Crown className="h-3.5 w-3.5 text-amber-300" aria-label="Leader" /> : null}
                {standingOf(member) !== "active" ? (
                  <Chip className={`capitalize ${STATUS_CHIP[standingOf(member)] || "border-white/10 text-zinc-300"}`}>
                    {standingOf(member)}
                  </Chip>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-zinc-500">
          Nobody is named. {group.leader ? `${group.leader.name} (leader)` : "The team"} answers for it, and a ban reaches{" "}
          {group.leader ? "the leader" : "everyone"} by default.
        </p>
      )}
      {named.length > shown.length ? (
        <p className="text-[11px] text-zinc-500">+{named.length - shown.length} more in the Case file.</p>
      ) : null}
      {canEdit ? (
        <button
          type="button"
          disabled={saving}
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-50"
        >
          <ListChecks className="h-3.5 w-3.5" />
          Change who is named
        </button>
      ) : null}
    </div>
  );
}

function credits(value: number) {
  return `${Number(value || 0).toLocaleString()} cr`;
}

function WalletFact({ label, value, tone = "text-zinc-200" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 text-sm tabular-nums ${tone}`}>{value}</dd>
    </div>
  );
}

function RosterRow({ member }: { member: DisputeRespondentMember }) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] px-3 py-2">
      <Avatar dark name={member.name} role="disputee" src={member.avatar} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-zinc-100">{member.name}</span>
        <span className="block truncate text-[11px] text-zinc-500">{roleLine(member)}</span>
      </span>
      <span className="flex max-w-[50%] flex-wrap justify-end gap-1">
        <MemberChips member={member} />
      </span>
    </li>
  );
}

/** Case file: the disputee's team, its wallet for this contract, the named people and the roster. */
export function DisputeTeamCaseSection({ group }: { group: DisputeRespondentGroup }) {
  const named = group.members.filter((member) => member.named);
  const rest = group.members.filter((member) => !member.named);
  const wallet = group.team?.wallet || null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar dark name={group.team?.name || group.respondent?.name} role="disputee" src={group.team?.avatar || group.respondent?.avatar} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {sideTitle(group)}
              {group.team?.handle ? <span className="text-zinc-500"> @{group.team.handle}</span> : null}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {group.side === "freelancer" ? "Freelancer side" : group.side === "client" ? "Client side" : "Disputee"}
              {group.team ? ` · ${group.team.memberCount} active member${group.team.memberCount === 1 ? "" : "s"}` : ""}
              {group.team && standingOf(group.team) !== "active" ? ` · team ${standingOf(group.team)}` : ""}
              {group.contractTeam ? ` · workspace “${group.contractTeam.name}”` : ""}
            </p>
          </div>
        </div>
        <span className="rounded border border-white/10 px-1.5 py-px text-[10px] text-zinc-400">
          {group.filedScope
            ? `Filer named ${group.filedScope === "leader" ? "the leader" : group.filedScope === "all" ? "everyone" : "specific people"}`
            : group.canName
              ? "Nobody named at filing"
              : "Naming is for client disputes"}
        </span>
      </div>

      {wallet ? (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <Wallet className="h-3.5 w-3.5" />
            Team wallet
          </p>
          <dl className="grid gap-2 sm:grid-cols-3">
            <WalletFact label="Spendable" value={credits(wallet.available)} />
            <WalletFact label="Held by staff" value={credits(wallet.held)} tone={wallet.held ? "text-amber-200" : "text-zinc-200"} />
            <WalletFact label="In escrow" value={credits(wallet.escrow)} />
            <WalletFact label="Released by this contract" value={credits(wallet.contractReleased)} />
            <WalletFact label="Paid out to members" value={credits(wallet.contractDistributed)} />
            <WalletFact
              label="Still owed to members"
              value={credits(wallet.contractOwed)}
              tone={wallet.contractOwed ? "text-sky-200" : "text-zinc-200"}
            />
          </dl>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Contract payouts to a team (including dispute payouts) stay reserved until the team pays its members.
            Dispute reversals that take credits back reduce what is owed.
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[11px] text-zinc-500">Named on this case ({named.length})</p>
        {named.length ? (
          <ul className="space-y-2">
            {named.map((member) => (
              <li key={member.accountId} className="rounded-xl border border-white/10 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar dark name={member.name} role="disputee" src={member.avatar} />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{member.name}</p>
                      <p className="truncate text-[11px] text-zinc-500">{roleLine(member)}</p>
                    </div>
                  </div>
                  <span className="flex flex-wrap gap-1">
                    <MemberChips member={{ ...member, named: false }} />
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Named by {member.namedBy === "staff" ? member.namedByStaff || "staff" : "the disputer"}
                  {member.namedAt ? ` · ${caseWhen(member.namedAt)}` : ""}
                </p>
                {member.standing ? (
                  <div className="mt-2 border-t border-white/[0.06] pt-2">
                    <StaffStandingSummary account={member.standing} compact />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-xs text-zinc-500">
            Nobody is named. {group.leader ? `${group.leader.name} leads the side.` : "The team has no active leader."}
          </p>
        )}
      </div>

      {rest.length ? (
        <details className="rounded-lg border border-white/[0.06]">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">
            Rest of the side ({rest.length})
          </summary>
          <ul className="space-y-1.5 border-t border-white/[0.06] p-2">
            {rest.map((member) => (
              <RosterRow key={member.accountId} member={member} />
            ))}
          </ul>
        </details>
      ) : null}

      {group.removed.length ? (
        <details className="rounded-lg border border-white/[0.06]">
          <summary className="cursor-pointer select-none px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200">
            Taken off the case ({group.removed.length})
          </summary>
          <ul className="space-y-1 border-t border-white/[0.06] p-2 text-xs text-zinc-400">
            {group.removed.map((entry) => (
              <li key={entry.accountId} className="flex flex-wrap justify-between gap-2 rounded-lg bg-white/[0.02] px-3 py-2">
                <span className="text-zinc-200">{handleOf(entry)}</span>
                <span className="text-[11px] text-zinc-500">
                  {REMOVED_REASON[entry.reason || ""] || "Removed"}
                  {entry.removedBy ? ` by ${entry.removedBy}` : ""} · {caseWhen(entry.removedAt)}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
