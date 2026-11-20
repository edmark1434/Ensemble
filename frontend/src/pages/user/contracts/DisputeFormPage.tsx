import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import { casePath } from "@/lib/cases";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { CreditIcon } from "@/components/ui/credit-icon";
import GlideSelect, { type GlideSelectOption } from "@/components/ui/GlideSelect";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import {
  ATTACHMENT_HINT,
  AttachButton,
  PendingFileList,
  uploadPendingFiles,
  usePendingFiles,
} from "@/pages/user/account/appeal/appealAttachments";
import {
  CONTRACT_DISPUTE_FILING_CODES,
  type ContractActiveDispute,
  type ContractDisputeFiling,
  type ContractDisputeFilingCode,
  contractDisputeBlockLabel,
  contractDisputeBlockingDispute,
  contractDisputeDetail,
  contractDisputePath,
  contractDisputePayoutText,
  contractDisputeWindowText,
} from "./contractDispute";

// Same interface as in contracts.tsx
interface DetailedContract {
  id: string;
  title: string;
  clientAccountId?: string;
  freelancerAccountId?: string;
  clientName: string;
  freelancerName: string;
  clientAvatar?: string;
  freelancerAvatar?: string;
  status?: string;
  totalValueCredits: number;
  milestones?: any[];
  activeDispute?: ContractActiveDispute | null;
  disputeFiling?: ContractDisputeFiling | null;
}

const MAX_DETAILS_CHARS = 2000;

const DISPUTE_REASONS: GlideSelectOption[] = [
  { value: "Milestone Submission Conflict", label: "Milestone Submission Conflict" },
  { value: "Non-delivery of work", label: "Non-delivery of work" },
  { value: "Unresponsive", label: "Unresponsive / Poor Communication" },
  { value: "Quality below expectations", label: "Quality below expectations" },
  { value: "Scope creep / Demanding extra work", label: "Scope creep / Demanding extra work" },
  { value: "Other", label: "Other" },
];

// An ended contract can still be disputed, but its milestone payments are final (no refunds).
// Matches ENDED_CONTRACT_STATUSES in backend/lib/DisputeEscrow.js.
const ENDED_CONTRACT_STATUSES = ["Done", "Closed", "Cancelled", "Completed", "Rejected"];

