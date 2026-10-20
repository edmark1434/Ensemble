// src/pages/user/1_home/home_components/home_featured_jobs.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreditIcon } from "@/components/ui/credit-icon";
import {
  Clock,
  ArrowRight,
  Bookmark,
  Send,
  Users,
  User,
  Edit2,
  Film,
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { JobRichText } from "../../6_job_market/job_components/JobRichText";
import { getImageUrl } from "@/lib/utils";
import { getBudgetDisplayInfo } from "@/lib/formatBudget";

function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (isNaN(seconds) || seconds < 0) return "Just now";
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export interface Job {
  id: string;
  title: string;
  description: string;
  status: "Open" | "Closed";
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Expert";
  priceRange: string;
  minBudget: number;
  maxBudget?: number;
  postedBy: string;
  postedAt: string;
  createdAt?: string;
  timeAgo: string;
  clientRating: number;
  ratingCount: number;
  positionsNeeded: number;
  applicantsCount: number;
  timeline: string;
  thumbnail: string;
  clientAvatar?: string;
  skills?: string[];
  isSaved?: boolean;
  isOwnPost?: boolean;
  isManageablePost?: boolean;
  hiring_type?: string;
  milestones?: any[];
  is_team?: boolean;
}

export const HomeFeaturedJobs: React.FC = () => {
  const navigate = useNavigate();
  const { fetchJobs, toggleJobSave } = useJobs();
  const userInfo = useGlobalState((state) => state.user);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const handleToggleSave = async (jobId: string) => {
    if (!userInfo) return;
    try {
      await toggleJobSave(jobId);
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId ? { ...job, isSaved: !job.isSaved } : job
        )
      );
    } catch (err) {
      console.error("Failed to toggle save", err);
    }
  };

  React.useEffect(() => {
    const loadJobs = async () => {
      try {
        const fetchedJobs = await fetchJobs();
        if (!Array.isArray(fetchedJobs)) return;

        const mappedJobs = fetchedJobs.map((j: any) => {
          const isTeam = Boolean(j.hiring_type === "team" || j.is_team || j.posted_as === "Team");
          const bDisplay = getBudgetDisplayInfo({
            minBudget: j.rate_credits_min,
            maxBudget: j.rate_credits_max,
            isTeam,
            positionsNeeded: j.no_of_hires,
          });

          return {
            id: j.job_id,
            title: j.title,
            description: j.description,
            status: j.status,
            category: j.category,
            difficulty: j.experience_level,
            priceRange: bDisplay.amountText,
            minBudget: Number(j.rate_credits_min) || 0,
            maxBudget: Number(j.rate_credits_max) || 0,
            postedBy: j.client_name || j.client_handle || "Unknown",
            postedAt: j.created_at ? new Date(j.created_at).toLocaleString() : "",
            createdAt: j.created_at,
            timeAgo: j.created_at ? getTimeAgo(new Date(j.created_at)) : "Just now",
            clientRating: 5.0,
            ratingCount: 0,
            positionsNeeded: j.no_of_hires || 1,
            applicantsCount: parseInt(j.applicant_count) || 0,
            timeline: `${j.timeline_min}-${j.timeline_max} Days`,
            thumbnail: getImageUrl(j.thumbnail_path),
            clientAvatar: getImageUrl(j.client_avatar_path) || undefined,
            skills: j.tags || [],
            isSaved: j.is_saved || false,
            isOwnPost: Boolean(j.is_own_post || userInfo?.account_id === j.client_account_id),
            isManageablePost: Boolean(j.is_manageable_post),
            hiring_type: j.hiring_type || (isTeam ? "team" : "single"),
            milestones: Array.isArray(j.milestones) ? j.milestones : [],
            is_team: isTeam,
          };
        });

        // Only show Open jobs, sorted newest first
        const openJobs = mappedJobs
          .filter((j: any) => j.status?.toLowerCase() === "open" || !j.status)
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setJobs(openJobs.slice(0, 3));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, [fetchJobs, userInfo]);

  if (loading) {
    return (
      <section>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Latest Job Posts</h2>
          </div>
        </div>
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
          {[1, 2, 3].map((i, index) => (
            <div key={i} className={`h-72 bg-gray-100 dark:bg-white/5 animate-pulse rounded-2xl border border-gray-200 dark:border-white/10 ${index === 2 ? "hidden 2xl:block" : ""}`} />
          ))}
        </div>
      </section>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2
            className="text-xl font-bold tracking-tight text-gray-900 dark:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Latest Job Posts
          </h2>
          <p
            className="text-xs text-gray-500 dark:text-zinc-400"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Fresh opportunities from verified clients seeking editors
          </p>
        </div>
        <button
          onClick={() => navigate("/jobs/postings")}
          className="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-white transition hover:text-gray-900 dark:hover:text-zinc-300"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Browse All Jobs <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {jobs.map((job: Job, index: number) => (
          <div
            key={job.id}
            onClick={() => navigate(`/jobs/postings/${job.id}`)}
            className={`group flex flex-col justify-between rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 cursor-pointer border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/[0.06] shadow-sm hover:shadow-md dark:shadow-none ${index === 2 ? "hidden 2xl:flex" : "flex"}`}
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

                {/* Bottom-left Hiring Type Tag */}
                <div className="absolute bottom-2 left-2 z-10">
                  {Boolean(job.hiring_type === "team" || job.is_team) ? (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                      <Users className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                      <span>Team</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                      <User className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                      <span>Individual</span>
                    </span>
                  )}
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
                  <button
                    title="Save Job Post"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSave(job.id);
                    }}
                    className={`p-1.5 rounded-full bg-white/80 dark:bg-black/50 backdrop-blur-sm transition-colors flex items-center gap-1 ${
                      job.isSaved ? "text-yellow-500" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Bookmark className={`h-3.5 w-3.5 ${job.isSaved ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Category Pill Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span
                  className={`relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border ${
                    job.status?.toLowerCase() === "open" || !job.status
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                      : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                  }`}
                >
                  <span className="relative z-10">{job.status?.toLowerCase() === "open" || !job.status ? "Open" : "Closed"}</span>
                  {(job.status?.toLowerCase() === "open" || !job.status) && (
                    <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/30 to-transparent" />
                  )}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                  {job.category || "General"}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                  {job.difficulty || "Beginner"}
                </span>
              </div>

              {/* Price & Tag */}
              {(() => {
                const bDisplay = getBudgetDisplayInfo({
                  minBudget: job.minBudget,
                  maxBudget: job.maxBudget,
                  isTeam: Boolean(job.hiring_type === "team" || job.is_team),
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

              <h3
                className="text-gray-900 dark:text-white text-base font-bold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {job.title}
              </h3>
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
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                    className="h-5 w-5 shrink-0 rounded-full object-cover border border-gray-200 dark:border-white/10"
                  />
                ) : null}
                <div className={`h-5 w-5 shrink-0 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-[9px] text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 ${job.clientAvatar ? "hidden" : ""}`}>
                  {job.postedBy.charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-gray-700 dark:text-zinc-300 font-semibold">{job.postedBy}</span>
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
