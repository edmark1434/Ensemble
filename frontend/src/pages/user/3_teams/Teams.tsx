import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, Briefcase, CheckCircle2, Crown, Grid3x3, List, Plus, Search, UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "@/lib/axios";
import { uploadFileToIntent } from "@/lib/uploadFile";
import UserHeader from "@/components/nav/user_header";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import EditTeamModal, { type TeamFormValues } from "./team_modals/EditTeamModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { continueIfAccountVerified } from "@/lib/accountVerification";

interface TeamCreationEligibility {
  allowed: boolean;
  limit: number | null;
  used: number;
  remaining: number | null;
  unlimited: boolean;
  planName: string;
  code: string | null;
  message: string | null;
}

interface Team {
  team_id: string;
  display_name: string;
  handle?: string;
  description: string;
  avatar_path?: string;
  category?: string;
  visibility?: "Public" | "Private";
  team_type?: "contractual" | "standard";
  job_id?: string;
  is_archived?: boolean;
  member_count: number;
  current_user_role?: string;
  current_user_status?: string;
  is_business_verified?: boolean;
}

const TeamCardSkeleton = () => (
  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs animate-pulse">
    <div className="h-28 w-full bg-gray-200 dark:bg-white/10" />
    <div className="p-4 space-y-2.5">
      <div className="flex justify-between items-start gap-2">
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-white/10 rounded" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded-full" />
      </div>
      <div className="h-3 w-1/3 bg-gray-200 dark:bg-white/10 rounded" />
      <div className="h-3 w-full bg-gray-200 dark:bg-white/10 rounded" />
    </div>
  </div>
);

interface TeamsProps {
  defaultTab?: "general" | "projects";
}

