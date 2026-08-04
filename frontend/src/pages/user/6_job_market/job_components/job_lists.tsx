import React from "react";
import { Star, Clock, Bookmark, CircleDollarSign, Edit2, Flag, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { ViewType } from "./job_list_viewtype";

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
  clientAvatar?: string;
  postedAt: string;
  updatedAt?: string;
  timeAgo: string;
  clientRating: number;
  ratingCount: number;
  positionsNeeded: number;
  hiredCount: number;
  applicantsCount: number;
  savesCount: number;
  timeline: string;
  thumbnail: string;
  skills?: string[];
  isSaved?: boolean;
  isOwnPost?: boolean;
  hasProposed?: boolean;
  myProposalId?: string | null;
}

interface JobListProps {
  jobs: Job[];
  loading?: boolean;
  activeJobId?: string;
  viewType?: ViewType;
  onToggleSave: (e: React.MouseEvent, jobId: string) => void;
  onReportJob?: (job: Job) => void;
  baseRoute: string;
}

export const JobCardSkeleton: React.FC<{ viewType?: ViewType }> = ({ viewType = "list" }) => {
  if (viewType === "grid") {
    return (
      <div className="flex flex-col rounded-2xl border border-white/10 bg-[#0d0f1a]/40 p-5 animate-pulse space-y-4">
        <div className="h-44 w-full rounded-xl bg-white/5" />
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-12 rounded bg-white/10" />
            <div className="h-4 w-16 rounded bg-white/5" />
          </div>
          <div className="h-5 w-3/4 rounded bg-white/10" />
          <div className="h-4 w-1/2 rounded bg-white/5" />
        </div>
        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="h-4 w-20 rounded bg-white/5" />
          <div className="h-4 w-16 rounded bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 rounded-2xl border border-white/10 bg-[#0d0f1a]/40 p-5 animate-pulse">
      <div className="hidden md:block h-40 w-full md:w-60 shrink-0 rounded-xl bg-white/5" />
      <div className="flex-1 flex flex-col justify-between py-1">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="h-4 w-12 rounded bg-white/10" />
            <div className="h-4 w-16 rounded bg-white/10" />
            <div className="h-4 w-14 rounded bg-white/5" />
          </div>
          <div className="h-5 w-28 rounded bg-white/10" />
          <div className="h-6 w-3/4 rounded bg-white/10" />
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded bg-white/5" />
            <div className="h-4 w-5/6 rounded bg-white/5" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-white/10" />
            <div className="h-4 w-24 rounded bg-white/5" />
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-28 rounded bg-white/5" />
            <div className="h-5 w-20 rounded bg-white/5" />
            <div className="h-5 w-20 rounded bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
};

const JobList: React.FC<JobListProps> = ({
  jobs,
  loading,
  activeJobId,
  viewType = "list",
  onToggleSave,
  onReportJob,
  baseRoute,
}) => {
  const navigate = useNavigate();

  const handleEditClick = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    navigate(`/jobs/edit/${jobId}`);
  };

  const handleReportClick = (e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    if (onReportJob) onReportJob(job);
  };

  if (loading) {
    return (
      <div
        className={
          viewType === "grid"
            ? "grid grid-cols-2 xl:grid-cols-3 gap-4"
            : "space-y-4"
        }
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <JobCardSkeleton key={i} viewType={viewType} />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="p-12 text-center rounded-2xl border border-white/10 bg-[#0d0f1a]/40 text-zinc-500"
      >
        No job postings found matching your parameters.
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={
        viewType === "grid"
          ? "grid grid-cols-2 xl:grid-cols-3 gap-4"
          : "space-y-4"
      }
    >
      <AnimatePresence mode="popLayout">
        {jobs.map((job) => {
          const isActive = activeJobId === job.id;

          /* --- GRID VIEW CARD (NO SKILLS DISPLAY) --- */
          if (viewType === "grid") {
            return (
              <motion.div
                key={job.id}
                layout="position"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
                onClick={() => navigate(`${baseRoute}/${job.id}`)}
                className={`group flex flex-col justify-between rounded-2xl border p-4 transition-colors duration-200 cursor-pointer ${
                  isActive
                    ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                    : "border-white/10 bg-[#0d0f1a]/40 hover:border-white/20"
                }`}
              >
                <div>
                  <div className="h-40 w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/5 relative mb-3">
                    <img
                      src={job.thumbnail}
                      alt=""
                      className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                    <div className="absolute top-2 right-2 flex items-center gap-1.5">
                      {!job.isOwnPost && (
                        <button
                          title="Report Post"
                          onClick={(e) => handleReportClick(e, job)}
                          className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <Flag className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {job.isOwnPost && (
                        <button
                          title="Edit Post"
                          onClick={(e) => handleEditClick(e, job.id)}
                          className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-zinc-300 hover:text-white transition-colors"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => onToggleSave(e, job.id)}
                        className={`p-1.5 rounded-full bg-black/50 backdrop-blur-sm transition-colors flex items-center gap-1 ${
                          job.isSaved ? "text-yellow-500" : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        <Bookmark className={`h-4 w-4 ${job.isSaved ? "fill-current" : ""}`} />
                        <span className="text-[10px] font-bold">{job.savesCount}</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Pill Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        job.status?.toLowerCase() === "open"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {job.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 border border-white/10 text-zinc-300">
                      {job.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 border border-white/10 text-zinc-300">
                      {job.category}
                    </span>
                  </div>

                  {/* Price & Title */}
                  <div className="text-yellow-500 text-base font-black mb-1 flex items-center gap-1">
                    <CircleDollarSign className="h-4 w-4 text-yellow-500 shrink-0" />
                    <span>{job.priceRange}</span>
                  </div>
                  <h3 className="text-white text-base font-bold mb-1 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {job.title}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed mb-3">
                    {job.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                  <div className="flex items-center gap-1.5 truncate">
                    {job.clientAvatar ? (
                      <img src={job.clientAvatar} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="h-5 w-5 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] text-white font-bold border border-white/10">
                        {job.postedBy.charAt(0)}
                      </div>
                    )}
                    <span className="truncate text-zinc-300 font-semibold">{job.postedBy}</span>
                  </div>

                  <div className="flex items-center gap-1 text-zinc-400 text-[10px] shrink-0 ml-2">
                    <Clock className="h-3 w-3 text-zinc-500" />
                    <span>{job.timeAgo}</span>
                  </div>
                </div>
              </motion.div>
            );
          }

          /* --- LIST VIEW CARD (CLEAN SKILL TAGS) --- */
          return (
            <motion.div
              key={job.id}
              layout="position"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
              onClick={() => navigate(`${baseRoute}/${job.id}`)}
              className={`group flex flex-col md:flex-row gap-5 rounded-2xl border p-5 transition-colors duration-200 cursor-pointer ${
                isActive
                  ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                  : "border-white/10 bg-[#0d0f1a]/40 hover:border-white/20"
              }`}
            >
              <div className="hidden md:block relative h-auto min-h-[160px] w-full md:w-56 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/5">
                <img
                  src={job.thumbnail}
                  alt=""
                  className="h-full w-full object-cover opacity-80 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          job.status?.toLowerCase() === "open"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {job.status}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 border border-white/10 text-zinc-300">
                        {job.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 border border-white/10 text-zinc-300">
                        {job.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!job.isOwnPost && (
                        <button
                          title="Report Post"
                          onClick={(e) => handleReportClick(e, job)}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-red-400 transition-colors border border-white/10"
                        >
                          <Flag className="h-4 w-4" />
                        </button>
                      )}
                      {job.isOwnPost && (
                        <button
                          title="Edit Post"
                          onClick={(e) => handleEditClick(e, job.id)}
                          className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors border border-white/10"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => onToggleSave(e, job.id)}
                        className={`transition-colors flex items-center gap-1 ${job.isSaved ? "text-yellow-500" : "text-zinc-600 hover:text-white"}`}
                      >
                        <Bookmark className={`h-5 w-5 ${job.isSaved ? "fill-current" : ""}`} />
                        <span className="text-xs font-bold">{job.savesCount}</span>
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-yellow-500 text-lg font-black mb-1 flex items-center gap-1.5">
                    <CircleDollarSign className="h-5 w-5 text-yellow-500 shrink-0" />
                    <span>{job.priceRange}</span>
                  </div>
                  <h3 className="text-white text-xl font-bold mb-1.5 group-hover:text-blue-400 transition-colors">{job.title}</h3>
                  <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-3">{job.description}</p>

                  {/* Clean Gray Skill Tags without Outer Box or 'Skills:' label */}
                  {Array.isArray(job.skills) && job.skills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <Wrench className="h-3 w-3 text-zinc-400 shrink-0 mr-0.5" />
                      {job.skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-white/10 text-zinc-300 text-[10px] font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills.length > 4 && (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-medium">
                          +{job.skills.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500 font-medium mb-1">{job.timeAgo}</p>
                </div>

                <div className="mt-2 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between text-[10px] text-zinc-400 gap-3">
                  <div className="flex items-center gap-2">
                    {job.clientAvatar ? (
                      <img src={job.clientAvatar} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover border border-white/10" />
                    ) : (
                      <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-white font-bold border border-white/10 overflow-hidden">
                        {job.postedBy.charAt(0)}
                      </div>
                    )}
                    <div className="text-left leading-tight">
                      <p className="text-xs font-bold text-zinc-300">{job.postedBy}</p>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                        <span>{job.clientRating} ({job.ratingCount})</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-400">
                    <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                      {job.hiredCount}/{job.positionsNeeded} filled
                    </span>
                    <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                      {job.applicantsCount} applicants
                    </span>
                    <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5">
                      {job.savesCount} saves
                    </span>
                    <span className="bg-white/5 px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" /> {job.timeline}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};

export default JobList;