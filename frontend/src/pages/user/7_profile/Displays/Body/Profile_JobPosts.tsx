import React, { useEffect, useState } from "react";
import { FileText, Clock, DollarSign, Briefcase, Loader2, Wrench, Bookmark } from "lucide-react";
import { useJobs } from "../../../../../hooks/useJobs";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/ui/EmptyState";

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

interface ProfileJobPostsProps {
  userDetails?: any;
  accountId?: string;
}

export const Profile_JobPosts: React.FC<ProfileJobPostsProps> = ({ userDetails, accountId }) => {
  const { fetchJobs, toggleJobSave } = useJobs();
  const navigate = useNavigate();
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleToggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    try {
      const jobToUpdate = myJobs.find((j) => j.id === jobId);
      if (!jobToUpdate) return;
      
      const willBeSaved = !jobToUpdate.isSaved;
      await toggleJobSave(jobId);
      
      if (willBeSaved) toast.success("Job saved successfully!");
      else toast.success("Job removed from saved list");
      
      setMyJobs((prev) =>
        prev.map((job) => {
          if (job.id === jobId) {
            return {
              ...job,
              isSaved: willBeSaved,
              savesCount: willBeSaved ? job.savesCount + 1 : Math.max(0, job.savesCount - 1),
            };
          }
          return job;
        })
      );
    } catch (err) {
      toast.error("Failed to save job");
      console.error(err);
    }
  };

  useEffect(() => {
    const loadJobs = async () => {
      setIsLoading(true);
      try {
        const fetchedJobs = await fetchJobs();
        if (Array.isArray(fetchedJobs)) {
          const userJobs = fetchedJobs
            .filter((j: any) => j.client_account_id === accountId)
            .map((j: any) => ({
              id: j.job_id,
              title: j.title,
              description: j.description || "",
              status: j.status,
              category: j.category,
              difficulty: j.experience_level,
              priceRange: `${j.rate_credits_min?.toLocaleString() || 0} ~ ${j.rate_credits_max?.toLocaleString() || 0}`,
              timeAgo: getTimeAgo(new Date(j.created_at)),
              thumbnail: j.thumbnail_path
                ? `${import.meta.env.VITE_CLOUDFRONT_URL}${j.thumbnail_path.startsWith('/') ? '' : '/'}${j.thumbnail_path}`
                : "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80",
              skills: Array.isArray(j.tags) ? j.tags : [],
              isSaved: j.is_saved || false,
              savesCount: parseInt(j.saves_count) || 0,
            }))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          
          setMyJobs(userJobs);
        }
      } catch (error) {
        console.error("Failed to load user jobs", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (accountId) {
      loadJobs();
    } else {
      setIsLoading(false);
    }
  }, [fetchJobs, accountId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center space-y-3">
        <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
        <p className="text-[11px] text-gray-500 font-medium">Loading active job posts...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
        <h4 className="text-xs font-extrabold text-gray-900 dark:text-white tracking-wider uppercase flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          My Job Posts
        </h4>
        <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-medium">
          {myJobs.length} active posts
        </span>
      </div>
      
      {myJobs.length === 0 ? (
        <div className="py-12">
          <EmptyState
            icon={Briefcase}
            title="No Job Posts Yet"
            description="You haven't posted any jobs. Create your first job post to connect with talented editors!"
            actionLabel="Post a Job"
            onAction={() => navigate('/jobs/create')}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {myJobs.map((job) => (
            <div
              key={job.id}
              onClick={() => navigate(`/jobs/postings/${job.id}`)}
              className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-[#0b0e17]/50 p-4 transition-all hover:border-blue-500/30 hover:bg-white dark:hover:bg-[#0b0e17] hover:shadow-lg hover:shadow-blue-500/5"
            >
              <button
                onClick={(e) => handleToggleSave(e, job.id.toString())}
                className={`absolute top-4 right-4 z-10 p-2 rounded-lg backdrop-blur-sm transition-colors flex items-center justify-center ${
                  job.isSaved 
                    ? "bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30" 
                    : "bg-black/30 text-white/80 hover:bg-black/50 hover:text-white"
                }`}
                title="Save Job"
              >
                <Bookmark className={`h-4 w-4 ${job.isSaved ? "fill-current" : ""}`} />
              </button>
              
              <div className="flex-1">
                {/* Thumbnail Image */}
                <div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl border border-gray-100 dark:border-white/5 bg-gray-200 dark:bg-zinc-900">
                  <img
                    src={job.thumbnail}
                    alt={job.title}
                    className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 dark:from-black/60 via-transparent to-transparent" />
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
                  <DollarSign className="h-4 w-4 shrink-0 text-yellow-500" />
                  <span>{job.priceRange}</span>
                </div>

                {/* Title & Description */}
                <h3
                  className="mb-1 line-clamp-1 text-sm font-bold text-gray-900 dark:text-white transition-colors group-hover:text-blue-500 dark:group-hover:text-blue-400"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  {job.title}
                </h3>
                <div className="mb-3">
                  <p className="line-clamp-2 text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                {/* Skill Badges */}
                {Array.isArray(job.skills) && job.skills.length > 0 && (
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <Wrench className="h-3 w-3 shrink-0 text-gray-400 dark:text-zinc-400" />
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

              {/* Time Ago Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-500">
                  <Clock className="h-3 w-3" />
                  <span>Posted {job.timeAgo}</span>
                </div>
                <div className="text-[11px] font-bold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                  {job.savesCount} Saves
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};