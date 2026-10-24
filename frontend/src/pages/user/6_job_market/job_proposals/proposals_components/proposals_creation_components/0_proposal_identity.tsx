import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowRight,
  Check,
  Briefcase,
  ExternalLink
} from "lucide-react";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import type { Job } from "../../../job_components/job_lists";
import { CreditIcon } from "@/components/ui/credit-icon";
import GlideSelect, { type GlideSelectOption } from "@/components/ui/GlideSelect";
import useGlobalState from "@/lib/global_state";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";
import { getImageUrl } from "@/lib/utils";

interface ProposalIdentityProps {
  job: Job | null;
  actingTeamId?: string;
  setActingTeamId?: (id: string) => void;
  includedMemberIds?: string[];
  setIncludedMemberIds?: React.Dispatch<React.SetStateAction<string[]>>;
  onNext: () => void;
  onDiscard: () => void;
}

export const ProposalIdentityStep: React.FC<ProposalIdentityProps> = ({
  job,
  actingTeamId,
  setActingTeamId,
  includedMemberIds = [],
  setIncludedMemberIds,
  onNext,
  onDiscard,
}) => {
  const user = useGlobalState((state) => state.user);
  const theme = useGlobalState((state) => state.theme);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [proposingAs, setProposingAs] = useState<"self" | "team">(actingTeamId ? "team" : "self");

  // Wallet balance tracking for upfront 10 Credits fee disclosure
  const [walletBalance, setWalletBalance] = useState<number | null>(() => {
    const raw = user?.wallet?.balance_credits;
    return raw !== undefined && raw !== null ? Number(raw) : null;
  });

  useEffect(() => {
    if (user?.wallet?.balance_credits !== undefined && user?.wallet?.balance_credits !== null) {
      const val = Number(user.wallet.balance_credits);
      if (!isNaN(val)) setWalletBalance(val);
    }
  }, [user?.wallet?.balance_credits]);

  useEffect(() => {
    const fetchWallet = () => {
      api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
        .then((res) => {
          const raw = res.data?.wallet?.balance_credits;
          if (raw !== undefined && raw !== null && !isNaN(Number(raw))) {
            const val = Number(raw);
            setWalletBalance(val);
            if (user) {
              useGlobalState.getState().setUser({
                ...user,
                wallet: { ...(user.wallet || {}), balance_credits: val },
              });
            }
          }
        })
        .catch(() => {});
    };

    fetchWallet();
    window.addEventListener("focus", fetchWallet);
    return () => window.removeEventListener("focus", fetchWallet);
  }, [user]);

  useEffect(() => {
    const handleBalance = ({ balance_credits }: { balance_credits: number }) => {
      const val = Number(balance_credits);
      if (Number.isFinite(val)) {
        setWalletBalance(val);
        if (user) {
          useGlobalState.getState().setUser({
            ...user,
            wallet: { ...(user.wallet || {}), balance_credits: val },
          });
        }
      }
    };
    socket.on("wallet:balance_updated", handleBalance);
    return () => {
      socket.off("wallet:balance_updated", handleBalance);
    };
  }, [user]);

  // User details & safe avatar hydration
  const [userProfileAvatar, setUserProfileAvatar] = useState<string | undefined>(
    user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar
  );
  const [userBannerPreset, setUserBannerPreset] = useState<string | null>(
    (user as any)?.banner_preset || null
  );

  const userName = user?.display_name || user?.name || user?.username || "You";
  const userHandle = user?.handle || user?.username || "freelancer";

  useEffect(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    if (raw) {
      setUserProfileAvatar(raw);
    }
    if ((user as any)?.banner_preset) {
      setUserBannerPreset((user as any).banner_preset);
    }
    const accountId = user?.account_id || user?.accountId || user?.id;
    if (accountId) {
      api.get(`/api/accounts/profile/${accountId}`)
        .then((res) => {
          const data = res.data?.data || res.data?.profile || res.data || {};
          const fetched = data.avatar_preset_url || data.avatar_url;
          if (fetched) {
            setUserProfileAvatar(fetched);
          }
          if (data.banner_preset !== undefined) {
            setUserBannerPreset(data.banner_preset);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const userAvatarUrl = constructAvatarUrl(userProfileAvatar, userName);

  // User banner URL (uses custom banner preset or deterministic default Ensemble banner)
  const userBannerUrl = useMemo(() => {
    const preset = resolveBannerPreset(userBannerPreset, userHandle || userName);
    return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Blue.png";
  }, [userBannerPreset, userHandle, userName]);

  // Fetch user's registered teams
  useEffect(() => {
    let mounted = true;
    setIsLoadingTeams(true);
    api.get("/api/teams", { params: { mine: true, limit: 50 } })
      .then((res) => {
        if (!mounted) return;
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : (res.data?.teams || []);
        const eligible = list.filter(
          (t: any) =>
            t.team_type !== "contractual" &&
            !t.is_archived &&
            t.current_user_status === "Active" &&
            ["Owner", "Representative", "Admin"].includes(String(t.current_user_role || ""))
        );
        setUserTeams(eligible);
        if (eligible.length === 0) {
          setProposingAs("self");
          if (setActingTeamId) setActingTeamId("");
        } else if (proposingAs === "team") {
          if (actingTeamId && eligible.some((t: any) => t.team_id === actingTeamId)) {
            // keep current active team
          } else {
            if (setActingTeamId) setActingTeamId(eligible[0].team_id);
          }
        }
      })
      .catch((err) => console.error("Failed to load user teams", err))
      .finally(() => {
        if (mounted) setIsLoadingTeams(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch team members when team is selected
  const activeTeamId = actingTeamId || userTeams[0]?.team_id;
  const currentUserAccountId = String(user?.account_id || user?.accountId || user?.id || "");

  useEffect(() => {
    let mounted = true;
    if (activeTeamId) {
      api.get(`/api/teams/${activeTeamId}/members`)
        .then((res) => {
          if (!mounted) return;
          const rawMembers = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
          const activeMembers = rawMembers.filter(
            (m: any) => !m.status || String(m.status).toLowerCase() === "active"
          );
          // Sort so Team Leader (Owner) is first, then Proposer (if Representative), then other members
          activeMembers.sort((a: any, b: any) => {
            const aRank = a.role === "Owner" ? 0 : String(a.account_id) === currentUserAccountId ? 1 : 2;
            const bRank = b.role === "Owner" ? 0 : String(b.account_id) === currentUserAccountId ? 1 : 2;
            return aRank - bRank;
          });
          setTeamMembers(activeMembers);

          if (setIncludedMemberIds) {
            const allIds = activeMembers
              .map((m: any) => String(m.account_id || ""))
              .filter(Boolean);
            const requiredIds = activeMembers
              .filter((m: any) => m.role === "Owner" || String(m.account_id) === currentUserAccountId)
              .map((m: any) => String(m.account_id || ""))
              .filter(Boolean);

            setIncludedMemberIds((prev) => {
              const validExisting = prev.filter((id) => allIds.includes(id));
              if (validExisting.length > 0) {
                return Array.from(new Set([...requiredIds, ...validExisting]));
              }
              return allIds;
            });
          }
        })
        .catch((err) => console.error("Failed to load team members", err));
    } else {
      setTeamMembers([]);
    }
    return () => {
      mounted = false;
    };
  }, [activeTeamId, userTeams, currentUserAccountId]);

  const handleToggleTeamMember = (memberAccountId: string, memberRole?: string) => {
    if (!setIncludedMemberIds || !memberAccountId) return;
    // Both the Team Leader (Owner) and the Proposer are required and cannot be deselected
    if (memberRole === "Owner" || String(memberAccountId) === currentUserAccountId) return;
    setIncludedMemberIds((prev) => {
      const exists = prev.includes(memberAccountId);
      const next = exists
        ? prev.filter((id) => id !== memberAccountId)
        : [...prev, memberAccountId];
      const requiredIds = teamMembers
        .filter((m: any) => m.role === "Owner" || String(m.account_id) === currentUserAccountId)
        .map((m: any) => String(m.account_id || ""))
        .filter(Boolean);
      return Array.from(new Set([...requiredIds, ...next]));
    });
  };

  const selectedTeamData = userTeams.find((t) => t.team_id === activeTeamId);
  const selectedTeamName = selectedTeamData?.display_name || selectedTeamData?.name || "Team";
  const selectedTeamThumbnail = constructAvatarUrl(
    selectedTeamData?.avatar_path || (selectedTeamData as any)?.avatar_url,
    selectedTeamName
  );

  // Team banner calculation (uses custom uploaded banner, preset, or deterministic default Ensemble team banner)
  const defaultTeamBannerPreset = resolveBannerPreset(null, selectedTeamData?.handle || selectedTeamName || "team");
  const defaultTeamBannerUrl = bannerPresetUrl(defaultTeamBannerPreset) || "/profile_banner_presets/Ensemble%20Purple.png";

  const teamBannerUrl = useMemo(() => {
    if (selectedTeamData?.avatar_path) {
      return getImageUrl(selectedTeamData.avatar_path);
    }
    if (selectedTeamData?.banner_preset) {
      const preset = resolveBannerPreset(selectedTeamData.banner_preset, selectedTeamData.handle || selectedTeamName);
      return bannerPresetUrl(preset) || defaultTeamBannerUrl;
    }
    return defaultTeamBannerUrl;
  }, [selectedTeamData, selectedTeamName, defaultTeamBannerUrl]);

  // GlideSelect Options for Teams
  const teamSelectOptions: GlideSelectOption[] = useMemo(() => {
    return userTeams.map((t) => {
      const tName = t.display_name || t.name || "Team";
      const tThumb = constructAvatarUrl(t.avatar_path || t.avatar_url, tName);
      return {
        value: t.team_id,
        label: tName,
        tag: `@${t.handle || "team"}`,
        icon: (
          <img
            src={tThumb}
            alt={tName}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getFallbackAvatarUrl(tName);
            }}
            className="w-4 h-4 rounded-md object-cover"
          />
        ),
      };
    });
  }, [userTeams]);

  const handleIdentityChange = (type: "self" | "team") => {
    if (type === "team" && (isLoadingTeams || userTeams.length === 0)) return;
    setProposingAs(type);
    if (type === "self") {
      if (setActingTeamId) setActingTeamId("");
    } else {
      if (userTeams.length > 0) {
        const chosen = actingTeamId && userTeams.some((t) => t.team_id === actingTeamId)
          ? actingTeamId
          : userTeams[0].team_id;
        if (setActingTeamId) setActingTeamId(chosen);
      }
    }
  };

  // Budget info
  const rawMin = Number(job?.minBudget) || 0;
  const rawMax = Number(job?.maxBudget) || 0;
  const isOpenBid = rawMax <= 0 || (job as any)?.budgetType === "open" || (job as any)?.budget_type === "open";

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
          Select Proposing Representation
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Choose whether you are applying individually or on behalf of an existing team.
        </p>
      </div>

      {/* Simple, Compact Target Job Header */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-zinc-200/70 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-500 dark:text-zinc-400">
            <Briefcase className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {job?.title || "Target Project"}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                {job?.category || "Jobs"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              Client: <strong className="text-zinc-700 dark:text-zinc-300">{job?.postedBy || "Client"}</strong>
              <span className="mx-1.5">•</span>
              Timeline: <strong className="text-zinc-700 dark:text-zinc-300">{job?.timeline || "Standard"}</strong>
            </p>
          </div>
        </div>

        {/* Budget Pill */}
        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white shadow-2xs">
          <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
          <span>
            {isOpenBid
              ? `From ${rawMin > 0 ? rawMin.toLocaleString() : "100"} Cr (Open Bid)`
              : `${rawMin.toLocaleString()} ~ ${rawMax.toLocaleString()} Cr`}
          </span>
        </div>
      </div>

      {/* Upfront Proposal Submission Fee Disclosure (Step 1 Notice) */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 text-amber-500">
            <CreditIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Proposal Submission Cost
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-600 text-white shadow-2xs">
                <CreditIcon className="h-3 w-3 text-amber-300" /> 10 Credits
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
              Submitting a proposal requires <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">10 Credits</strong>, charged upon final review and confirmation in <span className="font-semibold text-blue-600 dark:text-blue-400">Step 5 (Review & Send)</span>. No credits are charged while drafting.
            </p>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-blue-200/60 dark:border-blue-900/40">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Your Wallet:</span>
            <span className="font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1">
              <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
              {walletBalance !== null ? `${walletBalance} Cr` : "..."}
            </span>
          </div>
          {walletBalance !== null && walletBalance < 10 ? (
            <button
              type="button"
              onClick={() => window.open("/credits", "_blank")}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              Top up Credits <ExternalLink className="h-3 w-3" />
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" /> Balance sufficient
            </span>
          )}
        </div>
      </div>

      {/* Main Focus: Select Proposing Representation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Option 1: Myself (Solo Freelancer) */}
        <div
          onClick={() => handleIdentityChange("self")}
          className={`rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer overflow-hidden ${
            proposingAs === "self"
              ? "border-zinc-900 dark:border-white bg-zinc-50/90 dark:bg-zinc-800/50 shadow-xs ring-1 ring-zinc-900 dark:ring-white"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40"
          }`}
        >
          {/* User Banner Strip */}
          <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
            {userBannerUrl ? (
              <img
                src={userBannerUrl}
                alt="Profile banner"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20" />
            )}
            {/* Top-Right Selection Radio */}
            <div className="absolute top-3 right-3 z-10">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors shadow-xs ${
                  proposingAs === "self"
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-white/90 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-transparent backdrop-blur-xs"
                }`}
              >
                {proposingAs === "self" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* User Card Content */}
          <div className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
            <div>
              {/* Overlapping Avatar */}
              <div className="relative z-10 -mt-7 mb-3 flex items-end justify-between">
                <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm shrink-0">
                  <img
                    src={userAvatarUrl}
                    alt={userName}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getFallbackAvatarUrl(userName);
                    }}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Name & Handle */}
              <div className="space-y-0.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate block">
                    {userName}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    You
                  </span>
                </div>
                <span className="text-xs text-zinc-400 truncate block">
                  @{userHandle}
                </span>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Submit proposal directly under your individual profile, client reviews, and personal portfolio.
              </p>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <span>Identity: Individual Proposer</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">Solo Workspace</span>
            </div>
          </div>
        </div>

        {/* Option 2: As a Team / Studio */}
        {isLoadingTeams ? (
          <div
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-left flex flex-col justify-between overflow-hidden cursor-wait select-none"
            aria-busy="true"
            aria-label="Checking team memberships..."
          >
            {/* Banner Skeleton */}
            <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse">
              <div className="absolute top-3 right-3">
                <div className="h-6 w-6 rounded-full bg-zinc-300/60 dark:bg-zinc-700/60" />
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                {/* Overlapping Avatar Skeleton */}
                <div className="relative z-10 -mt-7 mb-3">
                  <div className="h-14 w-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm animate-pulse" />
                </div>

                {/* Name & Tag Skeletons */}
                <div className="space-y-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-36 rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                    <div className="h-4 w-10 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60 animate-pulse" />
                  </div>
                  <div className="h-3 w-20 rounded bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
                </div>

                {/* Description Skeleton */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-3 w-5/6 rounded bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                </div>
              </div>

              {/* Footer Skeleton */}
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                <div className="h-3 w-28 rounded bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
                <div className="h-3 w-32 rounded bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => {
              if (userTeams.length > 0) {
                handleIdentityChange("team");
              }
            }}
            className={`rounded-2xl border text-left transition-all flex flex-col justify-between overflow-hidden ${
              userTeams.length === 0
                ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/20 select-none"
                : proposingAs === "team"
                ? "border-zinc-900 dark:border-white bg-zinc-50/90 dark:bg-zinc-800/50 shadow-xs ring-1 ring-zinc-900 dark:ring-white cursor-pointer"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40 cursor-pointer"
            }`}
          >
            {/* Team Banner Strip */}
            <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <img
                src={teamBannerUrl}
                alt="Team Banner"
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = defaultTeamBannerUrl;
                }}
              />
              {/* Top-Right Selection Radio */}
              <div className="absolute top-3 right-3 z-10">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors shadow-xs ${
                    userTeams.length === 0
                      ? "border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70"
                      : proposingAs === "team"
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                      : "bg-white/90 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-transparent backdrop-blur-xs"
                  }`}
                >
                  {userTeams.length > 0 && proposingAs === "team" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Team Card Content */}
            <div className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                {/* Overlapping Dual Avatars: Team Crest + Proposer Badge */}
                <div className="relative z-10 -mt-7 mb-3 flex items-end justify-between">
                  <div className="relative shrink-0">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      <img
                        src={selectedTeamThumbnail}
                        alt={selectedTeamName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackAvatarUrl(selectedTeamName);
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {/* Proposer sub-avatar badge */}
                    <div
                      className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-700 shadow-2xs"
                      title={`Proposed by ${userName}`}
                    >
                      <img
                        src={userAvatarUrl}
                        alt={userName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getFallbackAvatarUrl(userName);
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Name & Handle */}
                <div className="space-y-0.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate block">
                      {selectedTeamData ? selectedTeamData.display_name : "As a Team / Studio"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0">
                      Team
                    </span>
                  </div>
                  <span className="text-xs text-zinc-400 truncate block">
                    @{selectedTeamData?.handle || "team"}
                  </span>
                </div>

                {/* Team Selector & Interactive Member Roster */}
                {selectedTeamData ? (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      Submit proposal with shared team portfolio, selected members, and dedicated team workspace.
                    </p>

                    {/* Team Selector Dropdown (Always visible when user has teams so they can see/switch which team is proposing) */}
                    {userTeams.length >= 1 && (
                      <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                          {userTeams.length > 1 ? "Select Proposing Team:" : "Proposing Team:"}
                        </label>
                        <GlideSelect
                          options={teamSelectOptions}
                          value={activeTeamId}
                          onChange={(val) => {
                            if (proposingAs !== "team") {
                              setProposingAs("team");
                            }
                            if (setActingTeamId) setActingTeamId(val);
                            if (setIncludedMemberIds) setIncludedMemberIds([]);
                          }}
                          size="sm"
                          placeholder="Select a team..."
                          fullWidth={true}
                          theme={theme}
                        />
                      </div>
                    )}

                    {/* Included Team Members Selector (Proposer is Team Leader by default) */}
                    {teamMembers.length > 0 && (
                      <div
                        onClick={(e) => {
                          if (proposingAs === "team") {
                            e.stopPropagation();
                          }
                        }}
                        className="space-y-1.5 pt-1"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Included Team Members ({includedMemberIds.length || teamMembers.length}/{teamMembers.length})
                          </span>
                          <span className="text-zinc-400 dark:text-zinc-500">
                            {proposingAs === "team" ? "Click to include / exclude" : "Select card to customize"}
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-0.5">
                          {teamMembers.map((m: any, i: number) => {
                            const mId = String(m.account_id || "");
                            const isOwnerLeader = m.role === "Owner";
                            const isProposer = mId === currentUserAccountId;
                            const isLocked = isOwnerLeader || isProposer;
                            const isIncluded =
                              isLocked ||
                              includedMemberIds.length === 0 ||
                              includedMemberIds.includes(mId);
                            const mName = m.display_name || m.name || m.username || "Member";
                            const mHandle = m.handle || m.username || "member";
                            const mAvatar = constructAvatarUrl(
                              m.avatar_path || m.avatar_url || m.avatar,
                              mName
                            );

                            return (
                              <div
                                key={mId || i}
                                onClick={() => {
                                  if (proposingAs !== "team") {
                                    handleIdentityChange("team");
                                    return;
                                  }
                                  if (!isLocked) {
                                    handleToggleTeamMember(mId, m.role);
                                  }
                                }}
                                className={`flex items-center justify-between gap-2.5 p-2 rounded-xl border text-xs transition-all ${
                                  isIncluded
                                    ? "bg-white dark:bg-zinc-900/90 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs"
                                    : "bg-zinc-100/50 dark:bg-zinc-900/30 border-zinc-200/70 dark:border-zinc-800/70 text-zinc-400 dark:text-zinc-500 opacity-65"
                                } ${isLocked ? "cursor-default" : "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600"}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-6 w-6 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-200 dark:bg-zinc-700 shrink-0">
                                    <img
                                      src={mAvatar}
                                      alt={mName}
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = getFallbackAvatarUrl(mName);
                                      }}
                                      className="h-full w-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs truncate">
                                        {isProposer ? `${mName} (You)` : mName}
                                      </span>
                                      {isOwnerLeader && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500 text-white shrink-0">
                                          Team Leader
                                        </span>
                                      )}
                                      {isProposer && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white shrink-0">
                                          Proposing
                                        </span>
                                      )}
                                      {!isOwnerLeader && !isProposer && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 shrink-0">
                                          {m.role === "Representative" || m.role === "Admin" ? "Representative" : "Member"}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">
                                      @{mHandle}
                                    </span>
                                  </div>
                                </div>

                                <div
                                  className={`h-4.5 w-4.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                    isLocked
                                      ? "bg-blue-600 text-white"
                                      : isIncluded
                                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                                      : "border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-transparent"
                                  }`}
                                  title={
                                    isOwnerLeader
                                      ? "Team Leader (Owner) is always included by default"
                                      : isProposer
                                      ? "You are submitting this proposal and are included by default"
                                      : isIncluded
                                      ? "Included in proposal (click to exclude)"
                                      : "Excluded from proposal (click to include)"
                                  }
                                >
                                  {isIncluded && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    No active teams where you are a Team Leader or Representative. Only Team Leaders and trusted Representatives can submit team proposals.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <span>Identity: Team Representation</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Shared Project Workspace</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step Actions */}
      <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onDiscard}
          className="w-full sm:w-auto px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer shadow-xs"
        >
          Cancel & Exit
        </button>
        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <span>Fee:</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1">
              <CreditIcon className="h-3.5 w-3.5 text-amber-500" /> 10 Credits
            </span>
            <span className="text-zinc-400 text-[10px]">(charged at final Step 5 review)</span>
          </span>
          <button
            type="button"
            onClick={onNext}
            className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-8 rounded-full bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-blue-500/20"
          >
            <span>Proceed to Pitch & Pricing</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalIdentityStep;