export default function Teams({ defaultTab }: TeamsProps = {}) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const initialTab: "general" | "projects" =
    defaultTab || (tabParam === "projects" || tabParam === "workspaces" ? "projects" : "general");
  const [activeTab, setActiveTab] = useState<"general" | "projects">(initialTab);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    } else if (tabParam === "projects" || tabParam === "workspaces") {
      setActiveTab("projects");
    } else if (tabParam === "general") {
      setActiveTab("general");
    }
  }, [defaultTab, tabParam]);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortMethod, setSortMethod] = useState<"default" | "az" | "members">("default");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const [createProgress, setCreateProgress] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [eligibility, setEligibility] = useState<TeamCreationEligibility | null>(null);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const loadEligibility = useCallback(async () => {
    try {
      const response = await api.get("/api/teams/creation-eligibility");
      if (response.data?.success && response.data.data) {
        setEligibility(response.data.data as TeamCreationEligibility);
      }
    } catch (error: unknown) {
      console.error("Unable to load team creation eligibility", error);
    }
  }, []);

  const handleCreateTeamClick = () => {
    void continueIfAccountVerified(
      () => {
        if (eligibility && !eligibility.allowed) {
          setIsLimitModalOpen(true);
          return;
        }
        setIsCreateModalOpen(true);
      },
      false,
      "Account Verification is required before creating a Team. Please verify your identity first."
    );
  };

  const handleJoinWithCodeClick = () => {
    void continueIfAccountVerified(
      () => setIsJoinModalOpen(true),
      false,
      "Account Verification is required before joining a Team with an invite code. Please verify your identity first."
    );
  };

  const getImageUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
    return `${cloudfrontUrl}/${path.replace(/^\//, "")}`;
  };

  const loadTeams = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);

    try {
      const response = await api.get("/api/teams", {
        params: {
          mine: true,
          search: debouncedSearchTerm,
          limit: 50,
        },
      });

      const items = (response.data.data || []) as Team[];
      setTeams(items);
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to load teams"));
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    void loadTeams(true);
    void loadEligibility();
  }, [loadTeams, loadEligibility]);

  const createTeam = async ({ photo, ...teamValues }: TeamFormValues & { photo: File }) => {
    if (!photo.type.startsWith("image/")) {
      showErrorToast("Choose a valid image file");
      return;
    }

    if (photo.size > 5 * 1024 * 1024) {
      showErrorToast("Choose an image up to 5 MB");
      return;
    }

    setIsSaving(true);
    setCreateProgress("Uploading photo...");

    try {
      const uploaded = await uploadFileToIntent(photo, "profile");
      setCreateProgress("Creating team...");

      const teamResponse = await api.post("/api/teams", {
        ...teamValues,
        avatarUploadIntentId: uploaded.uploadIntentId,
      });

      const createdTeam = teamResponse.data.data;
      showSuccessToast("Team created successfully");
      setIsCreateModalOpen(false);

      setTeams((current) => [
        {
          ...createdTeam,
          team_type: "standard",
          member_count: 1,
          current_user_role: "Owner",
          current_user_status: "Active",
        },
        ...current,
      ]);
      setActiveTab("general");
      void loadTeams(false);
      void loadEligibility();
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to create team"));
    } finally {
      setIsSaving(false);
      setCreateProgress("");
    }
  };

  const joinTeam = async () => {
    if (!joinCode.trim() || isSaving) return;

    setIsSaving(true);

    try {
      const response = await api.post("/api/teams/join-by-code", {
        code: joinCode.trim(),
      });

      if (response.data?.data?.status === "Pending") {
        showSuccessToast("Join request sent, awaiting approval");
      } else {
        showSuccessToast("Team joined successfully");
      }

      setIsJoinModalOpen(false);
      setJoinCode("");
      setActiveTab("general");
      void loadTeams(false);
      void loadEligibility();
    } catch (error: unknown) {
      showErrorToast(getApiError(error, "Unable to join team"));
    } finally {
      setIsSaving(false);
    }
  };

  // General agency & collective teams only (contractual workspaces are in /workspaces)
  const generalTeams = teams.filter((t) => t.team_type !== "contractual");

  let displayedTeams = [...generalTeams].sort((a, b) => {
    if (sortMethod === "az") {
      return (a.display_name || "").localeCompare(b.display_name || "");
    }
    if (sortMethod === "members") {
      return (b.member_count || 0) - (a.member_count || 0);
    }
    return 0;
  });

  const tabs = [
    {
      id: "general" as const,
      label: "General Teams",
      icon: <Users className="h-4 w-4" />,
      count: generalTeams.length,
    },
  ];

  // Grid View Card
  const renderTeamCard = (team: Team) => {
    const isProject = team.team_type === "contractual";
    const targetUrl = isProject ? `/team-project/${team.team_id}` : `/teams/${team.team_id}`;

    return (
      <article
        key={team.team_id}
        onClick={() => navigate(targetUrl)}
        className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
      >
        <div>
          {/* Card Thumbnail Banner (Zero black gradient overlay) */}
          <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
            {team.avatar_path ? (
              <img
                src={getImageUrl(team.avatar_path)}
                alt={team.display_name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full place-items-center text-2xl font-bold text-gray-400 dark:text-zinc-500">
                {isProject ? (
                  <Briefcase className="w-10 h-10 text-gray-400 dark:text-zinc-600" />
                ) : (
                  team.display_name.slice(0, 2).toUpperCase()
                )}
              </div>
            )}
          </div>

          {/* Card Content */}
          <div className="p-4 space-y-2.5">
            {/* Title */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1 flex-1">
                {team.display_name}
              </h3>
            </div>

            {/* Badges Row - High-Contrast in Light Mode */}
            <div className="flex flex-wrap items-center gap-1.5">
              {isProject ? (
                <>
                  {/* Active / Archived Status (Green / Purple) */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      team.is_archived
                        ? "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                        : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        team.is_archived ? "bg-purple-500" : "bg-emerald-500"
                      }`}
                    />
                    {team.is_archived ? "Archived" : "Active Workspace"}
                  </span>

                  {/* Category Tag (Gray) */}
                  {team.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                      {team.category}
                    </span>
                  )}

                  {/* Role Tag (Gray) */}
                  {team.current_user_role && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                      {team.current_user_role === "Owner" ? "Client Owner" : team.current_user_role}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {/* General Team Badges */}
                  {team.current_user_role && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                        team.current_user_role === "Owner"
                          ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                          : team.current_user_role === "Representative" || team.current_user_role === "Admin"
                          ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                          : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                      }`}
                    >
                      {team.current_user_role === "Owner"
                        ? "Team Leader"
                        : team.current_user_role === "Representative" || team.current_user_role === "Admin"
                        ? "Representative"
                        : "Member"}
                    </span>
                  )}

                  {team.current_user_status === "Pending" && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-50 text-yellow-900 border border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800">
                      Pending Approval
                    </span>
                  )}

                  {team.is_business_verified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Description */}
            <p className="line-clamp-2 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed pt-1">
              {team.description || "No project brief or description provided."}
            </p>
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
            {team.member_count} {team.member_count === 1 ? "member" : "members"}
          </span>
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
            Open Space &rarr;
          </span>
        </div>
      </article>
    );
  };

  // Compact List View Card (Matching Projects.tsx)
  const renderCompactTeamCard = (team: Team) => {
    const isProject = team.team_type === "contractual";
    const targetUrl = isProject ? `/team-project/${team.team_id}` : `/teams/${team.team_id}`;

    return (
      <div
        key={team.team_id}
        onClick={() => navigate(targetUrl)}
        className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3.5 transition-all duration-200 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10 shadow-xs cursor-pointer group"
      >
        <div className="relative h-18 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800">
          {team.avatar_path ? (
            <img
              src={getImageUrl(team.avatar_path)}
              alt={team.display_name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-xl font-bold text-gray-400 dark:text-zinc-500">
              {isProject ? (
                <Briefcase className="w-8 h-8 text-gray-400 dark:text-zinc-600" />
              ) : (
                team.display_name.slice(0, 2).toUpperCase()
              )}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              {team.display_name}
            </h3>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline shrink-0">
              Open Space &rarr;
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isProject ? (
              <>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    team.is_archived
                      ? "bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      team.is_archived ? "bg-purple-500" : "bg-emerald-500"
                    }`}
                  />
                  {team.is_archived ? "Archived" : "Active Workspace"}
                </span>

                {team.category && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                    {team.category}
                  </span>
                )}

                {team.current_user_role && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                    {team.current_user_role === "Owner" ? "Client Owner" : team.current_user_role}
                  </span>
                )}
              </>
            ) : (
              <>
                {team.current_user_role && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      team.current_user_role === "Owner"
                        ? "bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800"
                        : team.current_user_role === "Representative" || team.current_user_role === "Admin"
                        ? "bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                        : "bg-gray-100 text-gray-700 border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                    }`}
                  >
                    {team.current_user_role === "Owner"
                      ? "Team Leader"
                      : team.current_user_role === "Representative" || team.current_user_role === "Admin"
                      ? "Representative"
                      : "Member"}
                  </span>
                )}

                {team.current_user_status === "Pending" && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-50 text-yellow-900 border border-yellow-300 dark:bg-yellow-950/50 dark:text-yellow-300 dark:border-yellow-800">
                    Pending Approval
                  </span>
                )}

                {team.is_business_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </span>
                )}
              </>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 ml-2">
              <Users className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
              {team.member_count} {team.member_count === 1 ? "member" : "members"}
            </span>
          </div>

          <p className="line-clamp-1 text-xs text-gray-500 dark:text-zinc-400">
            {team.description || "No project brief or description provided."}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      <UserHeader pageTitle="Teams" />

      <div data-tour="teams-workspace" className="mx-auto max-w-7xl p-6 md:p-8">
        {/* Action Bar (Identical Layout to /projects) */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
          <button
            onClick={handleCreateTeamClick}
            className="shrink-0 flex items-center gap-2 rounded-full bg-black dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-black transition hover:scale-105 group cursor-pointer"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Create a Team</span>
          </button>

          <button
            onClick={handleJoinWithCodeClick}
            className="shrink-0 flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-5 py-3 text-sm font-medium text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10 transition hover:scale-105 cursor-pointer shadow-xs"
          >
            <UserPlus className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
            <span>Join with Code</span>
          </button>

          {eligibility && (
            <div className="shrink-0 flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2.5 text-xs shadow-xs">
              <Users className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
              <span className="font-semibold text-gray-800 dark:text-zinc-200">
                {eligibility.unlimited ? "Unlimited Teams" : `${eligibility.used} / ${eligibility.limit} Teams`}
              </span>
              <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 dark:text-zinc-300">
                {eligibility.planName}
              </span>
            </div>
          )}

          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search teams by title or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs"
            />
          </div>
        </div>

        {/* Tabs & View Toggle (Identical to /projects) */}
        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4">
          {/* Underlined Animated Tabs */}
          <div className="flex gap-1 relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab("general")}
                  className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-t-lg"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.icon} {tab.label}
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </span>

                  {isActive && (
                    <>
                      <motion.div
                        layoutId="teamsActiveTabGlow"
                        className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                      <motion.div
                        layoutId="teamsActiveTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort & View Mode Controls */}
          <div className="py-2 flex items-center gap-3">
            {/* Sort Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1">
              <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 px-2">Sort by:</span>
              <button
                onClick={() => setSortMethod("default")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                  sortMethod === "default"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                Default
              </button>
              <button
                onClick={() => setSortMethod("az")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                  sortMethod === "az"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSortMethod("members")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 cursor-pointer ${
                  sortMethod === "members"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                Members
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1">
              <button
                onClick={() => setViewMode("compact")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                  viewMode === "compact"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <List className="h-4 w-4" />
                List View
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <Grid3x3 className="h-4 w-4" />
                Grid View
              </button>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <TeamCardSkeleton key={i} />
            ))}
          </div>
        ) : displayedTeams.length === 0 ? (
          activeTab === "general" ? (
            <EmptyState
              title={debouncedSearchTerm ? "No matching teams found" : "No general teams found"}
              description={
                debouncedSearchTerm
                  ? `No general teams match "${debouncedSearchTerm}". Try adjusting your keywords or create a new team.`
                  : "You are not a member of any general team yet. Create your own team or join one with an invite code."
              }
              actionLabel="Create a Team"
              onAction={handleCreateTeamClick}
              className="my-4"
            />
          ) : (
            <EmptyState
              title={debouncedSearchTerm ? "No matching workspaces found" : "No project workspaces found"}
              description={
                debouncedSearchTerm
                  ? `No project workspaces match "${debouncedSearchTerm}". Try searching by job title or client.`
                  : "Contractual team workspaces are automatically created when client job offers or contracts are accepted."
              }
              className="my-4"
            />
          )
        ) : viewMode === "compact" ? (
          <div className="space-y-3">
            {displayedTeams.map(renderCompactTeamCard)}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedTeams.map(renderTeamCard)}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <EditTeamModal
        isOpen={isCreateModalOpen}
        mode="create"
        saving={isSaving}
        savingLabel={createProgress}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={createTeam}
      />

      {/* Join Team Modal */}
      {isJoinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Join a Team
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Enter the team invitation or join code to request access.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 mb-1.5">
                Team Join Code
              </label>
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 px-4 py-2.5 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-xs"
                placeholder="e.g. 8F2A1C9D"
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsJoinModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-white/15 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isSaving || !joinCode.trim()}
                onClick={() => void joinTeam()}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Joining..." : "Join Team"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Creation Limit Modal */}
      {isLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Team Creation Limit Reached
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Subscription plan entitlement reached
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-4 text-xs space-y-2">
              <div className="flex justify-between items-center text-gray-600 dark:text-zinc-300">
                <span>Current Plan</span>
                <span className="font-bold text-gray-900 dark:text-white">{eligibility?.planName || "Free"}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600 dark:text-zinc-300">
                <span>Teams Created</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {eligibility?.used || 0} / {eligibility?.unlimited ? "Unlimited" : (eligibility?.limit || 1)}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 pt-2 border-t border-gray-200 dark:border-white/10 leading-relaxed">
                Your current <span className="font-semibold text-gray-900 dark:text-white">{eligibility?.planName || "Free"}</span> plan allows creating up to <span className="font-semibold text-gray-900 dark:text-white">{eligibility?.limit || 1} team{eligibility?.limit === 1 ? "" : "s"}</span>. Upgrade to Premium or Business to create more collaborative team workspaces.
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsLimitModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLimitModalOpen(false);
                  navigate("/settings", { state: { tab: "subscription" } });
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Upgrade Plan</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getApiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (
      (
        error as {
          response?: {
            data?: {
              message?: string;
            };
          };
        }
      ).response?.data?.message || fallback
    );
  }

  return fallback;
}
