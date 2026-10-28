import React from "react";
import {
  Users,
  CheckCircle2,
  Video,
  FileCheck,
  Star,
  Globe,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Coins,
  Copy,
  Check,
  UserPlus,
  MessageCircle,
} from "lucide-react";

interface TeamOverviewTabProps {
  team: {
    team_id: string;
    display_name: string;
    handle: string;
    tagline?: string;
    description: string;
    category?: string;
    location?: string;
    website?: string;
    member_count: number;
    owner_name: string;
    join_code?: string;
    is_business_verified: boolean;
    created_at?: string;
  };
  members: Array<{
    account_id: string;
    display_name: string;
    handle: string;
    role: string;
    avatar_path?: string;
  }>;
  reviews: Array<{
    rating: number;
  }>;
  wallet?: Record<string, number> | null;
  canAddFunds?: boolean;
  onAddFunds?: () => void;
  onSelectTab: (tab: string) => void;
  onOpenInviteModal?: () => void;
  onOpenChat?: () => void;
  copyTeamCode: () => void;
  codeCopied: boolean;
}

const cloudfront = String(import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/+$/, "");
const getAvatarUrl = (path?: string | null) => {
  if (!path) return "/placeholders/avatar.png";
  if (path.startsWith("http")) return path;
  return `${cloudfront}/${path.replace(/^\/+/, "")}`;
};

export const TeamOverviewTab: React.FC<TeamOverviewTabProps> = ({
  team,
  members,
  reviews,
  wallet,
  canAddFunds,
  onAddFunds,
  onSelectTab,
  onOpenInviteModal,
  onOpenChat,
  copyTeamCode,
  codeCopied,
}) => {
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviews.length).toFixed(1)
      : "5.0";

  const teamLeader = members.find((m) => m.role === "Owner") || members[0];

  return (
    <div className="space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Members Stat */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Total Members
            </p>
            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">
              {team.member_count}
            </p>
          </div>
        </div>

        {/* Taskboard Quick Stat */}
        <div
          onClick={() => onSelectTab("taskboard")}
          className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4.5 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-blue-400/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.05] transition"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Taskboard
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Open Board
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Video Projects Quick Stat */}
        <div
          onClick={() => onSelectTab("video-projects")}
          className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4.5 shadow-xs flex items-center gap-3.5 cursor-pointer hover:border-purple-400/50 hover:bg-gray-50/50 dark:hover:bg-white/[0.05] transition"
        >
          <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200/60 dark:border-purple-500/20 flex items-center justify-center shrink-0 text-purple-600 dark:text-purple-400">
            <Video className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Video Projects
            </p>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                View Studio
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Rating Stat */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-4.5 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 flex items-center justify-center shrink-0 text-amber-500">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Rating
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-black text-gray-900 dark:text-white">
                {avgRating}
              </span>
              <span className="text-xs text-gray-400">({reviews.length} reviews)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Two Column Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: About Team & Hub Navigation */}
        <div className="lg:col-span-2 space-y-6">
          {/* About This Team Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-500" />
                <span>About this Team</span>
              </h3>
              {team.category && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-zinc-300">
                  {team.category}
                </span>
              )}
            </div>

            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {team.description || "No description provided for this team yet."}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-500 dark:text-zinc-400 border-t border-gray-100 dark:border-white/5">
              {team.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{team.location}</span>
                </div>
              )}
              {team.website && (
                <a
                  href={team.website.startsWith("http") ? team.website : `https://${team.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{team.website.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
              {team.created_at && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>Founded {new Date(team.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short" })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Hub Launchers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Taskboard Quick Link */}
            <div
              onClick={() => onSelectTab("taskboard")}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-xs hover:border-blue-500/40 hover:bg-blue-50/20 dark:hover:bg-blue-500/5 transition cursor-pointer space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                Taskboard
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Organize, assign, and track team tasks freely without milestone restrictions.
              </p>
            </div>

            {/* Video Projects Quick Link */}
            <div
              onClick={() => onSelectTab("video-projects")}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-xs hover:border-purple-500/40 hover:bg-purple-50/20 dark:hover:bg-purple-500/5 transition cursor-pointer space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Video className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                Video Projects
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Review cuts, project assets, and collaborative video edits with team members.
              </p>
            </div>

            {/* Contracts Quick Link */}
            <div
              onClick={() => onSelectTab("contracts")}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-xs hover:border-emerald-500/40 hover:bg-emerald-50/20 dark:hover:bg-emerald-500/5 transition cursor-pointer space-y-2"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <FileCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                Contracts
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed">
                Manage active client agreements, milestones, and proposal agreements.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Team Leader, Code & Quick Actions */}
        <div className="space-y-6">
          {/* Team Leader Card */}
          {teamLeader && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-xs space-y-3.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                Team Leadership
              </p>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                  <img
                    src={getAvatarUrl(teamLeader.avatar_path)}
                    alt={teamLeader.display_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    {teamLeader.display_name}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate">
                    @{teamLeader.handle}
                  </p>
                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 mt-1">
                    {teamLeader.role === "Owner" ? "Team Leader" : teamLeader.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Join Code Card */}
          {team.join_code && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Team Join Code
                </p>
                <span className="text-[10px] text-gray-400">Share with members</span>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200/80 dark:border-white/10">
                <span className="font-mono text-sm font-bold tracking-widest text-gray-900 dark:text-white">
                  {team.join_code}
                </span>

                <button
                  type="button"
                  onClick={copyTeamCode}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-xs font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/20 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {codeCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Wallet / Financial Preview (if permitted) */}
          {wallet && (
            <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Team Treasury
                </p>
                <Coins className="w-4 h-4 text-amber-500" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                  <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">Available</p>
                  <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5 font-mono">
                    {Number(wallet.available_balance ?? wallet.balance ?? 0).toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cr</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/20">
                  <p className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">In Escrow</p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                    {Number(wallet.escrow_balance ?? 0).toLocaleString()} <span className="text-[10px] font-normal text-amber-500/60">cr</span>
                  </p>
                </div>
              </div>

              {Number(wallet.contract_reserved_balance || 0) > 0 && (
                <div className="flex items-center justify-between text-xs px-1 text-gray-500 dark:text-zinc-400">
                  <span className="text-[11px]">Reserved:</span>
                  <span className="font-semibold text-gray-900 dark:text-white font-mono text-[11px]">
                    {Number(wallet.contract_reserved_balance).toLocaleString()} cr
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-1">
                {canAddFunds && onAddFunds && (
                  <button
                    type="button"
                    onClick={onAddFunds}
                    className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                  >
                    Add Team Funds
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectTab("wallet")}
                  className="w-full py-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer text-center block"
                >
                  View Wallet Details →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
