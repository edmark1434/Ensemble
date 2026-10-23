import React, { useState, useEffect } from "react";
import {
  X,
  UserPlus,
  Copy,
  Check,
  Link2,
  Users,
  AlertTriangle,
  Search,
  Send,
  LoaderCircle,
} from "lucide-react";
import api from "@/lib/axios";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import { getImageUrl } from "@/lib/utils";

interface SearchedUser {
  account_id: string;
  display_name?: string;
  full_name?: string;
  handle: string;
  avatar_preset_url?: string | null;
  subscriptiontype?: string | null;
  verification_status?: boolean;
}

interface InviteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: {
    team_id: string;
    display_name: string;
    handle: string;
    avatar_path?: string | null;
    join_code?: string;
    member_count?: number;
    join_policy?: string;
    visibility?: string;
  };
  onInvited?: () => void;
}

function getAvatarUrl(account: SearchedUser): string {
  const avatarPath = account.avatar_preset_url || "";
  const presetMatch = avatarPath.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
  }
  if (avatarPath) {
    return getImageUrl(avatarPath);
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    account.display_name || account.handle || "User"
  )}&background=71717a&color=fff`;
}

export const InviteTeamModal: React.FC<InviteTeamModalProps> = ({
  isOpen,
  onClose,
  team,
  onInvited,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [limitData, setLimitData] = useState<{
    allowed: boolean;
    limit: number | null;
    activeCount: number;
    remaining: number | null;
    unlimited: boolean;
    ownerPlanName: string;
    code: string | null;
    message: string | null;
  } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [invitingAccountId, setInvitingAccountId] = useState<string | null>(null);
  const [memberStatusMap, setMemberStatusMap] = useState<Record<string, string>>({});

  const fetchLimitAndMembers = async () => {
    if (!team.team_id) return;
    try {
      const [limitRes, membersRes] = await Promise.all([
        api.get(`/api/teams/${team.team_id}/member-limit`),
        api.get(`/api/teams/${team.team_id}/members`),
      ]);
      if (limitRes.data?.success && limitRes.data.data) {
        setLimitData(limitRes.data.data);
      }
      if (membersRes.data?.data && Array.isArray(membersRes.data.data)) {
        const statusMap: Record<string, string> = {};
        for (const m of membersRes.data.data) {
          if (m.account_id) {
            statusMap[String(m.account_id)] = m.status || "Active";
          }
        }
        setMemberStatusMap(statusMap);
      }
    } catch (err) {
      console.error("Failed to load team member data:", err);
    }
  };

  useEffect(() => {
    if (!isOpen || !team.team_id) return;
    setSearchQuery("");
    setSearchResults([]);
    void fetchLimitAndMembers();
  }, [isOpen, team.team_id]);

  // Debounced search
  useEffect(() => {
    const query = searchQuery.replace(/^@/, "").trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await api.get("/api/accounts/search-users", {
          params: { handle: query },
        });
        if (!cancelled) {
          setSearchResults(response.data?.data || []);
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const inviteUrl = team.join_code
    ? `${window.location.origin}/teams/join/${team.join_code}`
    : `${window.location.origin}/teams/${team.team_id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      showSuccessToast("Invite link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      showErrorToast("Failed to copy invite link");
    }
  };

  const handleCopyCode = async () => {
    if (!team.join_code) return;
    try {
      await navigator.clipboard.writeText(team.join_code);
      setCopiedCode(true);
      showSuccessToast("Join code copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showErrorToast("Failed to copy join code");
    }
  };

  const handleSendInvite = async (userAccount: SearchedUser) => {
    if (!team.team_id || !userAccount.account_id) return;

    if (limitData && !limitData.allowed) {
      showErrorToast(
        limitData.message || "Team member limit reached. Upgrade subscription to invite more members."
      );
      return;
    }

    setInvitingAccountId(userAccount.account_id);
    try {
      await api.post(`/api/teams/${team.team_id}/invitations`, {
        accountId: userAccount.account_id,
        role: "Member",
      });

      const recipientName = userAccount.display_name || userAccount.handle;
      showSuccessToast(`Invitation sent to ${recipientName} via Notifications & Chat!`);

      // Locally mark user as Invited
      setMemberStatusMap((prev) => ({
        ...prev,
        [userAccount.account_id]: "Invited",
      }));

      // Re-fetch member limits
      const limitRes = await api.get(`/api/teams/${team.team_id}/member-limit`);
      if (limitRes.data?.success && limitRes.data.data) {
        setLimitData(limitRes.data.data);
      }

      if (onInvited) {
        onInvited();
      }
    } catch (err: unknown) {
      const msg =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      showErrorToast(msg || "Failed to send team invitation.");
    } finally {
      setInvitingAccountId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invite to {team.display_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Search users directly or share an invite link
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4">
          {/* Team Preview Card */}
          <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] p-3.5">
            {team.avatar_path ? (
              <img
                src={getImageUrl(team.avatar_path)}
                alt={team.display_name}
                className="h-12 w-12 rounded-xl object-cover"
              />
            ) : (
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/20 text-base font-bold text-blue-400">
                {team.display_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-semibold text-gray-900 dark:text-white text-sm">
                {team.display_name}
              </h4>
              <p className="truncate text-xs text-gray-500 dark:text-zinc-400">
                @{team.handle}
              </p>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                  {limitData
                    ? limitData.unlimited
                      ? `${limitData.activeCount} members (Unlimited)`
                      : `${limitData.activeCount} / ${limitData.limit} members (${limitData.ownerPlanName})`
                    : `${team.member_count || 1} members`}
                </span>
                <span>·</span>
                <span className="text-xs">
                  {team.join_policy === "Open" ? "Instant join" : "Requires approval"}
                </span>
              </div>
            </div>
          </div>

          {limitData && !limitData.allowed && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Team Member Limit Reached</p>
                <p className="text-amber-200/80 mt-0.5 leading-relaxed">
                  This team has reached its capacity of {limitData.limit} member{limitData.limit === 1 ? "" : "s"} for the owner's {limitData.ownerPlanName} plan ({limitData.activeCount} / {limitData.limit} members). New members cannot join until the team owner upgrades their subscription plan.
                </p>
              </div>
            </div>
          )}

          {/* User Search & Direct Invite */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Search & Invite Users
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-zinc-500">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by username or display name..."
                className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 py-2.5 pl-9 pr-9 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="cursor-pointer absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results list */}
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-gray-500 dark:text-zinc-400">
                <LoaderCircle className="h-4 w-4 animate-spin text-blue-500" />
                <span>Searching users...</span>
              </div>
            ) : searchQuery.trim() && searchResults.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500 dark:text-zinc-400">
                No users found matching "{searchQuery}".
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-56 overflow-y-auto space-y-1 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] p-2">
                {searchResults.map((usr) => {
                  const status = memberStatusMap[usr.account_id];
                  const isMember = status === "Active";
                  const isInvited = status === "Invited";
                  const isPending = status === "Pending";
                  const isInviting = invitingAccountId === usr.account_id;
                  const isTeamFull = Boolean(limitData && !limitData.allowed && !isMember && !isInvited);

                  return (
                    <div
                      key={usr.account_id}
                      className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getAvatarUrl(usr)}
                          alt={usr.display_name || usr.handle}
                          className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200 dark:ring-white/10"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              usr.display_name || usr.handle || "User"
                            )}&background=71717a&color=fff`;
                          }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                              {usr.display_name || usr.full_name || usr.handle}
                            </p>
                            {usr.verification_status && (
                              <Check className="h-3 w-3 text-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="truncate text-[11px] text-gray-500 dark:text-zinc-400">
                            @{usr.handle}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isMember ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <Check className="h-3 w-3" />
                            Member
                          </span>
                        ) : isInvited ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Check className="h-3 w-3" />
                            Invited
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isInviting || isTeamFull}
                            onClick={() => void handleSendInvite(usr)}
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 px-3 py-1.5 text-xs font-medium text-white transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            title={isTeamFull ? "Team member limit reached" : "Send invitation via Notifications and Chat"}
                          >
                            {isInviting ? (
                              <>
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5" />
                                Send Invite
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                Type a handle or name above to find and invite users directly to this team.
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="relative my-4 flex items-center justify-center">
            <div className="w-full border-t border-gray-200 dark:border-white/10" />
            <span className="absolute bg-white dark:bg-dark-surface px-3 text-[11px] font-medium uppercase tracking-wider text-gray-400 dark:text-zinc-500">
              Or share invite link
            </span>
          </div>

          {/* Shareable Link Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              Team Invite Link
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 p-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition">
              <div className="pl-2.5 text-gray-400 dark:text-zinc-500">
                <Link2 className="h-4 w-4" />
              </div>
              <input
                type="text"
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.target.select()}
                className="w-full bg-transparent px-2 py-1.5 text-sm text-gray-900 dark:text-white outline-none select-all"
              />
              <button
                type="button"
                onClick={() => void handleCopyLink()}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition active:scale-[0.98] shrink-0 ${
                  copiedLink
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-blue-500 hover:bg-blue-400 text-white shadow-sm"
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-500">
              {team.join_policy === "Open"
                ? "Anyone with this link can join this team directly."
                : "Anyone with this link will be redirected to the team invite page to request joining."}
            </p>
          </div>

          {/* Join Code Box */}
          {team.join_code && (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                  Team Join Code
                </p>
                <p className="font-mono text-base font-bold tracking-widest text-gray-900 dark:text-white mt-0.5">
                  {team.join_code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyCode()}
                className={`cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition active:scale-[0.98] ${
                  copiedCode
                    ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                    : "border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 text-gray-700 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-500 dark:hover:text-white"
                }`}
              >
                {copiedCode ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Code
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 px-5 py-2 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteTeamModal;
