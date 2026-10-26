import { useCallback, useEffect, useState } from "react";
import { Briefcase, CheckCircle2, Clock, Grid3x3, Info, List, Search, Star, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import api from "@/lib/axios";
import socket from "@/lib/socket";
import UserHeader from "@/components/nav/user_header";
import { showErrorToast } from "@/components/utility/toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { WorkspaceInfoTab } from "./WorkspaceInfoTab";

interface WorkspaceTeam {
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
  review_status?: {
    contract_id: string;
    needs_review: boolean;
    user_has_reviewed: boolean;
    counterparty_has_reviewed: boolean;
    counterparty_reviewed_at?: string | null;
    user_reviewed_at?: string | null;
  } | null;
}

const CardReviewTimer: React.FC<{ contractId: string; reviewedAt?: string | null }> = ({ contractId, reviewedAt }) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => {
    const storageKey = `ensemble_review_deadline_${contractId}`;
    let deadline = 0;
    if (reviewedAt) {
      deadline = new Date(reviewedAt).getTime() + 24 * 60 * 60 * 1000;
    } else {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        deadline = parseInt(stored, 10);
      }
      if (!deadline || isNaN(deadline)) {
        deadline = Date.now() + 24 * 60 * 60 * 1000;
        localStorage.setItem(storageKey, String(deadline));
      }
    }
    return Math.max(0, deadline - Date.now());
  });

  useEffect(() => {
    const update = () => {
      const storageKey = `ensemble_review_deadline_${contractId}`;
      let deadline = 0;
      if (reviewedAt) {
        deadline = new Date(reviewedAt).getTime() + 24 * 60 * 60 * 1000;
      } else {
        const stored = localStorage.getItem(storageKey);
        deadline = stored ? parseInt(stored, 10) : Date.now() + 24 * 60 * 60 * 1000;
      }
      setTimeLeftMs(Math.max(0, deadline - Date.now()));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [contractId, reviewedAt]);

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  return <span className="font-mono">{formatCountdown(timeLeftMs)}</span>;
};

const WorkspaceCardSkeleton = () => (
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

export default function Workspaces() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortMethod, setSortMethod] = useState<"default" | "az" | "members">("default");
  const [viewMode, setViewMode] = useState<"grid" | "compact">("grid");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "review" | "archived" | "info">("all");

  const isReviewPhase = (team: WorkspaceTeam) => {
    if (team.is_archived) return false;
    return Boolean(
      team.review_status?.needs_review ||
      (team.review_status?.user_has_reviewed && !team.review_status?.counterparty_has_reviewed)
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const getImageUrl = (path?: string) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const cloudfrontUrl = (import.meta.env.VITE_CLOUDFRONT_URL || "").replace(/\/$/, "");
    return `${cloudfrontUrl}/${path.replace(/^\//, "")}`;
  };

  const loadWorkspaces = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);

    try {
      const response = await api.get("/api/teams", {
        params: {
          mine: true,
          search: debouncedSearchTerm,
          limit: 50,
        },
      });

      const items = (response.data.data || []) as WorkspaceTeam[];
      // Keep only contractual workspaces
      const contractualOnly = items.filter((t) => t.team_type === "contractual");
      setWorkspaces(contractualOnly);
    } catch (error: any) {
      showErrorToast(error?.response?.data?.message || "Unable to load workspaces");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    void loadWorkspaces(true);
  }, [loadWorkspaces]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleUpdate = () => {
      loadWorkspaces(false);
    };
    socket.on("teamTaskWorkspaceUpdated", handleUpdate);
    socket.on("contractReviewUpdated", handleUpdate);
    socket.on("contractFullyCompleted", handleUpdate);
    socket.on("projectCompleted", handleUpdate);
    return () => {
      socket.off("teamTaskWorkspaceUpdated", handleUpdate);
      socket.off("contractReviewUpdated", handleUpdate);
      socket.off("contractFullyCompleted", handleUpdate);
      socket.off("projectCompleted", handleUpdate);
    };
  }, [loadWorkspaces]);

  // Tab filtering: All, Active, Rate & Review, Archived
  const activeWorkspaces = workspaces.filter((t) => !t.is_archived && !isReviewPhase(t));
  const reviewWorkspaces = workspaces.filter((t) => isReviewPhase(t));
  const archivedWorkspaces = workspaces.filter((t) => Boolean(t.is_archived));

  let displayed = workspaces;
  if (activeTab === "active") displayed = activeWorkspaces;
  if (activeTab === "review") displayed = reviewWorkspaces;
  if (activeTab === "archived") displayed = archivedWorkspaces;

  // Sorting
  displayed = [...displayed].sort((a, b) => {
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
      id: "all" as const,
      label: "All Workspaces",
      icon: <Briefcase className="h-4 w-4" />,
      count: workspaces.length,
    },
    {
      id: "active" as const,
      label: "Active",
      icon: <CheckCircle2 className="h-4 w-4" />,
      count: activeWorkspaces.length,
    },
    {
      id: "review" as const,
      label: "Rate & Review",
      icon: <Star className="h-4 w-4" />,
      count: reviewWorkspaces.length,
    },
    {
      id: "archived" as const,
      label: "Archived",
      icon: <Clock className="h-4 w-4" />,
      count: archivedWorkspaces.length,
    },
    {
      id: "info" as const,
      label: "Workspace Info",
      icon: <Info className="h-4 w-4" />,
      count: null,
    },
  ];

  // Grid View Card
  const renderWorkspaceCard = (team: WorkspaceTeam) => (
    <article
      key={team.team_id}
      onClick={() => navigate(`/team-project/${team.team_id}`)}
      className="group cursor-pointer overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between"
    >
      <div>
        {/* Card Thumbnail Banner */}
        <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-gray-100 dark:bg-zinc-800">
          {/* Review Status & Timer Overlay Badge - Upper Left (Subtle, sleek, high-contrast) */}
          {!team.is_archived && team.review_status?.needs_review && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/85 dark:bg-black/85 text-white text-[10px] font-medium shadow-md border border-white/20 backdrop-blur-md">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-semibold text-zinc-100">Rate &amp; Review</span>
              <span className="text-zinc-500">•</span>
              <CardReviewTimer
                contractId={team.review_status.contract_id}
                reviewedAt={team.review_status.counterparty_reviewed_at}
              />
            </div>
          )}

          {!team.is_archived && !team.review_status?.needs_review && team.review_status?.user_has_reviewed && !team.review_status?.counterparty_has_reviewed && (
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/85 dark:bg-black/85 text-white text-[10px] font-medium shadow-md border border-white/20 backdrop-blur-md">
              <Clock className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="font-semibold text-zinc-100">Awaiting Peer</span>
              <span className="text-zinc-500">•</span>
              <CardReviewTimer
                contractId={team.review_status.contract_id}
                reviewedAt={team.review_status.user_reviewed_at}
              />
            </div>
          )}

          {team.avatar_path ? (
            <img
              src={getImageUrl(team.avatar_path)}
              alt={team.display_name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="grid h-full place-items-center text-gray-400 dark:text-zinc-600">
              <Briefcase className="w-10 h-10" />
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

          {/* Badges Row - Clean status: Active | Rate & Review | Archived */}
          <div className="flex flex-wrap items-center gap-1.5">
            {team.is_archived ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-purple-500" />
                Archived
              </span>
            ) : isReviewPhase(team) ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500 animate-pulse" />
                Rate &amp; Review
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
                Active
              </span>
            )}

            {/* Category Tag */}
            {team.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                {team.category}
              </span>
            )}

            {/* Role Tag */}
            {team.current_user_role && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                {team.current_user_role === "Owner" ? "Client Owner" : team.current_user_role}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="line-clamp-2 text-xs text-gray-600 dark:text-zinc-400 leading-relaxed pt-1">
            {team.description || "Contract milestone requirements and project deliverables."}
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

  // Compact List View Card
  const renderCompactWorkspaceCard = (team: WorkspaceTeam) => (
    <div
      key={team.team_id}
      onClick={() => navigate(`/team-project/${team.team_id}`)}
      className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3.5 transition-all duration-200 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/10 shadow-xs cursor-pointer group"
    >
      <div className="relative h-18 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800">
        {/* Review Status & Timer Overlay Badge - Upper Left */}
        {!team.is_archived && team.review_status?.needs_review && (
          <div className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-900/85 dark:bg-black/85 text-white text-[9px] font-medium shadow-xs border border-white/20 backdrop-blur-md">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400 shrink-0" />
            <CardReviewTimer
              contractId={team.review_status.contract_id}
              reviewedAt={team.review_status.counterparty_reviewed_at}
            />
          </div>
        )}
        {!team.is_archived && !team.review_status?.needs_review && team.review_status?.user_has_reviewed && !team.review_status?.counterparty_has_reviewed && (
          <div className="absolute top-1 left-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-900/85 dark:bg-black/85 text-white text-[9px] font-medium shadow-xs border border-white/20 backdrop-blur-md">
            <Clock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <CardReviewTimer
              contractId={team.review_status.contract_id}
              reviewedAt={team.review_status.user_reviewed_at}
            />
          </div>
        )}

        {team.avatar_path ? (
          <img
            src={getImageUrl(team.avatar_path)}
            alt={team.display_name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-gray-400 dark:text-zinc-600">
            <Briefcase className="w-8 h-8" />
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
          {team.is_archived ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-purple-500" />
              Archived
            </span>
          ) : isReviewPhase(team) ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500 animate-pulse" />
              Rate &amp; Review
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
              Active
            </span>
          )}

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

          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 ml-2">
            <Users className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
            {team.member_count} {team.member_count === 1 ? "member" : "members"}
          </span>
        </div>

        <p className="line-clamp-1 text-xs text-gray-500 dark:text-zinc-400">
          {team.description || "Contract milestone requirements and project deliverables."}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base">
      <UserHeader pageTitle="Workspaces" />

      <div data-tour="workspaces-container" className="mx-auto max-w-7xl p-6 md:p-8">
        {/* Top Search & Filter Bar (Only shown on workspace tabs, hidden on Info tab) */}
        {activeTab !== "info" && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search workspaces by project title, job category, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500 shadow-xs"
              />
            </div>
          </div>
        )}

        {/* Tabs: All Workspaces | Active | Rate & Review | Archived | Workspace Info */}
        <div className="mb-8 flex flex-wrap items-center justify-between border-b border-gray-200 dark:border-white/10 gap-4">
          <div className="flex gap-1 relative overflow-x-auto max-w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 font-semibold"
                      : "text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-t-lg"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {tab.icon} {tab.label}
                    {tab.count !== null && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-gray-200 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </span>

                  {isActive && (
                    <>
                      <motion.div
                        layoutId="workspacesActiveTabGlow"
                        className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                      <motion.div
                        layoutId="workspacesActiveTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      />
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sort & View Mode Controls (Hidden on info tab) */}
          {activeTab !== "info" && (
            <div className="py-2 flex items-center gap-3">
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

              <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-white/15 bg-white dark:bg-white/5 p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  title="Grid View"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("compact")}
                  className={`p-1.5 rounded-md transition-all duration-200 cursor-pointer ${
                    viewMode === "compact"
                      ? "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-xs"
                      : "text-gray-400 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white"
                  }`}
                  title="Compact View"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        {activeTab === "info" ? (
          <WorkspaceInfoTab />
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <WorkspaceCardSkeleton key={idx} />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="py-8">
            <EmptyState
              title={
                debouncedSearchTerm
                  ? "No matching workspaces found"
                  : activeTab === "review"
                  ? "No workspaces awaiting review"
                  : activeTab === "active"
                  ? "No active workspaces"
                  : activeTab === "archived"
                  ? "No archived workspaces"
                  : "No project workspaces found"
              }
              description={
                debouncedSearchTerm
                  ? `No project workspaces match "${debouncedSearchTerm}". Try searching by job title or client.`
                  : activeTab === "review"
                  ? "Workspaces appear here when all milestones are complete and require mutual rating."
                  : activeTab === "active"
                  ? "In-progress contractual team workspaces will appear here."
                  : activeTab === "archived"
                  ? "Completed contractual workspaces with finished reviews will appear here."
                  : "Contractual team workspaces are automatically created when client job offers or contracts are accepted."
              }
              actionLabel="Browse Job Market"
              onAction={() => navigate("/jobs")}
            />
          </div>
        ) : viewMode === "compact" ? (
          <div className="space-y-3">
            {displayed.map(renderCompactWorkspaceCard)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayed.map(renderWorkspaceCard)}
          </div>
        )}
      </div>
    </div>
  );
}
