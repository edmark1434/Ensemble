import React, { useState } from "react";
import { X, UserPlus, Copy, Check, Link2, Users } from "lucide-react";
import { showSuccessToast, showErrorToast } from "@/components/utility/toast";
import { getImageUrl } from "@/lib/utils";

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
}

export const InviteTeamModal: React.FC<InviteTeamModalProps> = ({
  isOpen,
  onClose,
  team,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invite to {team.display_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Share this link or code with anyone to invite them
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

        {/* Team Preview Card */}
        <div className="my-5 flex items-center gap-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03] p-3.5">
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
                {team.member_count || 1} {team.member_count === 1 ? "member" : "members"}
              </span>
              <span>·</span>
              <span className="text-xs">
                {team.join_policy === "Open" ? "Instant join" : "Requires approval"}
              </span>
            </div>
          </div>
        </div>

        {/* Shareable Link Input */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
            Send a Team Invite Link
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
          <div className="mb-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] p-3.5 flex items-center justify-between">
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

        {/* Footer */}
        <div className="mt-6 flex justify-end">
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
