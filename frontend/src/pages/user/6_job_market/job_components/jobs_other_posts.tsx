import { getBudgetDisplayInfo } from "@/lib/formatBudget";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, Wrench, Bookmark, Users, User } from "lucide-react";
import api from "@/lib/axios";
import { JobRichText } from "./JobRichText";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import { formatDistanceToNow } from "date-fns";

interface JobsOtherPostsProps {
  currentJobId?: string;
}

export const JobsOtherPosts: React.FC<JobsOtherPostsProps> = ({ currentJobId }) => {
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
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
            if (!path) return "/placeholder.svg";
            if (path.startsWith("http") || path.startsWith("/")) return path;
            return `${cloudFrontUrl}/${path}`;
          };

          const filtered = response.data.data
            .filter((j: any) => {
              const isNotCurrent = j.job_id !== currentJobId && j.id !== currentJobId;
              const isOpen = (j.status || "").toLowerCase() === "open";
              return isNotCurrent && isOpen;
            })
            .slice(0, 3)
            .map((j: any) => {
              const isTeam = Boolean(
                j.hiring_type === "team" ||
                (Array.isArray(j.milestones) && j.milestones.length > 0) ||
                j.is_team ||
                j.posted_as === "Team"
              );

              const minBudget = Number(j.rate_credits_min) || 0;
              const maxBudget = Number(j.rate_credits_max) || 0;
              const bInfo = getBudgetDisplayInfo({
                minBudget,
                maxBudget,
                isTeam: Boolean(j.hiring_type === "team" || j.is_team),
                positionsNeeded: j.positions_needed
              });
              const priceRange = bInfo.amountText;

              return {
                id: j.job_id || j.id,
                title: j.title,
                description: j.description || "",
                status: j.status || "Open",
                category: j.category || "General",
                difficulty: j.experience_level || "Intermediate",
                priceRange,
                minBudget,
                maxBudget,
                postedBy: j.client_name || j.client_handle || "Unknown",
                clientAvatar: j.client_avatar_path
                  ? `${cloudFrontUrl}${j.client_avatar_path.startsWith("/") ? "" : "/"}${j.client_avatar_path}`
                  : undefined,
                timeAgo: getTimeAgo(new Date(j.created_at)),
                thumbnail: mapUrl(j.thumbnail_path || j.thumbnail),
                skills: j.tags || [],
                isSaved: Boolean(j.is_saved),
                isTeam,
              };
            });

          setJobs(filtered);
        }
      } catch (err) {
        console.error("Error fetching other jobs:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOtherJobs();
  }, [currentJobId]);

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
          : jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => navigate(`/jobs/postings/${job.id}/page`)}
                className="group relative flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/40 p-4 shadow-sm hover:shadow-xl dark:hover:border-white/20 transition-all duration-300 cursor-pointer"
              >
                <div>
                  {/* Thumbnail Container */}
                  <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800">
                    <img
                      src={job.thumbnail}
                      alt={job.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {/* Team or Individual Hiring Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      {job.isTeam ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/80 backdrop-blur-md text-white border border-purple-400/40 shadow-sm flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />
                          Team Project
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/80 backdrop-blur-md text-white border border-blue-400/40 shadow-sm flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          Individual
                        </span>
                      )}
                    </div>

                    {/* Skills Overlay */}
                    {job.skills && job.skills.length > 0 && (
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-wrap gap-1 items-center">
                        <div className="flex items-center justify-center h-5 w-5 rounded bg-black/60 backdrop-blur-md border border-white/15 text-zinc-300 shadow-sm shrink-0">
                          <Wrench className="h-2.5 w-2.5" />
                        </div>
                        {job.skills.slice(0, 2).map((skill: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-medium text-white shadow-sm"
                          >
                            {skill}
                          </span>
                        ))}
                        {job.skills.length > 2 && (
                          <span className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-medium text-zinc-300">
                            +{job.skills.length - 2}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Save Button */}
                    <div className="absolute top-2.5 right-2.5 z-10">
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
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span
                      className={`relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border ${
                        job.status?.toLowerCase() === "open"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                          : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      }`}
                    >
                      <span className="relative z-10">{job.status}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                      {job.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                      {job.difficulty}
                    </span>
                  </div>

                  {/* Price & Tag */}
                  {(() => {
                    const bDisplay = getBudgetDisplayInfo({
                      minBudget: job.minBudget,
                      maxBudget: job.maxBudget,
                      positionsNeeded: 1,
                    });
                    return (
                      <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                        <div className="text-amber-500 dark:text-amber-400 text-sm font-black flex items-center gap-1">
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
                    className="text-gray-900 dark:text-white text-sm font-bold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {job.title}
                  </h3>

                  {/* Description */}
                  <div className="mb-4">
                    <JobRichText content={job.description} truncate={2} />
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    {job.clientAvatar ? (
                      <img
                        src={job.clientAvatar}
                        alt=""
                        className="h-5 w-5 shrink-0 rounded-full object-cover border border-gray-200 dark:border-white/10"
                      />
                    ) : (
                      <div className="h-5 w-5 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-[9px] text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10">
                        {job.postedBy.charAt(0)}
                      </div>
                    )}
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
            ))}
      </div>
    </section>
  );
};

export default JobsOtherPosts;
