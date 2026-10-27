import React, { useState, useEffect, useMemo } from "react";
import { User, Users, Check, ChevronDown, ExternalLink, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { CreditIcon } from "@/components/ui/credit-icon";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";
import { getImageUrl } from "@/lib/utils";

interface TeamMember {
  account_id: string;
  display_name: string;
  handle: string;
  avatar_url?: string;
  avatar_file_id?: string;
  role: string;
}

interface UserTeam {
  team_id: string;
  team_name?: string;
  name?: string;
  display_name?: string;
  team_handle?: string;
  handle?: string;
  team_avatar_url?: string;
  avatar_url?: string;
  avatar_path?: string;
  team_banner_url?: string;
  banner_url?: string;
  banner_path?: string;
  banner_preset?: string;
  role?: string;
  current_user_role?: string;
  current_user_status?: string;
  is_verified?: boolean;
}

interface GigIdentityProps {
  postingAs: "self" | "team";
  setPostingAs: (val: "self" | "team") => void;
  actingTeamId: string;
  setActingTeamId: (id: string) => void;
  includedMemberIds: string[];
  setIncludedMemberIds: React.Dispatch<React.SetStateAction<string[]>>;
  onNext: () => void;
}

export const GigIdentity: React.FC<GigIdentityProps> = ({
  postingAs,
  setPostingAs,
  actingTeamId,
  setActingTeamId,
  includedMemberIds,
  setIncludedMemberIds,
  onNext,
}) => {
  const user = useGlobalState((state) => state.user);
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // User details & safe avatar / banner hydration
  const [userProfileAvatar, setUserProfileAvatar] = useState<string | undefined>(
    user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar
  );
  const [userBannerPreset, setUserBannerPreset] = useState<string | null>(
    (user as any)?.banner_preset || null
  );

  const currentUserAccountId = String(user?.account_id || (user as any)?.accountId || user?.id || "");
  const userName = user?.display_name || user?.name || user?.username || "You";
  const userHandle = user?.handle || user?.username || "freelancer";

  // Fetch full user profile to hydrate avatar and banner_preset if missing
  useEffect(() => {
    const rawAvatar = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    if (rawAvatar) {
      setUserProfileAvatar(rawAvatar);
    }
    if ((user as any)?.banner_preset) {
      setUserBannerPreset((user as any).banner_preset);
    }

    if (currentUserAccountId && (!rawAvatar || (user as any)?.banner_preset === undefined)) {
      api.get(`/api/accounts/profile/${currentUserAccountId}`)
        .then((res) => {
          const data = res.data?.data || res.data?.profile || res.data || {};
          const fetchedAvatar = data.avatar_preset_url || data.avatar_url;
          if (fetchedAvatar) {
            setUserProfileAvatar(fetchedAvatar);
          }
          if (data.banner_preset !== undefined) {
            setUserBannerPreset(data.banner_preset);
          }
        })
        .catch(() => {});
    }
  }, [currentUserAccountId]);

  // Construct user avatar and banner URLs
  const userAvatarUrl = constructAvatarUrl(userProfileAvatar, userName);

  const userBannerUrl = useMemo(() => {
    const preset = resolveBannerPreset(userBannerPreset, userHandle || userName);
    return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Blue.png";
  }, [userBannerPreset, userHandle, userName]);

  // Sync wallet balance from user state
  useEffect(() => {
    if (user?.wallet?.balance_credits !== undefined && user?.wallet?.balance_credits !== null) {
      const val = Number(user.wallet.balance_credits);
      if (!isNaN(val)) setWalletBalance(val);
    }
  }, [user?.wallet?.balance_credits]);

  // Fetch user wallet from backend
  useEffect(() => {
    let cancelled = false;
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then((res) => {
        if (!cancelled) {
          const raw = res.data?.wallet?.balance_credits ?? res.data?.data?.balance_credits ?? res.data?.balance_credits;
          if (raw !== undefined && raw !== null && !isNaN(Number(raw))) {
            const val = Number(raw);
            setWalletBalance(val);
            const curUser = useGlobalState.getState().user;
            if (curUser && curUser.wallet?.balance_credits !== val) {
              useGlobalState.getState().setUser({
                ...curUser,
                wallet: { ...(curUser.wallet || {}), balance_credits: val },
              });
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWalletBalance(Number(user?.wallet?.balance_credits ?? 0));
        }
      });
    return () => { cancelled = true; };
  }, [user]);

  // Fetch teams where user is Owner, Admin, Representative, or Team Leader
  useEffect(() => {
    let cancelled = false;
    setIsLoadingTeams(true);
    api.get("/api/teams", { params: { mine: true, limit: 50 } })
      .then((res) => {
        if (!cancelled) {
          const list: any[] = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
            ? res.data.data
            : (res.data?.teams || []);
          const eligible = list.filter((t: any) =>
            t.team_type !== "contractual" &&
            !t.is_archived &&
            (!t.current_user_status || t.current_user_status === "Active") &&
            ["owner", "representative", "admin", "team leader"].includes(
              String(t.current_user_role || t.role || "").toLowerCase()
            )
          );
          setTeams(eligible);
          if (eligible.length > 0 && !actingTeamId) {
            setActingTeamId(eligible[0].team_id);
          } else if (eligible.length === 0 && postingAs === "team") {
            setPostingAs("self");
          }
        }
      })
      .catch((err) => {
        console.warn("Could not fetch eligible teams:", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTeams(false);
      });

    return () => { cancelled = true; };
  }, []);

  const activeTeam = useMemo(() => {
    return teams.find((t) => String(t.team_id) === String(actingTeamId)) || teams[0] || null;
  }, [teams, actingTeamId]);

  const activeTeamName = activeTeam?.display_name || activeTeam?.name || activeTeam?.team_name || "Team";
  const activeTeamHandle = activeTeam?.handle || activeTeam?.team_handle || "team";

  // Team banner resolution: custom uploaded banner, banner preset, or deterministic default team banner
  const teamBannerUrl = useMemo(() => {
    if (!activeTeam) return null;
    if (activeTeam.banner_url || activeTeam.banner_path || (activeTeam as any).team_banner_url) {
      return getImageUrl(activeTeam.banner_url || activeTeam.banner_path || (activeTeam as any).team_banner_url);
    }
    if (activeTeam.banner_preset) {
      const preset = resolveBannerPreset(activeTeam.banner_preset, activeTeamHandle || activeTeamName);
      return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Purple.png";
    }
    const fallbackPreset = resolveBannerPreset(null, activeTeamHandle || activeTeamName);
    return bannerPresetUrl(fallbackPreset) || "/profile_banner_presets/Ensemble%20Purple.png";
  }, [activeTeam, activeTeamHandle, activeTeamName]);

  // Fetch team members when team changes
  useEffect(() => {
    if (!actingTeamId || postingAs !== "team") {
      setTeamMembers([]);
      return;
    }

    let cancelled = false;
    setIsLoadingMembers(true);
    api.get(`/api/teams/${actingTeamId}/members`)
      .then((res) => {
        if (!cancelled) {
          const rawMembers: TeamMember[] = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
            ? res.data.data
            : (res.data?.members || []);
          setTeamMembers(rawMembers);

          // If no members selected yet, include everyone by default
          if (includedMemberIds.length === 0) {
            const allIds = rawMembers.map((m) => String(m.account_id));
            setIncludedMemberIds(allIds);
          }
        }
      })
      .catch(() => {
        // Fallback to team details endpoint if members subroute is absent
        api.get(`/api/teams/${actingTeamId}`)
          .then((res) => {
            if (!cancelled) {
              const membersData: TeamMember[] = res.data?.data?.members || res.data?.members || [];
              setTeamMembers(membersData);
              if (includedMemberIds.length === 0) {
                const allIds = membersData.map((m) => String(m.account_id));
                setIncludedMemberIds(allIds);
              }
            }
          })
          .catch((err) => {
            console.warn("Could not fetch team members:", err);
          });
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMembers(false);
      });

    return () => { cancelled = true; };
  }, [actingTeamId, postingAs]);

  const handleToggleMember = (memberAccountId: string) => {
    const mId = String(memberAccountId);
    // Don't allow deselecting current user/leader
    if (mId === currentUserAccountId) return;

    setIncludedMemberIds((prev) => {
      if (prev.includes(mId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== mId);
      } else {
        return [...prev, mId];
      }
    });
  };

  const handleIdentityChange = (target: "self" | "team") => {
    if (target === "team" && (isLoadingTeams || teams.length === 0)) return;
    setPostingAs(target);
    if (target === "team" && !actingTeamId && teams.length > 0) {
      setActingTeamId(teams[0].team_id);
    }
  };

  const hasTeams = teams.length > 0;

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
          Select Service Representation
        </h2>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
          Choose whether you are publishing this service individually or on behalf of an existing collective team/studio.
        </p>
      </div>

      {/* Upfront 50 Credits Publishing Fee Disclosure */}
      <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Service Publishing Fee
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300/70 dark:border-zinc-700 shadow-2xs">
              <CreditIcon className="h-3 w-3 text-amber-500" /> 50 Credits
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            50 Credits will be deducted upon final review and publishing in Step 6. Drafting is free.
          </p>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-zinc-200/60 dark:border-zinc-800/80">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Your Wallet:</span>
            <span className="font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1">
              <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
              {walletBalance !== null ? `${walletBalance} Cr` : "..."}
            </span>
          </div>
          {walletBalance !== null && walletBalance < 50 ? (
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

      {/* Main Representation Choice: Solo vs Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Option 1: Solo Freelancer (User's Profile Banner & User Avatar) */}
        <div
          onClick={() => handleIdentityChange("self")}
          className={`rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer overflow-hidden ${
            postingAs === "self"
              ? "border-zinc-900 dark:border-white bg-zinc-50/90 dark:bg-zinc-800/50 shadow-xs ring-1 ring-zinc-900 dark:ring-white"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40"
          }`}
        >
          {/* Top Banner Accent: Uses Profile Banner of the User */}
          <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
            <img
              src={userBannerUrl}
              alt="User Profile Banner"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "/profile_banner_presets/Ensemble%20Blue.png";
              }}
              className="w-full h-full object-cover"
            />
            {/* Top-Right Selection Radio */}
            <div className="absolute top-3 right-3 z-10">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors shadow-xs ${
                  postingAs === "self"
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "bg-white/90 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-transparent backdrop-blur-xs"
                }`}
              >
                {postingAs === "self" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* User Info Content */}
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
            <div className="flex items-start gap-3.5 mb-3">
              <div className="relative -mt-10 sm:-mt-11">
                <img
                  src={userAvatarUrl}
                  alt="Avatar"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = constructAvatarUrl(undefined, userName);
                  }}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white dark:border-dark-surface object-cover shadow-sm bg-white"
                />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {user?.display_name || user?.username || "Individual Freelancer"}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                    You
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                  @{user?.username || "username"}
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
              Publish service directly under your personal freelancer profile, client ratings, and individual portfolio showcase.
            </p>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
              <span>Identity: Individual Freelancer</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Solo Workspace
              </span>
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
            <div className="p-4 sm:p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                {/* Overlapping Avatar Skeleton */}
                <div className="relative z-10 -mt-7 sm:-mt-8 mb-3">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-zinc-200 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm animate-pulse" />
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
            onClick={() => handleIdentityChange("team")}
            className={`rounded-2xl border text-left transition-all flex flex-col justify-between overflow-hidden ${
              !hasTeams && !isLoadingTeams
                ? "opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/40 dark:bg-zinc-900/20 select-none"
                : "cursor-pointer"
            } ${
              postingAs === "team"
                ? "border-zinc-900 dark:border-white bg-zinc-50/90 dark:bg-zinc-800/50 shadow-xs ring-1 ring-zinc-900 dark:ring-white"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/40"
            }`}
          >
            {/* Top Banner Accent: Team Banner if available; Empty Gray if no team */}
            <div className="relative h-20 sm:h-24 w-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
              {hasTeams && teamBannerUrl ? (
                <img
                  src={teamBannerUrl}
                  alt="Team Banner"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/profile_banner_presets/Ensemble%20Purple.png";
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Empty gray banner when user has no teams */
                <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800/80" />
              )}

              {/* Top-Right Selection Radio */}
              <div className="absolute top-3 right-3 z-10">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center transition-colors shadow-xs ${
                    !hasTeams
                      ? "border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70"
                      : postingAs === "team"
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                      : "bg-white/90 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-700 text-transparent backdrop-blur-xs"
                  }`}
                >
                  {hasTeams && postingAs === "team" && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>
              </div>
            </div>

            {/* Team Info Content: Profile picture is ALWAYS the user's avatar */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
              <div className="flex items-start gap-3.5 mb-3">
                <div className="relative -mt-10 sm:-mt-11">
                  {/* Profile is ALWAYS the user's avatar */}
                  <div className="relative">
                    <img
                      src={userAvatarUrl}
                      alt="Your Avatar"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = constructAvatarUrl(undefined, userName);
                      }}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white dark:border-dark-surface object-cover shadow-sm bg-white"
                    />
                    {/* Subtle team representative badge */}
                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${hasTeams ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900" : "bg-zinc-400 dark:bg-zinc-600 text-white"} flex items-center justify-center shadow-xs border-2 border-white dark:border-dark-surface`}>
                      <Users className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>

                <div className="min-w-0 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {hasTeams ? activeTeamName : "As a Team / Studio"}
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
                      Team
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                    {hasTeams ? `@${activeTeamHandle}` : "@team"}
                  </p>
                </div>
              </div>

              {!hasTeams && !isLoadingTeams ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                  No active teams where you are a Team Leader or Representative. Only Team Leaders and trusted Representatives can publish team services.
                </p>
              ) : (
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed mb-4">
                  Publish service under your shared team/studio brand. Orders received will transition into a collaborative team workspace.
                </p>
              )}

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                <span>Identity: Team Representation</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {hasTeams ? "Shared Team Workspace" : "No Active Teams"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* If Team is selected & user has eligible teams: Team Switcher & Included Members Roster */}
      {postingAs === "team" && hasTeams && (
        <div className="space-y-4 p-5 rounded-2xl border border-purple-200/80 dark:border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                <span>Selected Collective Team</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                Service will be attributed to this team and orders will be managed through its collective workspace.
              </p>
            </div>

            {/* Team Dropdown if user has multiple teams */}
            {teams.length > 1 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-800 dark:text-white hover:border-gray-300 dark:hover:border-white/20 transition cursor-pointer shadow-xs"
                >
                  <span className="truncate max-w-[140px]">{activeTeamName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </button>

                {isTeamDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 shadow-xl py-1.5 z-30 animate-in fade-in duration-150">
                    {teams.map((t) => {
                      const tName = t.display_name || t.name || t.team_name || "Team";
                      const isCur = t.team_id === actingTeamId;
                      return (
                        <button
                          key={t.team_id}
                          type="button"
                          onClick={() => {
                            setActingTeamId(t.team_id);
                            setIsTeamDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer ${
                            isCur ? "font-bold text-purple-600 dark:text-purple-400" : "text-gray-700 dark:text-zinc-200"
                          }`}
                        >
                          <span className="truncate">{tName}</span>
                          {isCur && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Included Team Members Checklist */}
          <div className="pt-3 border-t border-purple-100 dark:border-purple-500/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                Included Team Members ({includedMemberIds.length} / {teamMembers.length || 1} Selected)
              </label>
              <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                Team Leader is required and always included
              </span>
            </div>

            {isLoadingMembers ? (
              <div className="p-4 text-center text-xs text-gray-400 dark:text-zinc-500">
                Loading team roster...
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/5 bg-white/70 dark:bg-dark-surface/50 text-xs text-gray-500 dark:text-zinc-400">
                Only the team publisher is currently listed on this roster.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teamMembers.map((member) => {
                  const mId = String(member.account_id);
                  const isCurrentUser = mId === currentUserAccountId;
                  const isSelected = includedMemberIds.includes(mId) || isCurrentUser;

                  return (
                    <div
                      key={mId}
                      onClick={() => handleToggleMember(mId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isCurrentUser
                          ? "border-purple-200 dark:border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 cursor-default"
                          : isSelected
                          ? "border-blue-300 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-950/20 cursor-pointer"
                          : "border-gray-200 dark:border-white/5 bg-white dark:bg-dark-surface/40 hover:border-gray-300 dark:hover:border-white/10 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={constructAvatarUrl(member.avatar_url, member.display_name)}
                          alt={member.display_name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 bg-white"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {member.display_name}
                            {isCurrentUser && " (You)"}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">
                            {member.role || "Member"}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                          isSelected
                            ? "bg-purple-600 border-purple-600 text-white"
                            : "border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step Footer Navigation */}
      <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Service Specifications</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default GigIdentity;
