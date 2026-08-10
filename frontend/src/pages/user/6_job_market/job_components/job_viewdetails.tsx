import React from "react";
import { Calendar, Clock, Briefcase, Users, Star, Send, MousePointerClick, User, Edit2, Flag, Wrench, RefreshCw, FileText, Bookmark } from "lucide-react";
import { JobRichText } from "./JobRichText";
import { useNavigate } from "react-router-dom";
import type { Job } from "./job_lists";
import { CreditIcon } from "@/components/ui/credit-icon";

interface JobViewDetailsProps {
  selectedJob: Job | null;
  onClose: () => void;
  onReportJob?: (job: Job) => void;
  onToggleSave?: (jobId: string) => void;
}

const JobViewDetails: React.FC<JobViewDetailsProps> = ({ selectedJob, onClose, onReportJob, onToggleSave }) => {
  const navigate = useNavigate();

  const handleViewProfile = () => {
    if (!selectedJob) return;

    if (selectedJob.isOwnPost) {
      navigate("/profile");
    } else {
      navigate(`/profile/${encodeURIComponent(selectedJob.postedBy)}`);
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] transition-opacity flex items-center justify-start pl-8 ${
          selectedJob ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      >
        {selectedJob && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 text-xs font-medium animate-pulse backdrop-blur-md">
            <MousePointerClick className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
            <span>Click anywhere outside to close</span>
          </div>
        )}
      </div>

      <div
        className={`fixed right-0 top-0 bottom-0 w-full md:w-[500px] lg:w-[560px] bg-white dark:bg-[#0d0f1a] border-l border-gray-200 dark:border-white/10 z-[101] shadow-2xl flex flex-col transition-transform duration-300 ${
          selectedJob ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {selectedJob && (
          <>
            <div className="relative h-48 shrink-0 bg-zinc-950 border-b border-gray-100 dark:border-white/5">
              <img
                src={selectedJob.thumbnail}
                alt=""
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0d0f1a] via-transparent to-transparent" />
              
              {onToggleSave && (
                <button
                  title="Save Job Post"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(selectedJob.id);
                  }}
                  className={`absolute top-4 right-4 rounded-full p-2 backdrop-blur-sm transition z-10 ${
                    selectedJob.isSaved
                      ? "bg-black/50 text-yellow-500 hover:bg-black/70"
                      : "bg-black/50 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white hover:bg-black/70"
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${selectedJob.isSaved ? "fill-current" : ""}`} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 thin-scrollbar">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        selectedJob.status === "Open"
                          ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : "bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20"
                      }`}
                    >
                      {selectedJob.status}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300">
                      {selectedJob.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300">
                      {selectedJob.category}
                    </span>
                  </div>

                  {!selectedJob.isOwnPost && (
                    <button
                      title="Report Job Post"
                      onClick={() => onReportJob && onReportJob(selectedJob)}
                      className="p-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-red-400 transition border border-gray-200 dark:border-white/10 flex items-center gap-1 text-xs"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium">Report</span>
                    </button>
                  )}
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-snug mb-1">
                  {selectedJob.title}
                </h2>

                {/* Post Date & Updated Timestamp Row */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-zinc-500 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-gray-500 dark:text-zinc-500" />
                    <span>Posted {selectedJob.postedAt}</span>
                  </div>

                  {selectedJob.updatedAt && (
                    <div className="flex items-center gap-1 text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 text-[10px] font-medium">
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>{selectedJob.updatedAt}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Price & Budget Row */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-500 mb-0.5">
                    Budget Range
                  </p>
                  <p className="text-lg font-extrabold text-yellow-500 flex items-center gap-1.5">
                    <CreditIcon className="h-5 w-5 text-yellow-500 shrink-0" />
                    <span>{selectedJob.priceRange}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-500 mb-0.5 flex items-center gap-1 justify-end">
                    <Clock className="h-3 w-3" /> Timeline
                  </p>
                  <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                    {selectedJob.timeline}
                  </p>
                </div>
              </div>

              {/* Scope of Work */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400">
                  Scope of Work & Requirements
                </h4>
                <div className="bg-white/[0.01] border border-gray-100 dark:border-white/5 p-3.5 rounded-xl">
                  <JobRichText content={selectedJob.description} />
                </div>
              </div>

              {/* Required Skills Section */}
              {selectedJob.skills && selectedJob.skills.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                    <Wrench className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                    Required Skills & Qualifications
                  </h4>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-white/[0.01]">
                    {selectedJob.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Profile Card */}
              <div className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedJob.clientAvatar ? (
                    <img src={selectedJob.clientAvatar} alt="" className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-white/10 shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-zinc-800 flex items-center justify-center text-xs text-gray-700 dark:text-white font-bold border border-gray-200 dark:border-white/10 shrink-0">
                      {selectedJob.postedBy.charAt(0)}
                    </div>
                  )}
                  <div className="text-left min-w-0">
                    <p className="text-[9px] uppercase text-gray-500 dark:text-zinc-500 font-bold tracking-wider">
                      Project Client
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight truncate">
                        {selectedJob.postedBy}
                      </p>
                      <div className="flex items-center gap-1 rounded-md bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-white/5 shrink-0">
                        <Star className="h-2.5 w-2.5 text-yellow-500 fill-yellow-500" />
                        <span>{selectedJob.clientRating} ({selectedJob.ratingCount})</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleViewProfile}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                >
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  <span>View Profile</span>
                </button>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#0d0f1a] shrink-0 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 dark:text-zinc-400 px-1">
                <span className="flex items-center gap-1 text-gray-600 dark:text-zinc-300">
                  <Briefcase className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500" />
                  <strong className="text-gray-900 dark:text-white">{selectedJob.hiredCount} / {selectedJob.positionsNeeded}</strong> Positions
                </span>
                <span className="flex items-center gap-1 text-gray-600 dark:text-zinc-300">
                  <Bookmark className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500" />
                  <strong className="text-gray-900 dark:text-white">{selectedJob.savesCount}</strong> Saves
                </span>
                <span className="flex items-center gap-1 text-gray-600 dark:text-zinc-300">
                  <Users className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500" />
                  <strong className="text-gray-900 dark:text-white">{selectedJob.applicantsCount}</strong> Proposals
                </span>
              </div>

              {!selectedJob.isOwnPost ? (
                selectedJob.hasProposed ? (
                  <button
                    onClick={() => navigate(`/jobs/proposals/sent/${selectedJob.myProposalId}`)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 py-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition active:scale-[0.98]"
                  >
                    <FileText className="h-3.5 w-3.5" /> View your Proposal
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(`/jobs/${selectedJob.id}/make-proposal`)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-500 py-3 text-xs font-bold text-white hover:bg-blue-600 transition shadow-lg shadow-blue-500/20 active:scale-[0.98]"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Proposal
                  </button>
                )
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/jobs/edit/${selectedJob.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 py-3 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit Job Post
                  </button>
                  <button
                    onClick={() => navigate(`/jobs/proposals/incoming/${selectedJob.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 py-3 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 transition"
                  >
                    <Users className="h-3.5 w-3.5 text-blue-400" /> Manage Applicants
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .thin-scrollbar::-webkit-scrollbar { width: 5px; }
        .thin-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 9999px; }
        .thin-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
        .thin-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </>
  );
};

export default JobViewDetails;