import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle2,
  ShoppingCart,
  UserCheck,
  Layers,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Star,
  MessageSquare,
  ArrowLeftRight,
  Filter,
  Check,
  Clock,
  Lock,
  Percent,
  RefreshCcw,
} from "lucide-react";
import { CreditIcon } from "@/components/ui/credit-icon";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import useChatState from "@/components/ui/chat_bubble/chat_state";

interface TeamMilestoneRosterViewProps {
  job: any;
  proposals: any[];
  onUpdateStatus: (id: string, newStatus: any, reason?: string) => void;
}

export const TeamMilestoneRosterView: React.FC<TeamMilestoneRosterViewProps> = ({
  job,
  proposals,
  onUpdateStatus,
}) => {
  const navigate = useNavigate();

  // Selected candidate ID per slot key: `${milestoneId}-slot-${slotIndex}` -> proposalId
  const [slottedProposals, setSlottedProposals] = useState<{ [slotKey: string]: string }>({});
  // Per-milestone filter state: `${milestoneId}` -> "all" | "pending" | "shortlisted" | "accepted"
  const [filterByMilestone, setFilterByMilestone] = useState<{ [milestoneId: string]: string }>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const milestones = job?.milestones || [];

  // Synchronize already Hired/Accepted proposals into slotted slots on mount or proposal changes
  // Only officially hired proposals (where other side accepted the contract) are slotted
  useEffect(() => {
    const hiredProposals = proposals.filter((p) => p.status === "Hired" || p.status === "Accepted");
    setSlottedProposals((prev) => {
      const next: { [slotKey: string]: string } = {};
      let changed = false;

      // Keep existing valid slots if the candidate is still hired
      Object.entries(prev).forEach(([key, propId]) => {
        if (hiredProposals.some((p) => p.id === propId)) {
          next[key] = propId;
        } else {
          changed = true;
        }
      });

      // Map any newly hired proposals into available slots for their target milestone
      hiredProposals.forEach((p) => {
        if (!Object.values(next).includes(p.id)) {
          const targetM = milestones.find(
            (m: any) => m.job_milestone_id === p.job_milestone_id || m.title === p.target_milestone_title
          );
          if (targetM) {
            const count = Math.max(1, targetM.slots_count || 1);
            for (let i = 0; i < count; i++) {
              const key = `${targetM.job_milestone_id}-slot-${i}`;
              if (!next[key]) {
                next[key] = p.id;
                changed = true;
                break;
              }
            }
          }
        }
      });

      return changed ? next : prev;
    });
  }, [proposals, milestones]);

  // Phase 1: Shortlist / Un-shortlist candidate
  const handleShortlistToggle = async (p: any) => {
    if (p.status === "Hired" || p.status === "Accepted") {
      toast.error("This candidate has already accepted their contract and is slotted.");
      return;
    }
    setProcessingId(p.id);
    const targetStatus = p.status === "Shortlisted" ? "Pending" : "Shortlisted";
    try {
      await onUpdateStatus(p.id, targetStatus);
      if (targetStatus === "Shortlisted") {
        toast.success(`${p.partyName || "Candidate"} added to Shortlist pool! You can now interview and slot them.`);
      } else {
        toast.success(`${p.partyName || "Candidate"} returned to Pending pool.`);
      }
    } catch (err: any) {
      toast.error("Failed to update candidate status.");
    } finally {
      setProcessingId(null);
    }
  };

  // Phase 2: Slot & Accept navigates to the proposal details review page to confirm and send offer
  const handleSlotCandidate = (slotKey: string, p: any) => {
    navigate(`/jobs/proposals/received/${p.id}`);
  };

  // Vacate slot -> reverts candidate status back to Shortlisted if applicable
  const handleVacateSlot = async (slotKey: string, proposalId: string) => {
    setProcessingId(proposalId);
    try {
      await onUpdateStatus(proposalId, "Shortlisted");
      setSlottedProposals((prev) => {
        const next = { ...prev };
        delete next[slotKey];
        return next;
      });
      toast.success("Candidate vacated from slot and returned to Shortlist pool.");
    } catch (err: any) {
      toast.error("Failed to vacate slot.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenChat = (p: any) => {
    if (!p.freelancerAccountId && !p.partyAccountId) {
      navigate(`/jobs/proposals/received/${p.id}`);
      return;
    }
    const accId = p.freelancerAccountId || p.partyAccountId;
    void useChatState.getState().openFloatingConversation({
      id: p.id,
      inbox_id: p.id,
      account_id: String(accId),
      name: p.partyName || "Applicant",
      avatarUrl: p.partyAvatar,
      conversationType: "marketplace_job",
      listingType: "job",
      listingTitle: job?.title || "Job Proposal",
    });
  };

  // Calculate selected total
  // Calculate slotted total (only officially hired proposals where contract was accepted)
  const selectedProposalIds = Object.values(slottedProposals);
  const selectedProposalsList = proposals.filter((p) => selectedProposalIds.includes(p.id) || p.status === "Hired" || p.status === "Accepted");
  const totalCartCost = selectedProposalsList.reduce((sum, p) => sum + (Number(p.bidAmount) || 0), 0);
  const totalJobSlots = milestones.reduce((sum: number, m: any) => sum + Math.max(1, m.slots_count || 1), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl border border-purple-500/20 bg-purple-500/[0.03] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Sparkles className="h-3 w-3" />
              Team Selection Funnel
            </span>
            <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
              {totalJobSlots} Open Roles across {milestones.length} Milestones
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Pending &rarr; Shortlisted &rarr; Hired (Slotted)
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            <strong>1. Pending:</strong> Review &amp; Shortlist applicants. &nbsp;&bull;&nbsp;{" "}
            <strong>2. Shortlisted:</strong> Interview candidates &amp; click Slot &amp; Accept to form contract. &nbsp;&bull;&nbsp;{" "}
            <strong>3. Slotted:</strong> Candidate is officially slotted once they accept the contract.
          </p>
        </div>

        {/* Live Roster Metrics */}
        <div className="flex items-center gap-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-sm shrink-0">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-400 block">
              Slots Filled
            </span>
            <span className="text-sm font-extrabold text-gray-900 dark:text-white">
              {selectedProposalsList.length} / {totalJobSlots}
            </span>
          </div>
          <div className="h-6 w-px bg-gray-200 dark:bg-white/10" />
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-400 block">
              Team Total Payout
            </span>
            <span className="text-sm font-extrabold text-green-600 dark:text-green-400 flex items-center gap-1">
              <CreditIcon className="h-3.5 w-3.5 text-yellow-500" />
              {totalCartCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Milestone Columns / Rows */}
      <div className="space-y-6">
        {milestones.map((m: any, mIdx: number) => {
          const slotsCount = Math.max(1, m.slots_count || 1);
          const milestoneApplicants = proposals.filter(
            (p) => p.job_milestone_id === m.job_milestone_id || p.target_milestone_title === m.title
          );

          const pendingCount = milestoneApplicants.filter((p) => p.status === "Pending").length;
          const shortlistedCount = milestoneApplicants.filter((p) => p.status === "Shortlisted").length;
          const acceptedCount = milestoneApplicants.filter(
            (p) => p.status === "Hired" || p.status === "Accepted" || Object.values(slottedProposals).includes(p.id)
          ).length;

          const currentFilter = filterByMilestone[m.job_milestone_id] || "all";

          // Applicants matching current active filter
          const displayedApplicants = milestoneApplicants.filter((p) => {
            const isSlotted = Object.values(slottedProposals).includes(p.id);
            const isAccepted = p.status === "Hired" || p.status === "Accepted" || isSlotted;
            if (currentFilter === "pending") return p.status === "Pending" && !isSlotted;
            if (currentFilter === "shortlisted") return (p.status === "Shortlisted" || p.status === "Approved") && !isSlotted;
            if (currentFilter === "accepted") return isAccepted;
            return true;
          });

          return (
            <div
              key={m.job_milestone_id || mIdx}
              className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface shadow-sm space-y-4"
            >
              {/* Milestone Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2.5">
                  <span className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {mIdx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{m.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-500/20">
                        {slotsCount} Role Slot{slotsCount > 1 ? "s" : ""}
                      </span>
                    </h4>
                    {m.description && (
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                        {m.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs">
                  <span className="font-extrabold text-green-600 dark:text-green-400">
                    {m.budget_percentage}% Budget Allocation
                  </span>
                  <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">
                    <span>{milestoneApplicants.length} Applicants</span>
                    <span>&bull;</span>
                    <span className="text-amber-500 font-bold">{shortlistedCount} Shortlisted</span>
                    <span>&bull;</span>
                    <span className="text-green-600 dark:text-green-400 font-bold">{acceptedCount} Offers &amp; Hired</span>
                  </div>
                </div>
              </div>

              {/* Roster Slots Bar */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400 block mb-2">
                  Role Slots for this Milestone ({slotsCount} Needed) &bull;{" "}
                  <span className="text-purple-600 dark:text-purple-400 font-normal">Candidate is slotted once they accept the contract</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Array.from({ length: slotsCount }).map((_, slotIdx) => {
                    const slotKey = `${m.job_milestone_id}-slot-${slotIdx}`;
                    const assignedProposalId = slottedProposals[slotKey];
                    const assignedProposal = proposals.find((p) => p.id === assignedProposalId);

                    // Other candidates shortlisted for this milestone available for quick-swap
                    const otherShortlisted = milestoneApplicants.filter(
                      (p) => p.status === "Shortlisted" && p.id !== assignedProposalId
                    );

                    return (
                      <div
                        key={slotKey}
                        className={`p-3 rounded-xl border transition-all ${
                          assignedProposal
                            ? "border-green-500/40 bg-green-50/5 dark:bg-green-500/10"
                            : "border-dashed border-gray-300 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-400">
                            Slot #{slotIdx + 1}
                          </span>
                          {assignedProposal ? (
                            <span className="text-[9px] font-bold text-green-600 dark:text-green-400 flex items-center gap-0.5">
                              <CheckCircle2 className="h-3 w-3" /> Hired &amp; Slotted
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500">
                              Open Slot
                            </span>
                          )}
                        </div>

                        {assignedProposal ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {assignedProposal.partyAvatar ? (
                                  <img
                                    src={assignedProposal.partyAvatar}
                                    alt=""
                                    className="h-7 w-7 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                                    {assignedProposal.partyName.charAt(0)}
                                  </div>
                                )}
                                <div className="truncate">
                                  <span className="text-xs font-bold text-gray-900 dark:text-white block truncate">
                                    {assignedProposal.partyName}
                                  </span>
                                  <span className="text-[10px] font-extrabold text-green-600 dark:text-green-400 flex items-center gap-0.5">
                                    <CreditIcon className="h-2.5 w-2.5 text-yellow-500" />
                                    {assignedProposal.bidAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/jobs/proposals/received/${assignedProposal.id}`)}
                                className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold shrink-0"
                              >
                                View
                              </button>
                            </div>

                            {/* Quick Swap selector if other shortlisted candidates exist */}
                            {otherShortlisted.length > 0 && (
                              <div className="pt-1.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[10px]">
                                <span className="text-gray-400 flex items-center gap-1">
                                  <ArrowLeftRight className="h-2.5 w-2.5" /> Swap:
                                </span>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      navigate(`/jobs/proposals/received/${e.target.value}`);
                                    }
                                  }}
                                  className="text-[10px] font-semibold bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5 text-gray-700 dark:text-zinc-200"
                                >
                                  <option value="">Switch to shortlisted...</option>
                                  {otherShortlisted.map((cand) => (
                                    <option key={cand.id} value={cand.id}>
                                      {cand.partyName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 py-1">
                            <div className="text-xs text-gray-400 dark:text-zinc-400 italic">
                              Role Unassigned
                            </div>
                            {milestoneApplicants.filter((p) => p.status === "Shortlisted").length > 0 ? (
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-amber-500 font-bold">
                                  {shortlistedCount} Shortlisted
                                </span>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      navigate(`/jobs/proposals/received/${e.target.value}`);
                                    }
                                  }}
                                  className="text-[10px] font-bold bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 rounded px-2 py-0.5"
                                >
                                  <option value="">Slot &amp; Accept winner...</option>
                                  {milestoneApplicants
                                    .filter((p) => p.status === "Shortlisted" && !Object.values(slottedProposals).includes(p.id))
                                    .map((cand) => (
                                      <option key={cand.id} value={cand.id}>
                                        {cand.partyName}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400">
                                Shortlist candidates below first to slot them.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Applicants for this Milestone with Pending | Shortlisted | Accepted Filter */}
              <div className="pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                      Applicants ({milestoneApplicants.length})
                    </span>
                  </div>

                  {/* Filter Pills: Pending | Shortlisted | Accepted */}
                  <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() =>
                        setFilterByMilestone((prev) => ({ ...prev, [m.job_milestone_id]: "all" }))
                      }
                      className={`px-2.5 py-1 rounded-lg transition ${
                        currentFilter === "all"
                          ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      All ({milestoneApplicants.length})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFilterByMilestone((prev) => ({ ...prev, [m.job_milestone_id]: "pending" }))
                      }
                      className={`px-2.5 py-1 rounded-lg transition ${
                        currentFilter === "pending"
                          ? "bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm"
                          : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      Pending ({pendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFilterByMilestone((prev) => ({ ...prev, [m.job_milestone_id]: "shortlisted" }))
                      }
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        currentFilter === "shortlisted"
                          ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm"
                          : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>Shortlisted ({shortlistedCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFilterByMilestone((prev) => ({ ...prev, [m.job_milestone_id]: "accepted" }))
                      }
                      className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
                        currentFilter === "accepted"
                          ? "bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 shadow-sm"
                          : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span>Offers &amp; Hired ({acceptedCount})</span>
                    </button>
                  </div>
                </div>

                {displayedApplicants.length === 0 ? (
                  <div className="p-5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] text-center text-xs text-gray-400 dark:text-zinc-400">
                    {currentFilter === "pending"
                      ? "No pending candidates for this milestone."
                      : currentFilter === "shortlisted"
                      ? "No candidates shortlisted for this milestone yet. Shortlist pending applicants to interview them."
                      : currentFilter === "accepted"
                      ? "No candidates accepted/slotted into this milestone yet."
                      : "No proposals submitted for this milestone role yet."}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displayedApplicants.map((p) => {
                      const isSlotted = Object.values(slottedProposals).includes(p.id);
                      const currentSlotEntry = Object.entries(slottedProposals).find(
                        ([, val]) => val === p.id
                      );
                      const isAccepted = p.status === "Hired" || p.status === "Accepted" || isSlotted;
                      const isApproved = p.status === "Approved" && !isSlotted;
                      const isShortlisted = p.status === "Shortlisted" && !isSlotted;
                      const isPending = p.status === "Pending" && !isSlotted;
                      const isBusy = processingId === p.id;

                      return (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                            isAccepted
                              ? "border-green-500/50 bg-green-50/30 dark:bg-green-500/5 shadow-sm"
                              : isApproved
                              ? "border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5"
                              : isShortlisted
                              ? "border-blue-500/40 bg-blue-50/30 dark:bg-blue-500/5"
                              : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-gray-300 dark:hover:border-white/20"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {p.partyAvatar ? (
                                  <img
                                    src={p.partyAvatar}
                                    alt=""
                                    className="h-8 w-8 rounded-full object-cover shrink-0"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 font-bold text-xs flex items-center justify-center shrink-0">
                                    {p.partyName.charAt(0)}
                                  </div>
                                )}
                                <div className="truncate">
                                  <h5 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                    {p.partyName}
                                  </h5>
                                  <span className="text-[10px] text-gray-400 dark:text-zinc-400 block">
                                    Submitted {p.submittedAt}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-xs font-extrabold text-green-600 dark:text-green-400 flex items-center gap-1 justify-end">
                                  <CreditIcon className="h-3 w-3 text-yellow-500" />
                                  {p.bidAmount.toLocaleString()}
                                </span>
                                {isAccepted ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 flex items-center gap-0.5 justify-end">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> Hired &amp; Slotted
                                  </span>
                                ) : isApproved ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-0.5 justify-end">
                                    <Clock className="h-2.5 w-2.5" /> Offer Sent (Awaiting)
                                  </span>
                                ) : isShortlisted ? (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-0.5 justify-end">
                                    <Star className="h-2.5 w-2.5 fill-blue-500" /> Shortlisted
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">
                                    Pending Review
                                  </span>
                                )}
                              </div>
                            </div>

                            {p.coverLetter && (
                              <p className="text-[11px] text-gray-600 dark:text-zinc-300 line-clamp-2 leading-relaxed mb-2.5">
                                {p.coverLetter}
                              </p>
                            )}

                            {/* Work Rate and Revisions Information */}
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500 dark:text-zinc-400 mb-2 py-1.5 px-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5">
                              <span className="flex items-center gap-1">
                                <Percent className="h-3 w-3 text-purple-500" />
                                Work Rate:{" "}
                                <strong className="text-gray-700 dark:text-zinc-200">
                                  +{Number(p.additionalWorkRate) || 0}% / extra pass
                                </strong>
                              </span>
                              <span>&bull;</span>
                              <span className="flex items-center gap-1">
                                <RefreshCcw className="h-3 w-3 text-emerald-500" />
                                Revisions:{" "}
                                <strong className="text-gray-700 dark:text-zinc-200">
                                  {p.milestones?.length
                                    ? p.milestones.reduce((acc: number, m: any) => acc + (Number(m.revisions) || 0), 0)
                                    : (Number(p.revisions) || 0)}{" "}
                                  pass{(p.milestones?.reduce((acc: number, m: any) => acc + (Number(m.revisions) || 0), 0) ?? p.revisions) === 1 ? "" : "es"}
                                </strong>
                              </span>
                            </div>
                          </div>

                          {/* Action Buttons: Pending -> Shortlisted -> Slot & Accept */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-gray-100 dark:border-white/5">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/jobs/proposals/received/${p.id}`)}
                                className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition flex items-center gap-1"
                              >
                                <span>Proposal</span>
                                <ExternalLink className="h-3 w-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenChat(p)}
                                className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 transition flex items-center gap-1"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>Interview</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* If Pending: Only Shortlist button (Slotting disabled) */}
                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleShortlistToggle(p)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                                  >
                                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                                    <span>Shortlist</span>
                                  </button>
                                  <div
                                    title="Candidate must be Shortlisted before slotting into a role"
                                    className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10 text-gray-400 text-xs font-medium flex items-center gap-1 cursor-not-allowed"
                                  >
                                    <Lock className="h-3 w-3" />
                                    <span>Slot (Shortlist first)</span>
                                  </div>
                                </>
                              )}

                              {/* If Shortlisted: Can un-shortlist OR Slot & Accept (navigates to confirm proposal and form contract) */}
                              {isShortlisted && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => handleShortlistToggle(p)}
                                    className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 transition"
                                  >
                                    Unshortlist
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => navigate(`/jobs/proposals/received/${p.id}`)}
                                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                                    title="Review proposal, confirm, and send contract offer"
                                  >
                                    <UserCheck className="h-3.5 w-3.5" />
                                    <span>Slot &amp; Accept</span>
                                  </button>
                                </>
                              )}

                              {/* If Approved: Offer Sent and awaiting freelancer signature */}
                              {isApproved && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/jobs/proposals/received/${p.id}`)}
                                  className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition flex items-center gap-1"
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>View Offer</span>
                                </button>
                              )}

                              {/* If Accepted/Hired (Slotted): View Contract / Slotted status */}
                              {isAccepted && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/jobs/proposals/received/${p.id}`)}
                                  className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs font-bold hover:bg-green-500/20 transition flex items-center gap-1"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Hired &amp; Slotted</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Roster Cart Bar */}
      {selectedProposalsList.length > 0 && (
        <div className="sticky bottom-6 z-30 p-4 rounded-2xl bg-white dark:bg-[#151722] border border-purple-500/30 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <span>Active Team Roster</span>
                <span className="px-2 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                  {selectedProposalsList.length} of {totalJobSlots} Slots Filled
                </span>
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                Combined Team Payout:{" "}
                <strong className="text-green-600 dark:text-green-400 font-extrabold">
                  {totalCartCost.toLocaleString()} Credits
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/jobs/proposals/incoming/${job?.job_id || ""}`)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-lg shadow-purple-600/20"
            >
              <span>Manage Applications</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMilestoneRosterView;
