import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Briefcase,
  Star,
  FileText,
  Layers,
  Percent,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  UserCheck,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  User,
  Send,
  UserCheck2,
  Check
} from "lucide-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { JobRichText } from "../../job_components/JobRichText";

import { sampleIncomingProposals, sampleSentProposals } from "../proposals_datasets";
import { sampleJobs } from "../../job_datasets";
import type { ProposalItemData, ProposalStatus } from "../proposals_components/proposals_list";
import { CreditIcon } from "@/components/ui/credit-icon";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";

export const ProposalsViewDetailsAsApplicant: React.FC = () => {
  const { proposalId, contractId } = useParams<{ proposalId: string, contractId?: string }>();
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const { pathname } = useLocation();
  const { fetchProposalById, withdrawProposal, acceptJobOffer, rejectContract, loading } = useJobs();

  const [proposal, setProposal] = useState<ProposalItemData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Decision Modal States
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [shortlistMessage, setShortlistMessage] = useState("");

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(!!contractId);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isRejectOfferModalOpen, setIsRejectOfferModalOpen] = useState(false);
  const [offerRejectReason, setOfferRejectReason] = useState("");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-open modal if contractId is present in URL
  useEffect(() => {
    if (contractId) {
      setIsAcceptConfirmOpen(true);
      setAgreedToTerms(false);
    } else {
      setIsAcceptConfirmOpen(false);
    }
  }, [contractId]);

  useEffect(() => {
    const loadProposal = async () => {
      if (!proposalId) return;
      setIsInitializing(true);
      try {
        const isIncoming = false;
        const p = await fetchProposalById(proposalId);
        
        if (p) {
          setProposal({
            id: p.proposal_id,
            jobId: p.job_id,
            contractId: p.contract_id,
            jobTitle: p.job_title || "Unknown Job",
            partyName: (isIncoming ? p.freelancer_name || p.freelancer_handle : p.client_name || p.client_handle) || "Unknown",
            clientAccountId: p.client_account_id,
            freelancerAccountId: p.freelancer_account_id,
            clientName: p.client_name || p.client_handle || "Unknown Client",
            clientAvatar: p.client_avatar_path
              ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.client_avatar_path.startsWith('/') ? '' : '/'}${p.client_avatar_path}`
              : undefined,
            freelancerName: p.freelancer_name || p.freelancer_handle || "Unknown Freelancer",
            freelancerAvatar: p.freelancer_avatar_path
              ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.freelancer_avatar_path.startsWith('/') ? '' : '/'}${p.freelancer_avatar_path}`
              : undefined,
            rating: 5.0, // Default since we don't fetch real rating yet
            bidAmount: parseFloat(p.rate_credits) || 0,
            additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
            coverLetter: p.letter || "",
            tosContent: p.terms_content || "No terms content available",
            tosTitle: p.terms_title || "Standard Terms",
            tosDescription: p.terms_type || "No description provided",
            submittedAt: new Date(p.created_at).toLocaleDateString(),
            submittedAgo: "Recently",
            jobPostedAt: p.job_created_at ? new Date(p.job_created_at).toLocaleDateString() : "N/A",
            jobStatus: p.job_status,
            jobDeletedAt: p.job_deleted_at,
            status: p.status,
            type: isIncoming ? "incoming" : "sent",
            rejectionReason: p.reject_reason,
            milestones: (p.milestones || [])
              .filter((m: any) => m && m.id)
              .map((m: any) => ({
                id: m.id,
                name: m.name,
                description: m.description,
                hours: parseFloat(m.hours) || 0,
                revisions: parseInt(m.revisions, 10) || 0
            }))
          });
        } else {
          setDebugInfo({ 
            error: "Not found", 
            searchId: proposalId,
          });
        }
      } catch (err) {
        console.error("Failed to load proposal details", err);
        setDebugInfo({ error: "Fetch failed", message: String(err) });
      } finally {
        setIsInitializing(false);
      }
    };
    loadProposal();
  }, [proposalId, pathname]);

  const targetJob = sampleJobs.find((j) => j.id === proposal?.jobId);

  const handleConfirmShortlist = () => {
    if (!shortlistMessage.trim()) return;
    if (!proposal) return;

    setProposal((prev) =>
      prev
        ? {
            ...prev,
            status: "Shortlisted",
            updatedAt: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
            }),
            updatedAgo: "Just now",
          }
        : null
    );

    console.log(`Shortlisted ${proposal.partyName} with message: "${shortlistMessage}"`);
    setIsShortlistModalOpen(false);
    setShortlistMessage("");
  };

  const handleConfirmReject = () => {
    if (!rejectionReason.trim()) return;
    if (!proposal) return;

    setProposal((prev) =>
      prev
        ? {
            ...prev,
            status: "Rejected",
            rejectionReason,
            updatedAt: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
            }),
            updatedAgo: "Just now",
          }
        : null
    );

    setIsRejectModalOpen(false);
    setRejectionReason("");
  };

  const handleConfirmAccept = async () => {
    if (!proposal || !proposal.contractId || isProcessing) return;
    setIsProcessing(true);
    try {
      await acceptJobOffer(proposal.contractId);
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: "Hired",
              updatedAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              }),
              updatedAgo: "Just now",
            }
          : null
      );
      setIsAcceptConfirmOpen(false);
      navigate("/jobs/proposals");
    } catch (error: any) {
      console.error("Failed to accept offer:", error);
      alert(error.response?.data?.message || "Failed to accept offer.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRejectOffer = async () => {
    if (!proposal || !proposal.contractId || isProcessing) return;
    setIsProcessing(true);
    try {
      await rejectContract(proposal.contractId, offerRejectReason);
      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: "Pending",
              updatedAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "numeric",
              }),
              updatedAgo: "Just now",
            }
          : null
      );
      setIsRejectOfferModalOpen(false);
      setIsAcceptConfirmOpen(false);
      navigate(`/jobs/proposals/sent/${proposal.id}`);
    } catch (error: any) {
      console.error("Failed to reject offer:", error);
      alert(error.response?.data?.message || "Failed to reject offer.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawProposal = async () => {
    if (!proposalId) return;
    setIsWithdrawing(true);
    try {
      await withdrawProposal(proposalId);
      navigate("/jobs/proposals/sent");
    } catch (err) {
      console.error("Failed to withdraw proposal", err);
      // Fallback/Silent error handle for now
    } finally {
      setIsWithdrawing(false);
      setIsWithdrawModalOpen(false);
    }
  };

  const handleViewProfile = (accountId?: string) => {
    if (!accountId) return;
    navigate(`/profile/${encodeURIComponent(accountId)}`);
  };

  const handleViewTargetJob = () => {
    if (!proposal) return;
    if (proposal.type === "incoming") {
      navigate(`/jobs/my-job-post/${proposal.jobId}`);
    } else {
      navigate(`/jobs/postings/${proposal.jobId}`);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium animate-pulse">Loading proposal details...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500 dark:text-zinc-400 font-medium">Proposal application not found.</p>
          {debugInfo && (
             <div className="text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded">
                Debug: {JSON.stringify(debugInfo)}
             </div>
          )}
          <button
            onClick={() => navigate("/jobs/proposals")}
            className="px-4 py-2 mt-4 rounded-xl bg-blue-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-blue-600 transition"
          >
            Return to Proposals Overview
          </button>
        </div>
      </div>
    );
  }

  const jobAuthorName = proposal.clientName || "Job Client";
  const proposerName = proposal.freelancerName || "Applicant";

  const milestonePayout = Math.floor(
    proposal.bidAmount / (proposal.milestones.length || 1)
  );
  const addedOverageAmount = Math.floor(
    milestonePayout * (proposal.additionalWorkRate / 100)
  );
  const totalHours = proposal.milestones.reduce((acc, m) => acc + m.hours, 0);
  const isJobDeleted = proposal?.jobStatus === "Deleted" || !!proposal?.jobDeletedAt;

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-hidden pt-6 pb-16">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
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

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative z-10 mx-auto max-w-6xl p-6 md:p-8 w-full space-y-6 text-left"
      >
        {/* Deleted Job Post Banner */}
        {isJobDeleted && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 shadow-lg shadow-red-500/5 mb-4">
            <ShieldAlert className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-400">This Job Post has been deleted.</h4>
              <p className="text-[11px] text-red-400/80 mt-0.5">The client has removed this job post. Your proposal has been archived.</p>
            </div>
          </div>
        )}

        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() =>
              navigate(
                proposal.type === "incoming"
                  ? `/jobs/proposals/incoming/${proposal.jobId}`
                  : "/jobs/proposals/sent"
              )
            }
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800/80 hover:bg-gray-200 dark:hover:bg-zinc-700/80 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0 shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return</span>
          </button>

          <span className="text-xs font-mono text-gray-500 dark:text-zinc-500">Proposal ID: {proposal.id}</span>
        </div>

        {/* --- 2-COLUMN MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ================= LEFT COLUMN (WIDER - 7/12) ================= */}
          <div className="lg:col-span-7 space-y-6">

            {/* SECTION 1: Applicant Profile Header, Target Job & Financial Metrics */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-5">

              {/* 1. APPLICANT (PROPOSER) AT TOP */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5 pb-5">
                <div className="flex items-center gap-3.5 min-w-0">
                  {proposal.freelancerAvatar ? (
                    <img
                      src={proposal.freelancerAvatar}
                      alt={proposerName}
                      className="h-12 w-12 rounded-full border border-emerald-500/20 object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-lg font-bold shrink-0">
                      {proposerName[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">
                        {proposerName}
                      </h1>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Applicant
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1 text-yellow-500 font-bold">
                        <Star className="h-3.5 w-3.5 fill-yellow-500" />
                        {proposal.rating ? proposal.rating.toFixed(1) : "5.0"}
                      </span>
                      <span>•</span>
                      <span className="text-gray-600 dark:text-zinc-300">Freelancer Rating</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleViewProfile(proposal.freelancerAccountId)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                >
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{proposal.type === "sent" ? "View Your Profile" : "View Applicant Profile"}</span>
                </button>
              </div>

              {/* 2. TARGET JOB POST (WITH AUTHOR INTEGRATED INSIDE) */}
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                    Target Job Post
                  </span>

                  <div className="flex items-center gap-2">
                    {proposal.status === "Shortlisted" && (
                      <button
                        title="Open Discussion Chat"
                        onClick={() =>
                          void openMarketplaceConversation({
                            contextType: "job_proposal",
                            contextId: proposal.id,
                            navigate,
                          })
                        }
                        className="p-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors border border-blue-500/30"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                        proposal.status === "Accepted"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          : proposal.status === "Shortlisted"
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                          : proposal.status === "Rejected"
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                      }`}
                    >
                      {proposal.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-400 shrink-0" />
                    {proposal.jobTitle}
                  </h3>

                  <button
                    onClick={handleViewTargetJob}
                    className="p-1.5 rounded-lg bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition shrink-0"
                    title="View Target Job Post"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Author Info Embedded Inside Job Post Card */}
                <div className="p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {proposal.clientAvatar ? (
                      <img
                        src={proposal.clientAvatar}
                        alt={jobAuthorName}
                        className="h-7 w-7 rounded-full border border-blue-500/20 object-cover shrink-0"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">
                        {jobAuthorName[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Job Author</span>
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{jobAuthorName}</h4>
                    </div>
                  </div>

                  <button
                    onClick={() => handleViewProfile(proposal.clientAccountId)}
                    className="px-2.5 py-1 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition shrink-0 flex items-center gap-1"
                  >
                    <User className="h-3 w-3 text-blue-400" />
                    <span>{proposal.type === "incoming" ? "View Your Profile" : "View Client Profile"}</span>
                  </button>
                </div>

                {/* Explicit Timestamps */}
                <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-500 dark:text-zinc-400">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-500 dark:text-zinc-500" /> Job Posted Date:
                    </span>
                    <strong className="text-gray-600 dark:text-zinc-300 font-mono">{proposal.jobPostedAt}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                      <Send className="h-3 w-3 text-blue-400" /> Proposal Sent Date:
                    </span>
                    <strong className="text-gray-600 dark:text-zinc-300 font-mono">{proposal.submittedAt} ({proposal.submittedAgo || "Recently"})</strong>
                  </div>

                  {proposal.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-400" /> Last Proposal Update:
                      </span>
                      <strong className="text-blue-400 font-mono">{proposal.updatedAt} ({proposal.updatedAgo || ""})</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Proposed Bid</span>
                  <p className="text-base font-extrabold text-yellow-500 flex items-center gap-1 mt-0.5">
                    <CreditIcon className="h-4 w-4" /> {proposal.bidAmount.toLocaleString()}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Additional Work Rate</span>
                  <p className="text-xs font-bold text-blue-400 flex items-center gap-1 mt-1">
                    <Percent className="h-3.5 w-3.5" /> +{proposal.additionalWorkRate}% / Revision
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Milestone Count</span>
                  <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1 mt-1">
                    <Layers className="h-3.5 w-3.5 text-emerald-400" /> {proposal.milestones.length} Steps
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: Cover Letter Pitch */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-3">
              <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Cover Letter & Pitch Rationale
              </h3>
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white/[0.01]">
                <JobRichText content={proposal.coverLetter} />
              </div>
            </div>

          </div>

          {/* ================= RIGHT COLUMN (5/12) ================= */}
          <div className="lg:col-span-5 space-y-6">

            {/* SECTION 3: Milestone Roadmap */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-400" /> Milestone Roadmap
                </h3>
                <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">{totalHours}h Total</span>
              </div>

              <div className="space-y-3">
                {proposal.milestones.map((m, idx) => (
                  <div key={m.id || idx} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                      <span>Step {idx + 1}: {m.name}</span>
                      <span className="text-yellow-500 font-mono flex items-center">
                        <CreditIcon className="h-3.5 w-3.5 text-yellow-500 inline mr-1 shrink-0" />
                        {milestonePayout.toLocaleString()}
                      </span>
                    </div>

                    {m.description && <p className="text-gray-500 dark:text-zinc-400 text-[11px] leading-relaxed">{m.description}</p>}

                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500 dark:text-zinc-500 pt-2 border-t border-gray-100 dark:border-white/5">
                      <span>Est. Hours: <strong className="text-gray-600 dark:text-zinc-300">{m.hours} hrs</strong></span>
                      <span className="flex items-center gap-1">
                        <RefreshCcw className="h-2.5 w-2.5 text-emerald-400" /> Revisions: <strong className="text-gray-600 dark:text-zinc-300">{m.revisions} pass</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        Added Overage Rate:
                        <strong className="text-yellow-500 font-mono flex items-center">
                          +<CreditIcon className="h-3 w-3 text-yellow-500 inline mx-0.5 shrink-0" />
                          {addedOverageAmount.toLocaleString()} (+{proposal.additionalWorkRate}%)
                        </strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 4: Terms of Service */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-white/5">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-wider">
                    {proposal.tosTitle}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                    {proposal.tosDescription}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white/[0.01] text-xs text-gray-500 dark:text-zinc-400 font-mono leading-relaxed whitespace-pre-line">
                {proposal.tosContent}
              </div>
            </div>

          </div>
        </div>

        {/* ================= SECTION 5: EXPANDABLE HOVER DECISION CONTROLS (BOTTOM) ================= */}
        <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-4">

          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              Decision & Action Controls
            </h3>
            <span className="text-xs text-gray-500 dark:text-zinc-500 font-mono">Current Status: {proposal.status}</span>
          </div>

          {proposal.status === "Rejected" && proposal.rejectionReason && (
            <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs space-y-1">
              <span className="font-bold text-red-400 uppercase flex items-center gap-1 text-[10px]">
                <ShieldAlert className="h-3.5 w-3.5" /> Rejection Rationale
              </span>
              <p className="text-gray-600 dark:text-zinc-300">{proposal.rejectionReason}</p>
            </div>
          )}

          {/* Actions Bar for Client */}
          {proposal.type === "incoming" && (
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">

              {/* Option 1: PENDING STATE -> Chat */}
              {proposal.status === "Pending" && (
                <>
                  {/* Expandable Withdraw Button */}
                  <button
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition-all duration-300 hover:bg-red-200 dark:hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10"
                  >
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap max-w-[65px] transition-all duration-300 group-hover:max-w-[150px]">
                      <span className="inline group-hover:hidden">Withdraw</span>
                      <span className="hidden group-hover:inline">Withdraw Proposal</span>
                    </span>
                  </button>
                </>
              )}

              {/* Option 2: SHORTLISTED STATE -> Chat, Withdraw */}
              {proposal.status === "Shortlisted" && (
                <>
                  <button
                    onClick={() =>
                      void openMarketplaceConversation({
                        contextType: "job_proposal",
                        contextId: proposal.id,
                        navigate,
                      })
                    }
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs font-semibold text-gray-600 dark:text-zinc-300 transition-all duration-300 hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
                  >
                    <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="whitespace-nowrap max-w-[35px] transition-all duration-300 group-hover:max-w-[160px]">
                      <span className="inline group-hover:hidden">Chat</span>
                      <span className="hidden group-hover:inline">Open Discussion Chat</span>
                    </span>
                  </button>

                  {/* Expandable Withdraw Button */}
                  <button
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition-all duration-300 hover:bg-red-200 dark:hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10"
                  >
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap max-w-[65px] transition-all duration-300 group-hover:max-w-[150px]">
                      <span className="inline group-hover:hidden">Withdraw</span>
                      <span className="hidden group-hover:inline">Withdraw Proposal</span>
                    </span>
                  </button>
                </>
              )}

              {proposal.status === "Accepted" && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-xl">
                  <CheckCircle2 className="h-4 w-4" /> Contract Formed and Active in Escrow
                </div>
              )}
            </div>
          )}

          {/* Actions Bar for Freelancer (Applicant) */}
          {proposal.type === "sent" && (
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {proposal.status === "Approved" ? (
                <button
                  onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}/offer/${proposal.contractId}`)}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-blue-500 px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap max-w-[120px]">Review & Accept Offer</span>
                </button>
              ) : proposal.status === "Hired" ? (
                <button
                  onClick={() => navigate(`/contracts/${proposal.contractId}`)}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap max-w-[120px]">View Contract</span>
                </button>
              ) : proposal.status === "Pending" ? (
                <button
                  onClick={() => setIsWithdrawModalOpen(true)}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition-all duration-300 hover:bg-red-200 dark:hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10"
                >
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap max-w-[65px] transition-all duration-300 group-hover:max-w-[150px]">
                    <span className="inline group-hover:hidden">Withdraw</span>
                    <span className="hidden group-hover:inline">Withdraw Proposal</span>
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </div>

      </motion.div>

      {/* POPUP MODALS */}

      {/* 4. WITHDRAW MODAL */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" /> Withdraw Proposal
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Are you sure you want to withdraw this proposal?
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 rounded-xl border border-gray-100 dark:border-white/5">
                  Withdrawing your proposal will permanently cancel it and remove it from the client's inbox. This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsWithdrawModalOpen(false)}
                  disabled={isWithdrawing}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition"
                >
                  Keep Proposal
                </button>
                <button
                  onClick={handleWithdrawProposal}
                  disabled={isWithdrawing}
                  className="px-5 py-2 rounded-xl bg-red-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-red-600 transition shadow-lg shadow-red-500/20 disabled:opacity-50"
                >
                  {isWithdrawing ? "Withdrawing..." : "Yes, Withdraw"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {isAcceptConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-6 text-left my-8"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" /> Formal Contract Details
                </h3>
                <button
                  onClick={() => setIsAcceptConfirmOpen(false)}
                  className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:text-white transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* I. Parties Involved */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">I. Parties Involved</h4>
                  <div className="grid grid-cols-2 gap-4 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-4 rounded-xl border border-gray-100 dark:border-white/5">
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-semibold mb-1">CLIENT</p>
                      <p className="text-xs text-gray-900 dark:text-white font-medium">{proposal.clientName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-500 font-semibold mb-1">FREELANCER</p>
                      <p className="text-xs text-gray-900 dark:text-white font-medium">{proposal.freelancerName}</p>
                    </div>
                  </div>
                </div>

                {/* II. Scope of Work */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">II. Scope of Work</h4>
                  <div className="bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-4 rounded-xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white mb-2">{proposal.jobTitle}</p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {targetJob?.description || "Description not available. The scope is defined by the job posting and subsequent communications."}
                    </p>
                  </div>
                </div>

                {/* III. Locked Milestones */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">III. Locked Milestones</h4>
                  <div className="bg-white dark:bg-white/5 shadow-sm dark:shadow-none rounded-xl border border-gray-100 dark:border-white/5 overflow-hidden">
                    {proposal.milestones.length > 0 ? (
                      <table className="w-full text-left">
                        <thead className="border-b border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20">
                          <tr>
                            <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase">Phase</th>
                            <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase text-right">Revisions</th>
                            <th className="px-4 py-2 text-[10px] font-semibold text-gray-500 dark:text-zinc-400 uppercase text-right">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {proposal.milestones.map((m, i) => (
                            <tr key={i} className="hover:bg-white dark:bg-white/5 shadow-sm dark:shadow-none transition-colors">
                              <td className="px-4 py-2 text-xs text-gray-600 dark:text-zinc-300 font-medium">{m.name}</td>
                              <td className="px-4 py-2 text-xs text-gray-500 dark:text-zinc-400 text-right">{m.revisions}</td>
                              <td className="px-4 py-2 text-xs text-emerald-400 font-medium text-right">{m.hours}h</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-gray-200 dark:border-white/10 bg-gray-200 dark:bg-black/20">
                          <tr>
                            <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white" colSpan={3}>
                              Agreed Bid Amount: <span className="text-emerald-400">{proposal.bidAmount.toLocaleString()}</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <div className="p-4 text-xs text-gray-500 dark:text-zinc-400 text-center">No milestone phases defined.</div>
                    )}
                  </div>
                </div>

                {/* IV. Agreed TOS */}
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">IV. Agreed Terms of Service (TOS)</h4>
                  <div className="bg-gray-50 dark:bg-zinc-950 p-4 rounded-xl border border-gray-200 dark:border-white/5 space-y-2">
                    <h5 className="text-xs font-bold text-gray-900 dark:text-white">{proposal.tosTitle}</h5>
                    <p className="text-[11px] text-gray-600 dark:text-zinc-400 leading-relaxed font-mono whitespace-pre-wrap">{proposal.tosContent}</p>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox or Accepted State */}
              {proposal.status === "Hired" ? (
                <div className="pt-2">
                  <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between text-emerald-400">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-bold">You have already accepted this contract</span>
                    </div>
                  </div>
                </div>
              ) : proposal.status === "Pending" ? (
                <div className="pt-2">
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-center justify-between text-red-400">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5" />
                      <span className="text-sm font-bold">You have rejected this contract offer</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded border-2 border-white/20 bg-white dark:bg-white/5 shadow-sm dark:shadow-none peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center group-hover:border-emerald-400">
                        <Check className={`w-3.5 h-3.5 text-gray-900 dark:text-white transition-opacity ${agreedToTerms ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed flex-1">
                      <strong className="text-gray-900 dark:text-white block mb-0.5">I Agree to Platform Terms</strong>
                      I acknowledge that clicking accept forms a legally binding agreement. Escrow funds for the agreed bid will be locked into the contract, and work is expected to commence as per the stated scope and terms.
                    </div>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                {proposal.status === "Hired" ? (
                  <>
                    <button
                      onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}`)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition"
                    >
                      Return to Proposal
                    </button>
                    <button
                      onClick={() => navigate(`/contracts/${proposal.contractId}`)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Contract
                    </button>
                  </>
                ) : proposal.status === "Pending" ? (
                  <button
                    onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}`)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition"
                  >
                    Return to Proposal
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsRejectOfferModalOpen(true)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      Reject Offer
                    </button>
                    <button
                      onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}`)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition disabled:opacity-50"
                    >
                      Close & Review Later
                    </button>
                    <button
                      onClick={async () => {
                        await handleConfirmAccept();
                      }}
                      disabled={isProcessing || !agreedToTerms}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isProcessing ? "Processing..." : "Sign & Accept Contract"}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* 6. REJECT OFFER MODAL */}
        {isRejectOfferModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-3 text-red-400 pb-2 border-b border-gray-100 dark:border-white/5">
                <XCircle className="h-6 w-6" />
                <h3 className="text-lg font-bold">Reject Contract Offer</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
                You are about to reject this contract offer. You can optionally provide a reason to the client so they can send a revised offer.
              </p>
              <textarea
                value={offerRejectReason}
                onChange={(e) => setOfferRejectReason(e.target.value)}
                placeholder="Optional: Please adjust the timeline..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-red-500/50"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsRejectOfferModalOpen(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-bold text-xs hover:bg-white dark:bg-white/5 shadow-sm dark:shadow-none transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRejectOffer}
                  disabled={isProcessing || !offerRejectReason.trim()}
                  className="px-6 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-gray-900 dark:text-white font-bold text-xs shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Rejecting..." : "Reject Offer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProposalsViewDetailsAsApplicant;