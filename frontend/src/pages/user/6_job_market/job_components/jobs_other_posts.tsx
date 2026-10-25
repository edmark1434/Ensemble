import { resolveAvatarPath } from "@/lib/accountAvatars";
import { getBudgetDisplayInfo } from "@/lib/formatBudget";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  ArrowRight,
  Bookmark,
  Send,
  Edit2,
  Film,
  TrendingUp,
  Wrench,
} from "lucide-react";
import api from "@/lib/axios";
import { JobRichText } from "./JobRichText";
import { computeJobRankingBreakdown } from "../job_ranking";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import { formatDistanceToNow } from "date-fns";

interface JobsOtherPostsProps {
  currentJobId?: string;
}

export const JobsOtherPosts: React.FC<JobsOtherPostsProps> = ({ currentJobId }) => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const userInfo = useGlobalState((state) => state.user);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getTimeAgo = (date: Date) => {
    try {
      let str = formatDistanceToNow(date, { addSuffix: true });
      str = str
        .replace(/minutes?/, (m) => (m === "minutes" ? "mins" : "min"))
        .replace(/hours?/, (m) => (m === "hours" ? "hrs" : "hr"))
        .replace(/seconds?/, (m) => (m === "seconds" ? "secs" : "sec"))
        .replace(/days?/, "d")
        .replace(/months?/, "m")
        .replace(/years?/, (m) => (m === "years" ? "yrs" : "yr"))
        .replace("about ", "");
      return str;
    } catch {
      return "recently";
    }
  };

  useEffect(() => {
    const fetchOtherJobs = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/api/jobs");
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
          const mapUrl = (path?: string) => {
            if (!path) return "";
            if (path.startsWith("http") || path.startsWith("/")) return path;
            return `${cloudFrontUrl}/${path}`;
          };

          const mapped = response.data.data
            .filter((j: any) => {
              const isNotCurrent = j.job_id !== currentJobId && j.id !== currentJobId;
              const isOpen = (j.status || "").toLowerCase() === "open" || !j.status;
              return isNotCurrent && isOpen;
            })
            .map((j: any) => {
              const isTeam = Boolean(
                j.hiring_type === "team" ||
                (Array.isArray(j.milestones) && j.milestones.length > 0) ||
                j.is_team ||
                j.posted_as === "Team"
              );

              const minBudget = Number(j.rate_credits_min) || 0;
              const maxBudget = Number(j.rate_credits_max) || 0;
              const positionsNeeded = Number(j.no_of_hires || j.positions_needed) || 1;
              const bInfo = getBudgetDisplayInfo({
                minBudget,
                maxBudget,
                isTeam,
                positionsNeeded,
              });

              return {
                id: j.job_id || j.id,
                title: j.title,
                description: j.description || "",
                status: j.status || "Open",
                category: j.category || "General",
                difficulty: j.experience_level || "Intermediate",
                priceRange: bInfo.amountText,
                minBudget,
                maxBudget,
                positionsNeeded,
                applicantsCount: parseInt(j.applicant_count) || 0,
                hiredCount: parseInt(j.hired_count) || 0,
                savesCount: parseInt(j.saves_count) || 0,
                clientRating: parseFloat(j.client_rating) || 0,
                ratingCount: parseInt(j.client_rating_count) || 0,
                postedBy: j.client_name || j.client_handle || "Unknown",
                clientAvatar: resolveAvatarPath(j.client_avatar_path),
                postedAt: j.created_at ? new Date(j.created_at).toLocaleString() : "",
                createdAt: j.created_at,
                timeAgo: j.created_at ? getTimeAgo(new Date(j.created_at)) : "Just now",
                timeline: `${j.timeline_min || 1}-${j.timeline_max || 7} Days`,
                thumbnail: mapUrl(j.thumbnail_path || j.thumbnail),
                skills: j.tags || [],
                isSaved: Boolean(j.is_saved),
                isOwnPost: Boolean(j.is_own_post || userInfo?.account_id === j.client_account_id),
                isManageablePost: Boolean(j.is_manageable_post),
                hiring_type: j.hiring_type || (isTeam ? "team" : "single"),
                milestones: Array.isArray(j.milestones) ? j.milestones : [],
                is_team: isTeam,
                isTeam,
                portfolioUseAllowed: Boolean(j.portfolio_use_allowed),
                requireNDA: Boolean(j.require_nda),
                screeningQuestions: Array.isArray(j.screening_questions) ? j.screening_questions : [],
              };
            })
            .sort(
              (a: any, b: any) =>
                computeJobRankingBreakdown(b).totalScore -
                computeJobRankingBreakdown(a).totalScore
            )
            .slice(0, 3);

          setJobs(mapped);
        }
      } catch (err) {
        console.error("Error fetching other jobs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOtherJobs();
  }, [currentJobId, userInfo]);

  const handleToggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    if (isGuestMode) return;
    try {
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, isSaved: !job.isSaved } : job))
      );
      await api.post(`/api/jobs/${jobId}/save`);
    } catch {
      // Revert on error
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, isSaved: !job.isSaved } : job))
      );
    }
  };

  if (!isLoading && jobs.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10 w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Other Job Posts You May Like
          </h2>
          <p
            className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Explore more opportunities and projects across the job market
          </p>
        </div>
        <button
          onClick={() => navigate("/jobs/postings")}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-zinc-400 transition-colors hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          View More Jobs <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-4 animate-pulse"
              >
                <div>
                  <div className="mb-3 h-40 w-full rounded-xl bg-gray-200 dark:bg-zinc-800" />
                  <div className="mb-2 flex items-center gap-1.5">
                    <div className="h-4 w-12 rounded bg-gray-200 dark:bg-zinc-800" />
                    <div className="h-4 w-16 rounded bg-gray-200 dark:bg-zinc-800" />
                  </div>
                  <div className="mb-2 h-5 w-3/4 rounded bg-gray-200 dark:bg-zinc-800" />
                  <div className="mb-4 h-8 w-full rounded bg-gray-200 dark:bg-zinc-800/60" />
                </div>
                <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                  <div className="h-5 w-24 rounded bg-gray-200 dark:bg-zinc-800" />
                  <div className="h-4 w-12 rounded bg-gray-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))
          : jobs.map((job) => {
              const rankInfo = computeJobRankingBreakdown(job);
              const isOpen = job.status?.toLowerCase() === "open" || !job.status;

              return (
                <div
                  key={job.id}
                  onClick={() => {
                    navigate(`/jobs/postings/${job.id}/page`);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="group flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.06] p-4 shadow-sm hover:shadow-md dark:shadow-none transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <div>
                    {/* Thumbnail Image */}
                    <div className="h-40 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-100 dark:border-white/5 relative mb-3 flex items-center justify-center">
                      {job.thumbnail ? (
                        <img
                          src={job.thumbnail}
                          alt={job.title}
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                          className="h-full w-full object-cover opacity-85 transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <Film className="h-8 w-8 text-gray-400 dark:text-zinc-600" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent pointer-events-none" />

                      {/* Top-left Proposals count */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                          <Send className="h-3 w-3" />
                          <span>{job.applicantsCount || 0} Proposals</span>
                        </div>
                      </div>

                      {/* Bottom-left Difficulty Tag */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                        <span className="px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                          {job.difficulty || "Beginner"}
                        </span>
                      </div>

                      {/* Top-right Actions */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        {job.isManageablePost && (
                          <button
                            title="Edit Post"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/jobs/edit-post/${job.id}`);
                            }}
                            className="p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm text-gray-500 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {!isGuestMode && (
                          <button
                            title="Save Job Post"
                            onClick={(e) => handleToggleSave(e, job.id)}
                            className={`p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors flex items-center gap-1 ${
                              job.isSaved
                                ? "text-yellow-500"
                                : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                            }`}
                          >
                            <Bookmark className={`h-3.5 w-3.5 ${job.isSaved ? "fill-current" : ""}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Pill Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span
                        className={`relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isOpen
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                            : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                        }`}
                      >
                        <span className="relative z-10">{isOpen ? "Open" : "Closed"}</span>
                        {isOpen && (
                          <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/30 to-transparent" />
                        )}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                        {job.category || "General"}
                      </span>
                      {rankInfo.isRisingJob && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/jobs/info");
                          }}
                          title={`Rising Job Post — Click to see how this badge works (Score: ${rankInfo.totalScore})`}
                          className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 hover:bg-emerald-200/90 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 dark:hover:bg-emerald-500/35 shadow-xs transition-colors cursor-pointer"
                        >
                          <TrendingUp className="relative z-10 h-2.5 w-2.5" />
                          <span className="relative z-10">Rising</span>
                          <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent pointer-events-none" />
                        </button>
                      )}
                    </div>

                    {/* Price & Tag */}
                    {(() => {
                      const bDisplay = getBudgetDisplayInfo({
                        minBudget: job.minBudget,
                        maxBudget: job.maxBudget,
                        isTeam: Boolean(job.hiring_type === "team" || job.is_team || job.isTeam),
                        positionsNeeded: job.positionsNeeded,
                      });
                      return (
                        <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                          <div className="text-amber-500 dark:text-amber-400 text-base font-black flex items-center gap-1">
                            <CreditIcon className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                            <span>{bDisplay.amountText}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${bDisplay.tagColorClass}`}>
                            {bDisplay.tagLabel}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Title */}
                    <h3
                      className="text-gray-900 dark:text-white text-base font-bold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {job.title}
                    </h3>

                    {/* Description */}
                    <div className="mb-3">
                      <JobRichText content={job.description} truncate={2} />
                    </div>
                    {Array.isArray(job.skills) && job.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-400 shrink-0 mr-0.5" />
                        {job.skills.slice(0, 3).map((skill: string) => (
                          <span
                            key={skill}
                            className="rounded-md border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:text-zinc-300"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 3 && (
                          <span className="rounded-md border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400">
                            +{job.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    <div className="flex items-center gap-1.5 truncate">
                      <div className="relative h-5 w-5 shrink-0">
                        <img
                          src={job.clientAvatar}
                          alt=""
                          className={`h-5 w-5 rounded-full object-cover border border-gray-200 dark:border-white/10 ${!job.clientAvatar ? 'hidden' : ''}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling;
                            if (fallback) {
                              fallback.classList.remove('hidden');
                              fallback.classList.add('flex');
                            }
                          }}
                        />
                        <div className={`${job.clientAvatar ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-800 text-[9px] text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 overflow-hidden`}>
                          {job.postedBy ? job.postedBy.charAt(0).toUpperCase() : "U"}
                        </div>
                      </div>
                      <span className="truncate text-gray-700 dark:text-zinc-300 font-semibold">
                        {job.postedBy}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-gray-400 dark:text-zinc-400 text-[10px] shrink-0 ml-2">
                      <Clock className="h-3 w-3 text-gray-400 dark:text-zinc-500" />
                      <span>{job.timeAgo}</span>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
};

export default JobsOtherPosts;
