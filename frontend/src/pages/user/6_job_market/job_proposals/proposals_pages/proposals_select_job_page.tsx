import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, ChevronRight, Calendar, Clock, Briefcase, Users, Plus } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { ProposalsMainContext } from "../proposals_main";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { CreditIcon } from "@/components/ui/credit-icon";
import { continueIfAccountVerified } from "@/lib/accountVerification";

const getTimeAgo = (date: Date): string => {
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
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return Math.floor(seconds) + " seconds ago";
};

export const SelectJobCardSkeleton: React.FC = () => (
  <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden animate-pulse space-y-4 flex flex-col justify-between">
    {/* Skeleton Thumbnail */}
    <div className="h-36 w-full bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />

    <div className="p-5 space-y-4">
      {/* Category Pills & Title */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded bg-gray-100 dark:bg-white/10" />
          <div className="h-4 w-16 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        </div>
        <div className="h-5 w-3/4 rounded bg-gray-100 dark:bg-white/10" />
      </div>

      {/* Budget & Applicants Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-12 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-white dark:bg-white/5 shadow-sm dark:shadow-none" />
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/10" />
      </div>
    </div>
  </div>
);

export const ProposalsSelectJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery, loading = false } = useOutletContext<ProposalsMainContext>();

  const userInfo = useGlobalState((state) => state.user);
  const { fetchJobs } = useJobs();
  const [myJobPosts, setMyJobPosts] = React.useState<any[]>([]);
  const [isFetching, setIsFetching] = React.useState(true);

  React.useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobs = await fetchJobs();
        const userJobs = jobs
          .filter((j: any) => j.client_account_id === userInfo?.account_id)
          .map((j: any) => ({
            id: j.job_id,
            title: j.title,
            description: j.description || "",
            category: j.category,
            difficulty: j.experience_level,
            status: j.status,
            priceRange: `${j.rate_credits_min?.toLocaleString() || 0} ~ ${j.rate_credits_max?.toLocaleString() || 0}`,
            applicantsCount: Number(j.applicant_count || 0),
            hiredCount: parseInt(j.hired_count) || 0,
            positionsNeeded: j.no_of_hires || 1,
            postedAt: new Date(j.created_at).toLocaleString(),
            timeAgo: getTimeAgo(new Date(j.created_at)),
            thumbnail: j.thumbnail_path 
              ? `${import.meta.env.VITE_CLOUDFRONT_URL}/${j.thumbnail_path}` 
              : "/placeholder.svg"
          }));
        setMyJobPosts(userJobs);
      } catch (err) {
        console.error("Failed to load user jobs", err);
      } finally {
        setIsFetching(false);
      }
    };
    if (userInfo?.account_id) {
      loadJobs();
    }
  }, [fetchJobs, userInfo?.account_id]);

  const filteredJobs = myJobPosts.filter(
    (j) =>
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 text-left w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-white/5 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Select a Job Listing</h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            Choose one of your published job posts to view its incoming proposal submissions.
          </p>
        </div>
        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 self-start sm:self-auto">
          {isFetching || loading ? "Loading..." : `${filteredJobs.length} Active Listings`}
        </span>
      </div>

      {isFetching || loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <SelectJobCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        myJobPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
            <div className="w-24 h-24 flex items-center justify-center mb-2 opacity-80 pointer-events-none">
              <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Job Postings Found</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">You haven't posted any jobs yet. Post a job to start receiving proposals from talented freelancers!</p>
            <button
              onClick={() => continueIfAccountVerified(() => navigate('/jobs/create'))}
              className="mt-4 px-6 py-2.5 rounded-xl bg-blue-500 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Post a Job
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm dark:shadow-none p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">No job postings found matching your search.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(`/jobs/proposals/incoming/${job.id}`)}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden backdrop-blur-sm shadow-xl hover:shadow-2xl hover:border-blue-500/30 dark:hover:border-blue-500/30 cursor-pointer transition-all flex flex-col justify-between"
            >
              {/* Thumbnail Image Header */}
              <div className="relative h-44 w-full bg-zinc-950 overflow-hidden shrink-0">
                <img
                  src={job.thumbnail}
                  alt={job.title}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                />
              </div>

              {/* Job Info Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span className={`px-2.5 py-1 rounded-full border ${
                      job.status === "Open"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                    }`}>
                      {job.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white dark:bg-dark-base shadow-sm border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">{job.category}</span>
                    <span className="px-2.5 py-1 rounded-full bg-white dark:bg-dark-base shadow-sm border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">{job.difficulty}</span>
                    <span className="px-2.5 py-1 rounded-full bg-white dark:bg-dark-base shadow-sm border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">{job.positionsNeeded} Positions Needed</span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors line-clamp-1 leading-snug drop-shadow-sm">
                    {job.title}
                  </h3>
                  
                  <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {job.description}
                  </p>
                </div>

                {/* Financial & Applicants Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent border border-amber-500/10 dark:border-amber-500/20">
                    <span className="text-[9px] font-bold text-amber-700/70 dark:text-amber-500/70 uppercase tracking-wider block truncate">Budget</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1 text-sm mt-0.5">
                      <CreditIcon className="h-3.5 w-3.5 shrink-0" /> {job.priceRange}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent border border-blue-500/10 dark:border-blue-500/20">
                    <span className="text-[9px] font-bold text-blue-700/70 dark:text-blue-500/70 uppercase tracking-wider block truncate">Proposals</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1 text-sm mt-0.5">
                      <ClipboardList className="h-3.5 w-3.5 shrink-0" /> {job.applicantsCount}
                    </span>
                  </div>
                  
                  <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent border border-emerald-500/10 dark:border-emerald-500/20">
                    <span className="text-[9px] font-bold text-emerald-700/70 dark:text-emerald-500/70 uppercase tracking-wider block truncate">Hired</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-sm mt-0.5">
                      <Briefcase className="h-3.5 w-3.5 shrink-0" /> {job.hiredCount}
                    </span>
                  </div>
                </div>

                {/* Action Link Footer */}
                <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-blue-500 dark:text-blue-400">
                  <span className="flex items-center gap-1 text-gray-500 dark:text-zinc-500 text-[10px] font-medium">
                    <Clock className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500 shrink-0" /> 
                    <span className="truncate">Posted {job.postedAt} ({job.timeAgo})</span>
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0 ml-2">
                    View Applicants <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProposalsSelectJobPage;