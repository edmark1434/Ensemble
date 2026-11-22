import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, Crown, Search, ShieldCheck, User, X } from "lucide-react";
import api from "@/lib/axios";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";

export type TransferCandidate = {
  account_id: string;
  display_name: string;
  handle: string;
  role: string;
  avatar_path?: string;
  /** The member's own account standing; only Active members can lead. */
  account_status?: string | null;
};

type PreviousRole = "Admin" | "Member";

const ROLE_OPTIONS: { value: PreviousRole; label: string; hint: string; icon: typeof User }[] = [
  {
    value: "Admin",
    label: "Team Admin",
    hint: "Keep managing members, requests and settings. You can no longer pay out or delete the team.",
    icon: ShieldCheck,
  },
  {
    value: "Member",
    label: "Member",
    hint: "Stay on the team without management rights.",
    icon: User,
  },
];

const NOTE_MAX = 500;

function roleRank(role: string) {
  return ({ admin: 0, representative: 1, manager: 2 } as Record<string, number>)[role.toLowerCase()] ?? 3;
}

function Avatar({ src, name, size = "md" }: { src?: string; name: string; size?: "md" | "lg" }) {
  const [failed, setFailed] = useState(false);
  const dims = size === "lg" ? "h-11 w-11 text-base" : "h-9 w-9 text-xs";
  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setFailed(true)}
        className={`${dims} shrink-0 rounded-full bg-gray-100 object-cover dark:bg-white/5`}
      />
    );
  }
  return (
    <span
      className={`${dims} flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold uppercase text-blue-700 dark:bg-blue-500/15 dark:text-blue-200`}
    >
      {(name || "?").charAt(0)}
    </span>
  );
}

/**
 * The team owner hands the team to an active member and becomes a team Admin or Member. The new
 * owner must be in good standing and have room on their plan for another team; the server
 * checks both again. Confirmed by typing the team name, because only the new owner can give
 * ownership back.
 */
