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
} from "lucide-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import { JobRichText } from "../../job_components/JobRichText";

import { sampleIncomingProposals, sampleSentProposals } from "../proposals_datasets";
import { sampleJobs } from "../../job_datasets";
import type { ProposalItemData, ProposalStatus } from "../proposals_components/proposals_list";
import { CreditIcon } from "@/components/ui/credit-icon";

import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";

export const ProposalsViewDetailsAsAuthor: React.FC = () => {
  const { user } = useGlobalState();
  const theme = useGlobalState((state) => state.theme);
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { fetchProposalById, withdrawProposal, sendJobOffer, loading } = useJobs();

  const [proposal, setProposal] = useState<ProposalItemData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Decision Modal States
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [shortlistMessage, setShortlistMessage] = useState("");

  const { updateProposalStatus } = useJobs();

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [contractStartsAt, setContractStartsAt] = useState("");

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  useEffect(() => {
    const loadProposalAndWallet = async () => {
      if (!proposalId) return;
      setIsInitializing(true);
      
      try {
        const walletRes = await api.get("/api/accounts/wallet", {
          params: { type: 'account_wallets' },
        });
        setWalletBalance(walletRes.data.wallet?.balance_credits || 0);
      } catch (err) {
        console.error("Failed to fetch wallet", err);
      }
      try {
        const isIncoming = true;
        const p = await fetchProposalById(proposalId);
        
        if (p) {
          setProposal({
            id: p.proposal_id,
            jobId: p.job_id,
            jobTitle: p.job_title || "Unknown Job",
            partyName: (isIncoming ? p.freelancer_name || p.freelancer_handle : p.client_name || p.client_handle) || "Unknown",
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
    loadProposalAndWallet();
  }, [proposalId]);

  const targetJob = sampleJobs.find((j) => j.id === proposal?.jobId);

  const handleConfirmShortlist = async () => {
    if (!shortlistMessage.trim() || !proposal) return;
    
    try {
      const res = await updateProposalStatus(proposal.id, { 
        status: "Shortlisted",
        rejection_reason: shortlistMessage
      });
      if (res && res.success) {
        setProposal((prev) =>
          prev
            ? {
                ...prev,
                status: "Shortlisted",
              }
            : null
        );
        console.log(`Shortlisted ${proposal.partyName} with message: "${shortlistMessage}"`);
        setIsShortlistModalOpen(false);
        setShortlistMessage("");
      } else {
        alert("Failed to shortlist applicant");
      }
    } catch (error) {
      console.error(error);
      alert("Error shortlisting applicant");
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectionReason.trim() || !proposal) return;

    try {
      const res = await updateProposalStatus(proposal.id, {
        status: "Rejected",
        rejection_reason: rejectionReason
      });
      
      if (res && res.success) {
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
      } else {
        alert("Failed to reject applicant");
      }
    } catch (error) {
      console.error(error);
      alert("Error rejecting applicant");
    }
  };

  const handleConfirmAccept = async () => {
    if (!proposal) return;

    try {
      await sendJobOffer(
        proposal.id, 
        proposal.bidAmount, 
        contractStartsAt ? new Date(contractStartsAt).toISOString() : undefined
      );

      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: "Accepted",
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
      // Stay on the same page instead of navigating away
    } catch (err: any) {
      console.error("Failed to send job offer", err);
      const msg = err.response?.data?.message || err.message || "Unknown error";
      alert(`Failed to send job offer: ${msg}`);
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

  const handleViewProfile = (userName: string) => {
    navigate(`/profile/${encodeURIComponent(userName)}`);
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
                  onClick={() => handleViewProfile(proposerName)}
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
                          navigate(`/inbox?user=${encodeURIComponent(proposal.partyName)}`)
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
                    onClick={() => handleViewProfile(jobAuthorName)}
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
                  <div key={m.id} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-2 text-xs">
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

              {/* Option 1: PENDING STATE -> Reject, Shortlist, or Accept */}
              {proposal.status === "Pending" && (
                <>
                  {/* Expandable Reject Button */}
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-3.5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition-all duration-300 hover:bg-red-200 dark:hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10"
                  >
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap max-w-[45px] transition-all duration-300 group-hover:max-w-[150px]">
                      <span className="inline group-hover:hidden">Reject</span>
                      <span className="hidden group-hover:inline">Reject Proposal</span>
                    </span>
                  </button>

                  {/* Expandable Shortlist Button */}
                  <button
                    onClick={() => setIsShortlistModalOpen(true)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-100 dark:bg-blue-500/10 px-4 py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 transition-all duration-300 hover:bg-blue-200 dark:hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <UserCheck className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap max-w-[60px] transition-all duration-300 group-hover:max-w-[160px]">
                      <span className="inline group-hover:hidden">Shortlist</span>
                      <span className="hidden group-hover:inline">Mark as Shortlist</span>
                    </span>
                  </button>

                  {/* Expandable Accept Button */}
                  <button
                    onClick={() => setIsAcceptConfirmOpen(true)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap max-w-[50px] transition-all duration-300 group-hover:max-w-[220px]">
                      <span className="inline group-hover:hidden">Accept</span>
                      <span className="hidden group-hover:inline">Accept Proposal</span>
                    </span>
                  </button>
                </>
              )}

              {/* Option 2: SHORTLISTED STATE -> Reject, Accept, or Chat */}
              {proposal.status === "Shortlisted" && (
                <>
                  {/* Expandable Reject Button */}
                  <button
                    onClick={() => setIsRejectModalOpen(true)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10 px-3.5 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition-all duration-300 hover:bg-red-200 dark:hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/10"
                  >
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap max-w-[45px] transition-all duration-300 group-hover:max-w-[150px]">
                      <span className="inline group-hover:hidden">Reject</span>
                      <span className="hidden group-hover:inline">Reject Proposal</span>
                    </span>
                  </button>

                  {/* Expandable Chat Button */}
                  <button
                    onClick={() =>
                      navigate(`/inbox?user=${encodeURIComponent(proposal.partyName)}`)
                    }
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none px-3.5 py-2.5 text-xs font-semibold text-gray-600 dark:text-zinc-300 transition-all duration-300 hover:bg-gray-100 dark:bg-white/10 hover:text-gray-900 dark:text-white"
                  >
                    <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="whitespace-nowrap max-w-[35px] transition-all duration-300 group-hover:max-w-[160px]">
                      <span className="inline group-hover:hidden">Chat</span>
                      <span className="hidden group-hover:inline">Open Discussion Chat</span>
                    </span>
                  </button>

                  {/* Expandable Accept Button */}
                  <button
                    onClick={() => setIsAcceptConfirmOpen(true)}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap max-w-[50px] transition-all duration-300 group-hover:max-w-[220px]">
                      <span className="inline group-hover:hidden">Accept</span>
                      <span className="hidden group-hover:inline">Accept Proposal & Form Contract</span>
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
        </div>

      </motion.div>

      {/* POPUP MODALS */}

      {/* 1. SHORTLIST MODAL */}
      <AnimatePresence>
        {isShortlistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-400" /> Shortlist Candidate
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Send a direct discussion message to <strong className="text-gray-900 dark:text-white">{proposal.partyName}</strong> before shortlisting.
                </p>
              </div>

              <textarea
                rows={4}
                placeholder="Hi! We loved your proposal and milestone breakdown. Let's discuss timeline specifics..."
                value={shortlistMessage}
                onChange={(e) => setShortlistMessage(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500/50 transition resize-y"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsShortlistModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmShortlist}
                  disabled={!shortlistMessage.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-blue-600 disabled:opacity-50 transition shadow-lg shadow-blue-500/20"
                >
                  Send & Shortlist
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. REJECT MODAL */}
      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" /> Reject Proposal
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Provide a brief rejection rationale for <strong className="text-gray-900 dark:text-white">{proposal.partyName}</strong>.
                </p>
              </div>

              <textarea
                rows={3}
                placeholder="e.g., Target timeline does not match our launch date..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-red-500/50 transition resize-y"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 rounded-xl bg-red-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-red-600 disabled:opacity-50 transition shadow-lg shadow-red-500/20"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ACCEPT CONFIRMATION MODAL */}
      <AnimatePresence>
        {isAcceptConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Confirm Proposal Acceptance
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Are you sure you want to accept this proposal by <strong className="text-gray-900 dark:text-white">{proposal.partyName}</strong>?
                </p>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 rounded-xl border border-gray-100 dark:border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="block mb-1 text-gray-500 dark:text-zinc-400">Agreed Bid: <strong className="text-gray-900 dark:text-white text-xs">{proposal.bidAmount.toLocaleString()}</strong></span>
                    <span className="block mb-1 text-gray-500 dark:text-zinc-400 text-[10px]">Available Balance: <strong className={walletBalance >= proposal.bidAmount ? "text-emerald-400" : "text-red-400"}>{walletBalance.toLocaleString()}</strong></span>
                  </div>
                  Accepting will automatically form a binding escrow contract for the agreed bid across {proposal.milestones.length} milestone phases.
                </p>
                <div className="pt-2">
                  <label className="text-xs font-medium text-gray-500 dark:text-zinc-400">Contract Start Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={contractStartsAt}
                    onChange={(e) => setContractStartsAt(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm dark:shadow-none p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500/50 transition"
                  />
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1">If left empty, contract starts immediately after applicant accepts.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAcceptConfirmOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:text-white transition disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  onClick={handleConfirmAccept}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-xs font-bold text-gray-900 dark:text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Yes, Form Contract"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProposalsViewDetailsAsAuthor;