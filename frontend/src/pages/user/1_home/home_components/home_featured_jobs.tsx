// src/pages/user/1_home/home_components/home_featured_jobs.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CreditIcon } from "@/components/ui/credit-icon";
import {
  Clock,
  ArrowRight,
  Wrench,
  Bookmark,
} from "lucide-react";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { JobRichText } from "../../6_job_market/job_components/JobRichText";

function getTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
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
  postedBy: string;
  postedAt: string;
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
}

export const HomeFeaturedJobs: React.FC = () => {
  const navigate = useNavigate();
  const { fetchJobs, toggleJobSave } = useJobs();
  const userInfo = useGlobalState((state) => state.user);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const handleToggleSave = async (jobId: string) => {
    if (!userInfo) return; // Prevent saving if not logged in (optional depending on global state)
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

        const mappedJobs = fetchedJobs.map((j: any) => ({
          id: j.job_id,
          title: j.title,
          description: j.description,
          status: j.status,
          category: j.category,
          difficulty: j.experience_level,
          priceRange: `${j.rate_credits_min?.toLocaleString() || 0} ~ ${j.rate_credits_max?.toLocaleString() || 0}`,
          minBudget: j.rate_credits_min || 0,
          postedBy: j.client_name || j.client_handle || "Unknown",
          postedAt: new Date(j.created_at).toLocaleString(),
          timeAgo: getTimeAgo(new Date(j.created_at)),
          clientRating: 5.0,
          ratingCount: 0,
          positionsNeeded: j.no_of_hires || 1,
          applicantsCount: parseInt(j.applicant_count) || 0,
          timeline: `${j.timeline_min}-${j.timeline_max} Days`,
          thumbnail: j.thumbnail_path 
             ? `${import.meta.env.VITE_CLOUDFRONT_URL}${j.thumbnail_path.startsWith('/') ? '' : '/'}${j.thumbnail_path}`
             : "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
          clientAvatar: j.client_avatar_path
            ? `${import.meta.env.VITE_CLOUDFRONT_URL}${j.client_avatar_path.startsWith('/') ? '' : '/'}${j.client_avatar_path}`
            : undefined,
          skills: j.tags || [],
          isSaved: j.is_saved || false,
          isOwnPost: userInfo?.account_id === j.client_account_id,
        }));
        
        // Only show Open jobs, and sort by newest
        const openJobs = mappedJobs.filter(j => j.status === 'Open').sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
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
              <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
                  {[1, 2, 3].map(i => (
                      <div key={i} className="h-72 bg-gray-100 dark:bg-white/5 animate-pulse rounded-2xl border border-gray-200 dark:border-white/10" />
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

      <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
        {jobs.map((job: Job) => (
          <div
            key={job.id}
            onClick={() => navigate(`/jobs/postings/${job.id}`)}
            className="group flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a]/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-white/30 hover:bg-gray-50 dark:hover:bg-white/[0.06] cursor-pointer shadow-sm dark:shadow-none"
          >
            <div>
              {/* Thumbnail Image */}
              <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-zinc-900">
                <img
                  src={job.thumbnail}
                  alt={job.title}
                  className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSave(job.id);
                  }}
                  className={`absolute top-2 right-2 rounded-full bg-white/80 dark:bg-black/50 p-1.5 backdrop-blur-sm transition ${
                    job.isSaved ? "text-yellow-500" : "text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Bookmark className={`h-3.5 w-3.5 ${job.isSaved ? "fill-current" : ""}`} />
                </button>
              </div>

              {/* Category & Status Pills */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-medium ${
                    job.status === "Open"
                      ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "border-red-300 bg-red-100 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
                  }`}
                >
                  {job.status}
                </span>
                <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
                  {job.difficulty}
                </span>
                <span className="rounded border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-gray-800 dark:text-zinc-300">
                  {job.category}
                </span>
              </div>

              {/* Price Range */}
              <div className="mb-1 flex items-center gap-1 text-base font-black text-yellow-500">
                <CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                <span>{job.priceRange}</span>
              </div>

              {/* Title & Description */}
              <h3
                className="mb-1 line-clamp-1 text-base font-bold text-gray-900 dark:text-white transition-colors group-hover:text-gray-900 dark:group-hover:text-white"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {job.title}
              </h3>
              <div className="mb-3">
                <JobRichText content={job.description} truncate={2} />
              </div>

              {/* Skill Badges */}
              {Array.isArray(job.skills) && job.skills.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <Wrench className="h-3 w-3 shrink-0 text-gray-400 dark:text-zinc-400" />
                  {job.skills.slice(0, 3).map((skill) => (
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
            <div className="mt-2 flex items-center justify-between border-t border-gray-200 dark:border-white/5 pt-3 text-[11px] font-medium text-gray-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 truncate">
                {job.clientAvatar ? (
                  <img src={job.clientAvatar} alt={job.postedBy} className="h-5 w-5 shrink-0 rounded-full border border-gray-300 dark:border-zinc-700 object-cover" />
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-zinc-800 text-[9px] font-bold text-gray-700 dark:text-white">
                    {job.postedBy.charAt(0)}
                  </div>
                )}
                <span className="truncate font-semibold text-gray-700 dark:text-zinc-300">{job.postedBy}</span>
              </div>

              <div className="ml-2 flex shrink-0 items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-400">
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