export default function TransferOwnershipModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  members,
  initialAccountId = null,
  blockedMessage = null,
  imageUrl,
  onTransferred,
}: {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  /** Active members other than the owner. */
  members: TransferCandidate[];
  /** Opened from a member's card: start with them picked. */
  initialAccountId?: string | null;
  /** Set while the team cannot change hands (suspended, locked, banned). */
  blockedMessage?: string | null;
  imageUrl: (path?: string) => string;
  onTransferred: () => void;
}) {
  const [picked, setPicked] = useState<string>("");
  const [previousRole, setPreviousRole] = useState<PreviousRole>("Admin");
  const [note, setNote] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPicked(initialAccountId || "");
    setPreviousRole("Admin");
    setNote("");
    setConfirmName("");
    setQuery("");
    setError(null);
  }, [isOpen, initialAccountId]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, saving]);

  const candidates = useMemo(
    () =>
      members
        .map((member) => ({
          ...member,
          restricted: String(member.account_status || "Active").toLowerCase() !== "active",
        }))
        .sort(
          (a, b) =>
            Number(a.restricted) - Number(b.restricted) ||
            roleRank(a.role) - roleRank(b.role) ||
            a.display_name.localeCompare(b.display_name),
        ),
    [members],
  );
  const term = query.trim().toLowerCase().replace(/^@/, "");
  const shown = term
    ? candidates.filter((member) =>
        [member.display_name, member.handle, member.role].some((part) => String(part || "").toLowerCase().includes(term)),
      )
    : candidates;
  const newOwner = candidates.find((member) => member.account_id === picked) || null;
  const nameMatches = confirmName.trim().toLowerCase() === teamName.trim().toLowerCase();
  const canSubmit = Boolean(newOwner && !newOwner.restricted && nameMatches && !saving && !blockedMessage);

  if (!isOpen) return null;

  const submit = async () => {
    if (!canSubmit || !newOwner) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/teams/${teamId}/transfer-ownership`, {
        accountId: newOwner.account_id,
        previousOwnerRole: previousRole,
        note: note.trim() || undefined,
      });
      showSuccessToast(`${newOwner.display_name} now owns ${teamName}`);
      onTransferred();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Could not transfer ownership";
      setError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm font-['Plus_Jakarta_Sans',sans-serif]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-ownership-title"
    >
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={() => !saving && onClose()} />
      <div className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-dark-surface">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/15">
              <Crown className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            </span>
            <div>
              <h3 id="transfer-ownership-title" className="text-base font-bold text-gray-900 dark:text-white">
                Transfer ownership
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Hand {teamName} to another member.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {blockedMessage ? (
            <p className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {blockedMessage}
            </p>
          ) : null}

          {/* Hand-off */}
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/[0.03]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">You become</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {ROLE_OPTIONS.find((option) => option.value === previousRole)?.label}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 dark:text-zinc-600" />
            <div
              className={`min-w-0 flex-1 rounded-xl border p-3 ${
                newOwner
                  ? "border-blue-300 bg-blue-50 dark:border-blue-400/40 dark:bg-blue-500/10"
                  : "border-dashed border-gray-300 dark:border-white/15"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500">New owner</p>
              {newOwner ? (
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <Avatar src={imageUrl(newOwner.avatar_path)} name={newOwner.display_name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{newOwner.display_name}</p>
                    <p className="truncate text-[11px] text-gray-500 dark:text-zinc-400">@{newOwner.handle}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-gray-400 dark:text-zinc-500">Pick a member</p>
              )}
            </div>
          </div>

          {/* Member picker */}
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-gray-700 dark:text-zinc-200">Who leads the team now</p>
              {candidates.length > 5 ? (
                <label className="flex w-44 items-center rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 focus-within:border-blue-400 dark:border-white/10 dark:text-zinc-400">
                  <Search className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search members"
                    aria-label="Search members"
                    className="w-full bg-transparent text-gray-900 outline-none dark:text-white"
                  />
                </label>
              ) : null}
            </div>
            {candidates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-white/15 dark:text-zinc-400">
                There is nobody else on the team yet. Invite a member first, then hand the team to them.
              </p>
            ) : (
              <ul role="radiogroup" aria-label="New owner" className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                {shown.map((member) => {
                  const checked = picked === member.account_id;
                  return (
                    <li key={member.account_id}>
                      <label
                        className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-blue-400/50 ${
                          member.restricted
                            ? "cursor-not-allowed border-gray-100 opacity-50 dark:border-white/5"
                            : checked
                              ? "cursor-pointer border-blue-400 bg-blue-50 dark:border-blue-400/50 dark:bg-blue-500/10"
                              : "cursor-pointer border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="new-owner"
                          className="sr-only"
                          disabled={member.restricted}
                          checked={checked}
                          onChange={() => setPicked(member.account_id)}
                        />
                        <span
                          aria-hidden
                          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${
                            checked ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 dark:border-white/20"
                          }`}
                        >
                          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <Avatar src={imageUrl(member.avatar_path)} name={member.display_name} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                            {member.display_name}
                          </span>
                          <span className="block truncate text-[11px] text-gray-500 dark:text-zinc-400">
                            @{member.handle} · {member.role}
                          </span>
                        </span>
                        {member.restricted ? (
                          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">
                            Account {String(member.account_status).toLowerCase()}
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
                {!shown.length ? (
                  <li className="py-4 text-center text-xs text-gray-400">No member matches “{query.trim()}”.</li>
                ) : null}
              </ul>
            )}
            {candidates.some((member) => member.restricted) ? (
              <p className="mt-1.5 text-[11px] text-gray-400 dark:text-zinc-500">
                Members whose account is suspended, locked or banned cannot lead a team.
              </p>
            ) : null}
          </section>

          {/* Your role after */}
          <section>
            <p className="mb-2 text-xs font-bold text-gray-700 dark:text-zinc-200">Your role afterwards</p>
            <div role="radiogroup" aria-label="Your role afterwards" className="grid gap-2 sm:grid-cols-2">
              {ROLE_OPTIONS.map((option) => {
                const checked = previousRole === option.value;
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer flex-col gap-1.5 rounded-xl border p-3 transition has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-blue-400/50 ${
                      checked
                        ? "border-blue-400 bg-blue-50 dark:border-blue-400/50 dark:bg-blue-500/10"
                        : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="previous-owner-role"
                      className="sr-only"
                      checked={checked}
                      onChange={() => setPreviousRole(option.value)}
                    />
                    <span className="flex items-center justify-between">
                      <Icon className={`h-4 w-4 ${checked ? "text-blue-600 dark:text-blue-300" : "text-gray-400 dark:text-zinc-500"}`} />
                      <span
                        aria-hidden
                        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                          checked ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300 dark:border-white/20"
                        }`}
                      >
                        {checked ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                      </span>
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{option.label}</span>
                    <span className="text-[11px] leading-snug text-gray-500 dark:text-zinc-400">{option.hint}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
            <p className="font-bold text-gray-700 dark:text-zinc-200">What changes</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>{newOwner ? newOwner.display_name : "The new owner"} pays out the team wallet and can delete the team.</li>
              <li>They answer for the team’s standing and get its notices.</li>
              <li>Only they can hand ownership back to you.</li>
              <li>The team’s Admins are told who leads now.</li>
            </ul>
          </div>

          <label className="block text-xs font-bold text-gray-700 dark:text-zinc-200">
            Note for the new owner <span className="font-normal text-gray-400">(optional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, NOTE_MAX))}
              rows={2}
              placeholder="e.g. I'm stepping back; you know the clients best."
              className="mt-1 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-zinc-500"
            />
          </label>

          <label className="block text-xs font-bold text-gray-700 dark:text-zinc-200">
            Type <span className="font-mono text-gray-900 dark:text-white">{teamName}</span> to confirm
            <input
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none focus:border-blue-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
            />
          </label>

          {error ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-gray-100 px-5 py-3 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 cursor-pointer rounded-full border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-blue-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Crown className="h-3.5 w-3.5" />
            {saving ? "Transferring…" : newOwner ? `Make ${newOwner.display_name.split(" ")[0]} owner` : "Transfer ownership"}
          </button>
        </div>
      </div>
    </div>
  );
}