export const DisputeFormPage: React.FC = () => {
  const { user, theme } = useGlobalState();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeContracts, setActiveContracts] = useState<DetailedContract[]>([]);
  const [loading, setLoading] = useState(true);

  const paramContractId = searchParams.get('contractId') || (location.state as any)?.contractId || "";
  const paramMilestoneId = searchParams.get('milestoneId') || (location.state as any)?.milestoneId || "";
  const [selectedContractId, setSelectedContractId] = useState(paramContractId);
  const [reason, setReason] = useState(paramMilestoneId ? "Milestone Submission Conflict" : "");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const evidenceFiles = usePendingFiles();

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await api.get('/api/contracts');
        if (res.data.success) {
          const mappedContracts = res.data.data.map((c: any) => {
            const mappedMilestones = (c.milestones || []).filter(Boolean).map((m: any, idx: number, arr: any[]) => ({
              id: m.id,
              name: m.name,
              revisions: parseInt(m.revisions, 10) || 0,
              deadline_at: m.deadline_at,
              deadline: (() => {
                if (m.deadline_at) {
                  const d = new Date(m.deadline_at);
                  if (!isNaN(d.getTime())) return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                }
                if (m.hours) return `${m.hours} Hours`;
                const hrs = Number(m.deadline);
                if (!isNaN(hrs) && hrs <= 0) return 'Flexible';
                if (!isNaN(hrs) && hrs > 0 && hrs < 100000) {
                  if (m.started_at) {
                    const st = new Date(m.started_at);
                    if (!isNaN(st.getTime())) return new Date(st.getTime() + hrs * 3600000).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  }
                  if (hrs >= 24 && hrs % 24 === 0) return `${hrs / 24} Days (${hrs} hrs)`;
                  return `${hrs} Hours`;
                }
                if (typeof m.deadline === 'string' && m.deadline.includes('-')) {
                  const d = new Date(m.deadline);
                  if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d.toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                }
                return m.deadline ? String(m.deadline) : 'N/A';
              })(),
              credits: m.credits || Math.floor((parseFloat(c.rate_credits) || 0) / (arr.length || 1)),
              status: m.status === 'completed' || m.status === 'approved' ? "Claimed" : m.status === 'active' || m.status === 'submitted_for_review' ? "In Progress" : "Locked"
            }));

            const isCompleted = mappedMilestones.length > 0 && mappedMilestones.every((m: any) => m.status === 'Claimed');
            const derivedStatus = isCompleted ? 'Closed' : (c.status === 'Done' ? 'Closed' : c.status);

            return {
              id: c.contract_id,
              title: c.job_title || c.contract_type,
              clientAccountId: c.client_account_id,
              freelancerAccountId: c.freelancer_account_id,
              clientName: c.client_name || c.client_handle,
              freelancerName: c.freelancer_name || c.freelancer_handle,
              clientAvatar: c.client_avatar || undefined,
              freelancerAvatar: c.freelancer_avatar || undefined,
              status: derivedStatus,
              totalValueCredits: parseFloat(c.rate_credits) || 0,
              milestones: mappedMilestones,
              activeDispute: c.active_dispute || null,
              disputeFiling: c.dispute_filing || null,
            };
          });
          
          setActiveContracts(mappedContracts);
        }
      } catch (err) {
        console.error("Failed to fetch contracts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const selectedContract = activeContracts.find(c => c.id === selectedContractId);
  const existingDispute = selectedContract?.activeDispute || null;
  const existingDisputePath = contractDisputePath(existingDispute);
  const contractEnded = Boolean(selectedContract?.status && ENDED_CONTRACT_STATUSES.includes(selectedContract.status));
  // One dispute per side per contract, 30 days after an ended contract, and none while an earlier
  // ruling's payout is pending; the server enforces all three.
  const filing = selectedContract?.disputeFiling || null;
  const filingBlocked = Boolean(!existingDispute && filing && !filing.canFile);
  const blockingDispute = filingBlocked ? contractDisputeBlockingDispute(filing) : null;
  const blockingDisputePath = contractDisputePath(blockingDispute);
  const payoutText = filingBlocked ? contractDisputePayoutText(filing) : null;
  const windowText = contractDisputeWindowText(filing);
  const contestedMilestone = selectedContract?.milestones?.find((m: any) => String(m.id) === String(paramMilestoneId));
  
  let opponentName = "Unknown";
  let opponentAvatar = "";
  let myName = "Me";
  let myAvatar = "";
  
  if (selectedContract) {
    if (user?.account_id === selectedContract.clientAccountId) {
      opponentName = selectedContract.freelancerName || "Freelancer";
      opponentAvatar = selectedContract.freelancerAvatar || "";
      myName = selectedContract.clientName || "Me";
      myAvatar = selectedContract.clientAvatar || "";
    } else {
      opponentName = selectedContract.clientName || "Client";
      opponentAvatar = selectedContract.clientAvatar || "";
      myName = selectedContract.freelancerName || "Me";
      myAvatar = selectedContract.freelancerAvatar || "";
    }
  }

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!selectedContractId || !reason || !details || existingDispute || filingBlocked) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    
    try {
      const formattedDetails = contestedMilestone
        ? `[Contested Milestone: ${contestedMilestone.name} (#${contestedMilestone.id})]\n\n${details}`
        : (paramMilestoneId ? `[Contested Milestone ID: #${paramMilestoneId}]\n\n${details}` : details);

      // Same staging folder as replies in the dispute case; they are posted under the case summary.
      const attachments = await uploadPendingFiles(evidenceFiles.files, "chat-attachments");
      const res = await api.post(`/api/contracts/${selectedContractId}/dispute`, {
        reason,
        details: formattedDetails,
        ...(attachments.length ? { attachments } : {}),
      });
      if (res.data?.success) {
        evidenceFiles.clear();
        if (res.data?.data?.evidence?.failed) {
          toast.error("Dispute filed, but your files could not be attached. Add them again by replying in the case.");
        } else {
          toast.success("Dispute filed. Staff will review it; you can add more evidence here.");
        }
        // Open the new case: its first message is the platform summary of what was filed.
        const disputeId = res.data?.data?.dispute_id;
        navigate(disputeId ? casePath("dispute", String(disputeId)) : "/contracts");
      } else {
        toast.error(res.data?.message || "Failed to submit dispute.");
      }
    } catch (err: any) {
      console.error("Dispute submission error:", err);
      const code = err.response?.data?.code as ContractDisputeFilingCode | undefined;
      const message = err.response?.data?.message;
      if (code && CONTRACT_DISPUTE_FILING_CODES.includes(code)) {
        // The block appeared after this page loaded (e.g. a ruling's payout was just scheduled).
        // Show it in the banner above the form, where the full explanation fits, and keep Submit off.
        const contractId = selectedContractId;
        setActiveContracts((prev) =>
          prev.map((c) =>
            c.id === contractId
              ? { ...c, disputeFiling: { ...(c.disputeFiling || {}), canFile: false, code, reason: message || null } }
              : c
          )
        );
        toast.error("This contract can't be disputed right now. See the note above the form.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      // An upload failure throws a plain Error naming the file (see uploadPendingFiles).
      toast.error(message || err?.message || "Failed to submit dispute. Please try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-gray-50 dark:bg-dark-base py-12 px-4 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans'] overflow-x-hidden">
      {/* Background Grid Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"}
          hoverFillColor={theme === 'dark' ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate("/contracts")}
          className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Contracts
        </button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="overflow-visible rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl border border-gray-200 dark:border-white/10"
        >
          <div className="rounded-t-2xl border-b border-gray-100 dark:border-white/5 px-6 py-5 bg-rose-50/60 dark:bg-rose-500/5">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">File a Dispute</h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Submit a formal contract dispute. Our moderation team will review the contract and details provided.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    Select Contract
                  </label>
                  <GlideSelect
                    options={activeContracts.map((c) => {
                      // Blocked contracts stay selectable; the banner below explains and Submit stays off.
                      const blockLabel = c.activeDispute ? null : contractDisputeBlockLabel(c.disputeFiling);
                      return {
                        value: c.id,
                        label: c.title,
                        tag: c.activeDispute
                          ? `${c.status || "Active"} · In Dispute`
                          : blockLabel
                            ? `${c.status || "Active"} · ${blockLabel}`
                            : c.status || "Active",
                      };
                    })}
                    value={selectedContractId}
                    onChange={(val) => setSelectedContractId(val)}
                    placeholder="Choose a contract..."
                    size="md"
                    fullWidth
                    radius={12}
                    maxVisibleItems={6}
                    showTags
                    ariaLabel="Select Contract"
                  />
                </div>

                {existingDispute && (
                  <div className="flex flex-col gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-500/40 dark:bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
                      <div>
                        <p className="text-sm font-bold text-rose-900 dark:text-rose-100">
                          This contract is already under dispute
                        </p>
                        <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">
                          {contractDisputeDetail(existingDispute)}
                        </p>
                      </div>
                    </div>
                    {existingDisputePath ? (
                      <button
                        type="button"
                        onClick={() => navigate(existingDisputePath)}
                        className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        View dispute
                      </button>
                    ) : null}
                  </div>
                )}

                {filingBlocked && filing && (
                  <div className="flex flex-col gap-3 rounded-xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-500/40 dark:bg-rose-500/10 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
                      <div>
                        <p className="text-sm font-bold text-rose-900 dark:text-rose-100">
                          {contractDisputeBlockLabel(filing)}
                        </p>
                        <p className="mt-1 text-xs text-rose-800 dark:text-rose-200">{filing.reason}</p>
                        {payoutText ? (
                          <p className="mt-1 text-xs font-semibold text-rose-800 dark:text-rose-200">{payoutText}</p>
                        ) : null}
                      </div>
                    </div>
                    {blockingDisputePath ? (
                      <button
                        type="button"
                        onClick={() => navigate(blockingDisputePath)}
                        className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        {blockingDispute?.filedByViewer ? "View your dispute" : "View dispute"}
                      </button>
                    ) : filing.code === "DISPUTE_DECISION_PENDING" && selectedContractId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/contracts/${selectedContractId}`)}
                        className="shrink-0 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        Go to contract
                      </button>
                    ) : null}
                  </div>
                )}

                {selectedContract && contractEnded && !existingDispute && !filingBlocked && (
                  <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
                    <div>
                      <p className="text-sm font-bold text-amber-900 dark:text-amber-100">This contract has ended</p>
                      <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                        You can still report what happened, but its milestone payments are final, so no credits
                        can be refunded. Staff can review the other member's conduct and warn, suspend or ban them.
                        {windowText ? ` ${windowText}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                {selectedContract && !existingDispute && !filingBlocked && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    You can file one dispute per contract, and its ruling is final. Include everything that
                    went wrong in this one.
                  </p>
                )}

                <AnimatePresence mode="popLayout">
                  {selectedContract && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="rounded-xl bg-gray-50 dark:bg-white/5 p-5 border border-gray-200 dark:border-white/10 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-semibold uppercase tracking-wider">Dispute Title</div>
                          <div className="font-bold text-red-600 dark:text-red-400 text-base">Dispute of {myName} vs {opponentName}</div>
                        </div>
                        {selectedContract.status && (
                          <span className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-zinc-300 dark:border-white/15 bg-white dark:bg-white/5 text-zinc-700 dark:text-zinc-300">
                            {selectedContract.status}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                          {/* Current User */}
                          <div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5 font-semibold uppercase tracking-wider">Reporting Party (You)</div>
                            <div className="flex items-center gap-2.5">
                              <img
                                src={constructAvatarUrl(myAvatar, myName)}
                                alt={myName}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getFallbackAvatarUrl(myName);
                                }}
                                className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                              />
                              <div className="font-bold text-gray-900 dark:text-white text-sm">{myName}</div>
                            </div>
                          </div>

                          <div className="hidden sm:block text-gray-300 dark:text-zinc-600 font-black italic text-sm opacity-50">VS</div>

                          {/* Opponent */}
                          <div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1.5 font-semibold uppercase tracking-wider">Disputing With</div>
                            <div className="flex items-center gap-2.5">
                              <img
                                src={constructAvatarUrl(opponentAvatar, opponentName)}
                                alt={opponentName}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = getFallbackAvatarUrl(opponentName);
                                }}
                                className="h-7 w-7 rounded-full object-cover border border-gray-200 dark:border-zinc-700"
                              />
                              <div className="font-bold text-gray-900 dark:text-white text-sm">{opponentName}</div>
                            </div>
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-semibold uppercase tracking-wider">
                            {contractEnded ? "Contract Value" : "Amount Involved"}
                          </div>
                          <div className="font-bold text-yellow-500 text-sm flex items-center md:justify-end gap-1.5">
                            <CreditIcon className="h-4 w-4 text-yellow-500" />
                            <span>{selectedContract.totalValueCredits?.toLocaleString() || 0} Credits</span>
                          </div>
                        </div>
                      </div>

                      {contestedMilestone && (
                        <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 dark:text-red-400">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Disputing Milestone Submission: <strong>{contestedMilestone.name}</strong></span>
                          </div>
                          <span className="font-semibold">{contestedMilestone.credits?.toLocaleString()} Credits</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    Reason for Dispute
                  </label>
                  <GlideSelect
                    options={DISPUTE_REASONS}
                    value={reason}
                    onChange={(val) => setReason(val)}
                    placeholder="Select a reason..."
                    size="md"
                    fullWidth
                    radius={12}
                    maxVisibleItems={6}
                    ariaLabel="Reason for Dispute"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Details
                    </label>
                    <span
                      className={`text-[11px] font-medium ${
                        details.length >= MAX_DETAILS_CHARS
                          ? "text-rose-500 font-semibold"
                          : details.length >= MAX_DETAILS_CHARS - 200
                          ? "text-amber-500"
                          : "text-gray-400 dark:text-zinc-500"
                      }`}
                    >
                      {details.length} / {MAX_DETAILS_CHARS}
                    </span>
                  </div>
                  <textarea
                    value={details}
                    maxLength={MAX_DETAILS_CHARS}
                    onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS_CHARS))}
                    placeholder="Please explain the situation in detail..."
                    className="scroll-thin w-full min-h-[130px] resize-y rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Evidence{" "}
                      <span className="font-medium normal-case tracking-normal text-gray-400 dark:text-zinc-500">(optional)</span>
                    </span>
                    <AttachButton
                      onPick={evidenceFiles.add}
                      disabled={isSubmitting}
                      count={evidenceFiles.files.length}
                      className="-my-1.5 -mr-1.5"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Screenshots, delivered files, chat logs or receipts that show what happened. Only you and staff
                    can see them while the case is private. {ATTACHMENT_HINT}
                  </p>
                  <PendingFileList files={evidenceFiles.files} onRemove={evidenceFiles.remove} disabled={isSubmitting} />
                </div>
              </>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-white/10 px-6 py-5 flex justify-end gap-3 bg-transparent">
            <button
              type="button"
              onClick={() => navigate("/contracts")}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedContractId || !reason || !details || isSubmitting || Boolean(existingDispute) || filingBlocked}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-8 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Submit Dispute"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
