import { getBudgetDisplayInfo } from "@/lib/formatBudget";
import React, { useState } from "react";
import { Calendar, Clock, Briefcase, Users, Star, Send, MousePointerClick, User, Edit2, Flag, Wrench, RefreshCw, FileText, Bookmark, CheckCircle2, XCircle, HelpCircle, Maximize2 } from "lucide-react";
import { JobRichText } from "./JobRichText";
import { useNavigate } from "react-router-dom";
import type { Job } from "./job_lists";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";

interface JobViewDetailsProps {
  selectedJob: Job | null;
  onClose: () => void;
  onReportJob?: (job: Job) => void;
  onToggleSave?: (jobId: string) => void;
}

const JobViewDetails: React.FC<JobViewDetailsProps> = ({ selectedJob, onClose, onReportJob, onToggleSave }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);

  const isTeam = Boolean(
    selectedJob?.is_team ||
    selectedJob?.isTeam ||
    selectedJob?.posted_as?.toLowerCase() === 'team' ||
    selectedJob?.team_id ||
    selectedJob?.teamId
  );
  const teamVisibility = String(selectedJob?.team_visibility || selectedJob?.teamVisibility || '').toLowerCase();
  const isPrivateTeam = isTeam && teamVisibility === 'private';
  const targetTeamId = selectedJob?.team_id || selectedJob?.teamId;
  const isTeamHiring = Boolean(
    selectedJob?.hiring_type === "team" ||
    selectedJob?.is_team ||
    selectedJob?.isTeam ||
    selectedJob?.posted_as === "Team"
  );

  const handleViewProfile = () => {
    if (!selectedJob) return;

    if (isTeam) {
      if (targetTeamId) {
        navigate(`/teams/${encodeURIComponent(targetTeamId)}`);
      }
      return;
    }

    if (selectedJob.isPersonalPost) {
      navigate("/profile");
    } else {
      navigate(`/profile/${selectedJob.client_account_id}`);
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
        className={`fixed right-0 top-0 bottom-0 w-full md:w-[500px] lg:w-[560px] bg-white dark:bg-dark-surface border-l border-gray-200 dark:border-white/10 z-[101] shadow-2xl flex flex-col transition-transform duration-300 ${
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
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-dark-surface via-transparent to-transparent" />
              
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  title="View Full Page"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/jobs/postings/${selectedJob.id}/page`);
                  }}
                  className="rounded-full p-2 bg-black/50 text-white/80 hover:text-white hover:bg-black/70 backdrop-blur-sm transition cursor-pointer"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                {onToggleSave && !isGuestMode && (
                  <button
                    title="Save Job Post"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(selectedJob.id);
                    }}
                    className={`rounded-full p-2 backdrop-blur-sm transition cursor-pointer ${
                      selectedJob.isSaved
                        ? "bg-black/50 text-yellow-500 hover:bg-black/70"
                        : "bg-black/50 text-gray-500 dark:text-zinc-400 hover:text-gray-900 hover:bg-black/70"
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${selectedJob.isSaved ? "fill-current" : ""}`} />
                  </button>
                )}
              </div>
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
                    {isTeamHiring ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" />
                        Team Project
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        Individual
                      </span>
                    )}
                  </div>

                  {!selectedJob.isOwnPost && !isGuestMode && (
                    <button
                      title="Report Job Post"
                      onClick={() => onReportJob && onReportJob(selectedJob)}
                      className="p-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-red-400 transition border border-gray-200 dark:border-white/10 flex items-center gap-1 text-xs"
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
              {/* Price, Timeline & Deadline */}
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none flex flex-wrap gap-4 items-center justify-between">
                <div>
{(() => {
                    const bDisplay = getBudgetDisplayInfo({
                      minBudget: selectedJob.minBudget,
                      maxBudget: selectedJob.maxBudget,
                      isTeam: isTeamHiring,
                      milestonesCount: selectedJob.milestones?.length || 0,
                      positionsNeeded: selectedJob.positionsNeeded,
                    });
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-500">
                            Budget Benchmark
                          </p>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${bDisplay.tagColorClass}`}>
                            {bDisplay.tagLabel}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <div className="text-lg font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1.5 leading-none">
                            <CreditIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                            <span>{bDisplay.amountText}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                            {bDisplay.subtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex gap-6 text-right">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-500 mb-0.5 flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" /> Timeline
                    </p>
                    <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                      {selectedJob.timeline}
                    </p>
                  </div>
                  {selectedJob.deadline && (
                    <div>
                      <p className="text-[9px] uppercase font-bold text-gray-500 dark:text-zinc-500 mb-0.5 flex items-center gap-1 justify-end">
                         Deadline
                      </p>
                      <p className="text-xs font-semibold text-gray-700 dark:text-zinc-200">
                        {selectedJob.deadline}
                      </p>
                    </div>
                  )}
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

              {/* Team Milestones Section */}
              {isTeamHiring && Array.isArray(selectedJob.milestones) && selectedJob.milestones.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-purple-500" />
                      Milestones & Roles Allocation ({selectedJob.milestones.length})
                    </h4>
                    <span className="text-[11px] font-semibold text-gray-600 dark:text-zinc-400">
                      {selectedJob.positionsNeeded || selectedJob.milestones.reduce((acc: number, m: any) => acc + (Number(m.slots_count) || 1), 0)} Total Openings
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedJob.milestones.map((m: any, idx: number) => {
                      const taskList: string[] = Array.isArray(m.tasks)
                        ? m.tasks
                        : typeof m.tasks === "string"
                        ? (() => {
                            try {
                              const parsed = JSON.parse(m.tasks);
                              return Array.isArray(parsed) ? parsed : [m.tasks];
                            } catch {
                              return [m.tasks];
                            }
                          })()
                        : [];

                      const slots = Math.max(1, Number(m.slots_count) || 1);
                      const hiredCount = Number(m.hired_count) || 0;
                      const credits = Number(m.budget_credits) || 0;
                      const percentage = Number(m.budget_percentage) || 0;

                      return (
                        <div
                          key={m.job_milestone_id || idx}
                          className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] space-y-2.5 transition hover:border-gray-300 dark:hover:border-white/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                                  Milestone #{idx + 1}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                                  <Users className="w-3 h-3 text-gray-500 dark:text-zinc-400" />
                                  {slots} {slots === 1 ? "Slot" : "Slots"}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 flex items-center gap-1">
                                  <Send className="w-2.5 h-2.5 text-blue-500 dark:text-blue-400" />
                                  {Number(m.applicant_count || 0)} {Number(m.applicant_count || 0) === 1 ? "Proposal" : "Proposals"}
                                </span>
                                {hiredCount > 0 && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                    {hiredCount} / {slots} Hired
                                  </span>
                                )}
                              </div>
                              <h5 className="text-sm font-bold text-gray-900 dark:text-white pt-0.5">
                                {m.title}
                              </h5>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1 justify-end font-bold text-amber-500 dark:text-amber-400 text-sm">
                                <CreditIcon className="w-3.5 h-3.5 shrink-0" />
                                <span>{credits.toLocaleString()} Credits</span>
                              </div>
                              <span className="text-[10px] font-medium text-gray-500 dark:text-zinc-500">
                                {percentage}% share
                              </span>
                            </div>
                          </div>

                          {m.description && (
                            <p className="text-xs text-gray-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
                              {m.description}
                            </p>
                          )}

                          {taskList.length > 0 && (
                            <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                                Deliverables & Tasks ({taskList.length})
                              </p>
                              <div className="space-y-1.5 pl-0.5">
                                {taskList.map((task, tIdx) => (
                                  <div key={tIdx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-zinc-300">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                    <span className="leading-tight">{task}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
              {/* Workflow & Terms Section */}
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                  Workflow & Terms
                </h4>
                <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-4">
                  {/* Client initiates the project? */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {selectedJob.initiatorRole === "Client" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Client initiates the project?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        {selectedJob.initiatorRole === "Client" ? "Yes, the client will create the project upon hiring." : "No, the freelancer is expected to create the project."}
                      </p>
                    </div>
                  </div>

                  {/* Client linked an existing project */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {selectedJob.isExistingProject ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Client linked an existing project?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        {selectedJob.isExistingProject ? "Yes, a project is already prepared for this job." : "No, a project has not been linked yet."}
                      </p>
                    </div>
                  </div>

                  {/* Confidentiality / NDA */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {selectedJob.requireNDA ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Require Confidentiality (NDA)?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        {selectedJob.requireNDA ? "Yes, freelancers cannot share details about this project during development." : "No, a strict confidentiality agreement is not required."}
                      </p>
                    </div>
                  </div>

                  {/* Portfolio Use */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0 text-gray-400 dark:text-zinc-500">
                      {selectedJob.portfolioUseAllowed ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Allow Portfolio Use?</p>
                      <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        {selectedJob.portfolioUseAllowed ? `Yes, allowed to use output for portfolio (Up to ${selectedJob.portfolioDuration} secs).` : "No, not allowed to use final output for personal portfolio."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shrink-0 space-y-3">
              {/* Client Profile Card (Moved into Footer) */}
              <div className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
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

                {!isPrivateTeam && (
                  <button
                    onClick={handleViewProfile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                  >
                    <User className="h-3.5 w-3.5 text-blue-400" />
                    <span>{isTeam ? "View Team Profile" : "View Profile"}</span>
                  </button>
                )}
              </div>

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

              {selectedJob.isOwnPost && !selectedJob.isManageablePost ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/jobs/postings/${selectedJob.id}/page`)}
                    className="flex items-center justify-center px-4 py-3 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                  >
                    View Full
                  </button>
                  <div className="flex-1 rounded-xl border border-blue-500/20 bg-blue-500/10 py-3 text-center text-xs font-bold text-blue-400">
                    This job was posted by a Team you belong to
                  </div>
                </div>
              ) : !selectedJob.isOwnPost ? (
                selectedJob.hasProposed ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/jobs/postings/${selectedJob.id}/page`)}
                        className="flex items-center justify-center px-4 py-3 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                      >
                        View Full
                      </button>
                      <button
                        onClick={() => navigate(`/jobs/proposals/sent/${selectedJob.myProposalId}`)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition active:scale-[0.98]"
                      >
                        <FileText className="h-3.5 w-3.5" /> View your Proposal
                      </button>
                    </div>
                    {isTeamHiring && (
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400 text-center block">
                        You have applied for a milestone role on this team project (1 role limit per contributor).
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      data-tour="job-detail-view-full"
                      onClick={() => navigate(`/jobs/postings/${selectedJob.id}/page`)}
                      className="flex items-center justify-center px-4 py-3 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                    >
                      View Full
                    </button>
                    <button
                      data-tour="job-detail-send-proposal"
                      onClick={() => {
                        if (isGuestMode) return setIsModalOpen(true);
                        if (isVerified) navigate(`/jobs/${selectedJob.id}/make-proposal`);
                      }}
                      disabled={!isGuestMode && !isVerified}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition shadow-lg ${
                        (!isGuestMode && !isVerified)
                          ? 'bg-blue-500/20 text-white/50 cursor-not-allowed shadow-none' 
                          : 'bg-blue-500 text-white hover:bg-blue-600 shadow-blue-500/20 active:scale-[0.98]'
                      }`}
                    >
                      <Send className="h-3.5 w-3.5" /> 
                      {isGuestMode ? "Login to Apply" : (!isVerified ? "Verify First" : "Send Proposal")}
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/jobs/postings/${selectedJob.id}/page`)}
                    className="flex items-center justify-center px-4 py-3 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                  >
                    View Full
                  </button>
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
      <GuestLoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

    </>
  );
};

export default JobViewDetails;
