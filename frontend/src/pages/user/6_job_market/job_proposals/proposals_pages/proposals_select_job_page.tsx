import React from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardList, ChevronRight, Clock, Briefcase, Plus } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { ProposalsMainContext } from "../proposals_main";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { CreditIcon } from "@/components/ui/credit-icon";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import { stripMarkdown } from "@/lib/markdownPaste";
import { getImageUrl } from "@/lib/utils";
import { getDefaultJobBannerForJob } from "@/lib/defaultJobBanners";

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
    <div className="h-36 w-full bg-gray-100 dark:bg-white/5" />
    <div className="p-5 space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-16 rounded bg-gray-100 dark:bg-white/10" />
          <div className="h-4 w-16 rounded bg-gray-100 dark:bg-white/5" />
        </div>
        <div className="h-5 w-3/4 rounded bg-gray-100 dark:bg-white/10" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-12 rounded-xl bg-gray-100 dark:bg-white/5" />
        <div className="h-12 rounded-xl bg-gray-100 dark:bg-white/5" />
      </div>
      <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
        <div className="h-3 w-28 rounded bg-gray-100 dark:bg-white/5" />
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-white/10" />
      </div>
    </div>
  </div>
);

export const ProposalsSelectJobPage: React.FC = () => {
  const navigate = useNavigate();
  const { searchQuery, viewType = "grid", loading = false } = useOutletContext<ProposalsMainContext>();

  const userInfo = useGlobalState((state) => state.user);
  const { fetchJobs } = useJobs();
  const [myJobPosts, setMyJobPosts] = React.useState<any[]>([]);
  const [isFetching, setIsFetching] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    const loadJobs = async () => {
      try {
        setIsFetching(true);
        const jobs = await fetchJobs();
        if (!isMounted) return;

        const userJobs = (jobs || [])
          .filter((j: any) =>
            Boolean(
              j.is_own_post ||
              j.is_manageable_post ||
              (userInfo?.account_id && j.client_account_id === userInfo.account_id)
            )
          )
          .map((j: any) => ({
            id: j.job_id,
            title: j.title,
            description: j.description || "",
            category: j.category,
            difficulty: j.experience_level,
            status: j.status,
            priceRange: !j.rate_credits_max
              ? `${j.rate_credits_min?.toLocaleString() || 0}+`
              : `${j.rate_credits_min?.toLocaleString() || 0} ~ ${j.rate_credits_max?.toLocaleString() || 0}`,
            applicantsCount: Number(j.applicant_count || 0),
            hiredCount: parseInt(j.hired_count) || 0,
            positionsNeeded: j.no_of_hires || 1,
            postedAt: new Date(j.created_at).toLocaleString(),
            timeAgo: getTimeAgo(new Date(j.created_at)),
            thumbnail: getImageUrl(j.thumbnail_path) || getDefaultJobBannerForJob(j.job_id)
          }));
        setMyJobPosts(userJobs);
      } catch (err) {
        console.error("Failed to load user jobs", err);
      } finally {
        if (isMounted) setIsFetching(false);
      }
    };

    loadJobs();
    return () => {
      isMounted = false;
    };
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
        <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 bg-white dark:bg-white/5 shadow-xs dark:shadow-none px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/5 self-start sm:self-auto">
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
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm">
              You haven't posted any jobs yet. Post a job to start receiving proposals from talented freelancers!
            </p>
            <button
              onClick={() => continueIfAccountVerified(() => navigate("/jobs/create"))}
              className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Post a Job
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-xs dark:shadow-none p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">No job postings found matching your search.</p>
          </div>
        )
      ) : viewType === "list" ? (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.15 }}
              onClick={() => navigate(`/jobs/proposals/incoming/${job.id}`)}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 sm:p-5 overflow-hidden shadow-xs hover:shadow-lg hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/10 overflow-hidden shrink-0">
                  <img
                    src={job.thumbnail}
                    alt={job.title}
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full border ${
                        job.status === "Open"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">
                      {job.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-50 dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">
                      {job.difficulty}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                      <CreditIcon className="h-3.5 w-3.5" /> {job.priceRange}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {job.timeAgo}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5">
                <div className="px-3.5 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {job.applicantsCount} {job.applicantsCount === 1 ? "Proposal" : "Proposals"}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                  <span>View</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => navigate(`/jobs/proposals/incoming/${job.id}`)}
              className="group rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-xs hover:shadow-xl hover:border-blue-500/40 dark:hover:border-blue-500/40 cursor-pointer transition-all duration-200 flex flex-col justify-between"
            >
              {/* Thumbnail Image Header */}
              <div className="relative h-44 w-full bg-gray-100 dark:bg-zinc-900 border-b border-gray-100 dark:border-white/5 overflow-hidden shrink-0">
                <img
                  src={job.thumbnail}
                  alt={job.title}
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg";
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/90 dark:bg-black/75 backdrop-blur-md border border-gray-200/80 dark:border-white/20 text-gray-900 dark:text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
                  <Briefcase className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{job.hiredCount} Hired</span>
                </div>
              </div>

              {/* Job Info Body */}
              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                    <span
                      className={`px-2.5 py-1 rounded-full border ${
                        job.status === "Open"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                          : "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">
                      {job.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-gray-50 dark:bg-dark-base border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300">
                      {job.difficulty}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 leading-snug">
                    {job.title}
                  </h3>

                  <p className="text-xs text-gray-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                    {stripMarkdown(job.description)}
                  </p>
                </div>

                {/* Financial & Applicants Stats */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div className="p-2.5 rounded-xl bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200/90 dark:border-amber-500/20">
                    <span className="text-[10px] font-bold text-amber-900/80 dark:text-amber-400/80 uppercase tracking-wider block truncate">
                      Budget
                    </span>
                    <span className="font-black text-amber-700 dark:text-amber-400 flex items-center gap-1 text-sm mt-0.5">
                      <CreditIcon className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" /> {job.priceRange}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                    <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block truncate">
                      Proposals
                    </span>
                    <span className="font-black text-gray-900 dark:text-white flex items-center gap-1 text-sm mt-0.5">
                      <ClipboardList className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-zinc-400" /> {job.applicantsCount}
                    </span>
                  </div>
                </div>

                {/* Action Link Footer */}
                <div className="pt-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span className="flex items-center gap-1.5 text-gray-500 dark:text-zinc-400 text-[11px] font-medium">
                    <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
                    <span className="truncate">Posted {job.timeAgo}</span>
                  </span>
                  <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2 font-semibold">
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
