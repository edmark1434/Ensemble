import React, { useState, useEffect } from "react";
import api from "@/lib/axios";
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
  Check,
  TrendingUp,
  Users,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  ListTodo,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Shield,
  Film,
  Play,
  Eye,
  Download,
  Image as ImageIcon,
  X,
  Paperclip
} from "lucide-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import useGlobalState from "@/lib/global_state";
import { JobRichText } from "../../job_components/JobRichText";
import { toast } from "react-hot-toast";
import { showErrorToast } from "@/components/utility/toast";
import { sampleIncomingProposals, sampleSentProposals } from "../proposals_datasets";
import { sampleJobs } from "../../job_datasets";
import type { ProposalItemData, ProposalStatus } from "../proposals_components/proposals_list";
import { CreditIcon } from "@/components/ui/credit-icon";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import { Profile_Portfolio, type PortfolioItem } from "@/pages/user/7_profile/Displays/Body/Profile_Portfolio";
import { Profile_Gallery } from "@/pages/user/7_profile/Displays/Body/Profile_Gallery";

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

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewItem, setPreviewItem] = useState<{
    url: string;
    name: string;
    type: "video" | "image" | "pdf" | "other";
  } | null>(null);

  const getCleanFileName = (rawName: string): string => {
    if (!rawName) return "Work Sample";
    if (rawName.length > 28) {
      const extIndex = rawName.lastIndexOf(".");
      const ext = extIndex !== -1 ? rawName.slice(extIndex) : "";
      const base = extIndex !== -1 ? rawName.slice(0, extIndex) : rawName;
      return `${base.slice(0, 14)}...${base.slice(-6)}${ext}`;
    }
    return rawName;
  };
  const [isJobDescriptionExpanded, setIsJobDescriptionExpanded] = useState(false);

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
            clientTeamId: p.client_team_id || undefined,
            freelancerTeamId: p.freelancer_team_id || undefined,
            clientTeamVisibility: p.client_team_visibility || undefined,
            freelancerTeamVisibility: p.freelancer_team_visibility || undefined,
            clientName: p.client_name || p.client_handle || "Unknown Client",
            clientAvatar: p.client_avatar_path
              ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.client_avatar_path.startsWith('/') ? '' : '/'}${p.client_avatar_path}`
              : undefined,
            freelancerName: p.freelancer_name || p.freelancer_handle || "Unknown Freelancer",
            freelancerAvatar: p.freelancer_avatar_path
              ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.freelancer_avatar_path.startsWith('/') ? '' : '/'}${p.freelancer_avatar_path}`
              : undefined,
            jobBanner: p.job_thumbnail_path
              ? `${import.meta.env.VITE_CLOUDFRONT_URL}${p.job_thumbnail_path.startsWith('/') ? '' : '/'}${p.job_thumbnail_path}`
              : undefined,
            rating: p.freelancer_rating != null ? Number(p.freelancer_rating) : 5.0,
            bidAmount: parseFloat(p.rate_credits) || 0,
            additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
            coverLetter: p.letter || "",
            tosContent: p.terms_content || "No terms content available",
            tosTitle: p.terms_title || "Standard Terms",
            tosDescription: p.terms_type || "No description provided",
            submittedAt: new Date(p.created_at).toLocaleDateString(),
            submittedAgo: "Recently",
            jobPostedAt: p.job_created_at ? new Date(p.job_created_at).toLocaleDateString() : "N/A",
      totalApplicants: parseInt(p.total_applicants) || 0,
      avgBid: parseFloat(p.avg_bid) || 0,
            jobStatus: p.job_status,
            jobDeletedAt: p.job_deleted_at,
            jobDescription: p.job_description,
            jobHiringType: p.job_hiring_type || (p.job_milestone_id ? "multiple" : "single"),
            status: p.status,
            type: isIncoming ? "incoming" : "sent",
            rejectionReason: p.reject_reason,
            job_milestone_id: p.job_milestone_id,
            target_milestone_title: p.target_milestone_title,
            target_milestone_description: p.target_milestone_description,
            target_milestone_tasks: Array.isArray(p.target_milestone_tasks)
              ? p.target_milestone_tasks
              : (typeof p.target_milestone_tasks === "string" ? JSON.parse(p.target_milestone_tasks || "[]") : []),
            target_milestone_budget: p.target_milestone_budget ? parseFloat(p.target_milestone_budget) : undefined,
            target_milestone_slots: p.target_milestone_slots ? parseInt(p.target_milestone_slots, 10) : undefined,
            viewedAt: p.viewed_at,
            shortlistedAt: p.shortlisted_at,
            attachments: Array.isArray(p.attachments) ? p.attachments : [],
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

          try {
            const attachmentsResponse = await api.get(`/api/accounts/profile/${p.freelancer_account_id}/attachments`);
            const items = (attachmentsResponse.data?.attachments || []).map((att: any) => {
              const cloudfront = import.meta.env.VITE_CLOUDFRONT_URL || '';
              const path = att.file_path || '';
              const fileUrl = path ? `${cloudfront}${path.startsWith('/') ? '' : '/'}${path}` : undefined;
              return {
                id: String(att.account_attachment_id || att.file_id || Math.random()),
                type: att.attachment_kind === "link" ? "link" : "document",
                title: att.name || "Attachment",
                description: att.description || (att.attachment_kind === "link" ? att.external_url : att.file_name || "PDF document"),
                fileUrl: fileUrl,
                externalUrl: att.external_url || undefined,
                createdAt: att.created_at
              };
            });
            setPortfolioItems(items);
          } catch (e: any) {
            console.error("Failed to load portfolio items", e);
            // @ts-ignore
            window.alert("Error fetching portfolio items: " + (e?.message || "Unknown error"));
          }
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
      toast.success("You have successfully accepted the job offer!");
      setIsAcceptConfirmOpen(false);
      navigate("/contracts");
    } catch (error: any) {
      console.error("Failed to accept offer:", error);
      showErrorToast(error.response?.data?.message || "Failed to accept offer.");
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
      showErrorToast(error.response?.data?.message || "Failed to reject offer.");
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

  const handleViewProfile = (accountId?: string, teamId?: string) => {
    if (teamId) {
      navigate(`/teams/${encodeURIComponent(teamId)}`);
      return;
    }
    if (accountId) navigate(`/profile/${encodeURIComponent(accountId)}`);
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
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white overflow-x-clip pt-6 pb-40">
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
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Applicant
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-bold">
                        <Star className="h-3.5 w-3.5 fill-yellow-500" />
                        {proposal.rating != null ? Number(proposal.rating).toFixed(1) : "5.0"}
                      </span>
                      <span>•</span>
                      <span className="text-gray-600 dark:text-zinc-300">Freelancer Rating</span>
                    </div>
                  </div>
                </div>

                {!(proposal.freelancerTeamId && proposal.freelancerTeamVisibility?.toLowerCase() === "private") && (
                  <button
                    onClick={() => handleViewProfile(proposal.freelancerAccountId, proposal.freelancerTeamId)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white transition shrink-0"
                  >
                    <User className="h-3.5 w-3.5 text-emerald-400" />
                    <span>
                      {proposal.freelancerTeamId
                        ? "View Team Profile"
                        : proposal.type === "sent"
                        ? "View Your Profile"
                        : "View Applicant Profile"}
                    </span>
                  </button>
                )}
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
                          ? "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                          : proposal.status === "Shortlisted"
                          ? "bg-blue-100 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400"
                          : proposal.status === "Rejected"
                          ? "bg-red-100 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400"
                          : "bg-yellow-100 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/30 text-yellow-700 dark:text-yellow-400"
                      }`}
                    >
                      {proposal.status}
                    </span>
                  </div>
                </div>

                {proposal.jobBanner && (
                  <div className="relative w-full h-28 rounded-xl overflow-hidden shadow-sm mt-3 border border-gray-100 dark:border-white/5">
                    <img src={proposal.jobBanner} className="w-full h-full object-cover" alt="Job Cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between p-3">
                      <h3 className="text-sm font-bold text-white truncate flex items-center gap-2 drop-shadow-md">
                        <Briefcase className="h-4 w-4 text-blue-300 shrink-0" />
                        {proposal.jobTitle}
                      </h3>
                      <button
                        onClick={handleViewTargetJob}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white/90 hover:text-white backdrop-blur-sm transition shrink-0"
                        title="View Target Job Post"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {!proposal.jobBanner && (
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
                )}

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

                  {!(proposal.clientTeamId && proposal.clientTeamVisibility?.toLowerCase() === "private") && (
                    <button
                      onClick={() => handleViewProfile(proposal.clientAccountId, proposal.clientTeamId)}
                      className="px-2.5 py-1 text-[10px] font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:text-white bg-white dark:bg-white/5 shadow-sm dark:shadow-none hover:bg-gray-100 dark:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition shrink-0 flex items-center gap-1"
                    >
                      <User className="h-3 w-3 text-blue-400" />
                      <span>
                        {proposal.clientTeamId
                          ? "View Team Profile"
                          : proposal.type === "incoming"
                          ? "View Your Profile"
                          : "View Client Profile"}
                      </span>
                    </button>
                  )}
                </div>

                {/* Explicit Timestamps */}
                <div 
                  className="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-500 dark:text-zinc-400"
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-500 dark:text-zinc-500" /> Job Posted Date:
                    </span>
                    <strong className="text-gray-700 dark:text-zinc-300 font-semibold text-xs tracking-tight">{proposal.jobPostedAt}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                      <Send className="h-3 w-3 text-blue-400" /> Proposal Sent Date:
                    </span>
                    <strong className="text-gray-700 dark:text-zinc-300 font-semibold text-xs tracking-tight">{proposal.submittedAt} ({proposal.submittedAgo || "Recently"})</strong>
                  </div>

                  {proposal.updatedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-zinc-500 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-emerald-400" /> Last Proposal Update:
                      </span>
                      <strong className="text-blue-500 dark:text-blue-400 font-semibold text-xs tracking-tight">{proposal.updatedAt} ({proposal.updatedAgo || ""})</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Micro-Status & Read Receipt Progression (3.B) */}
              <div className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                    Application Status & Read Receipts
                  </span>
                  {proposal.viewedAt ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      ✓ Client Viewed Proposal
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                      Delivered (Pending Client Review)
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs gap-1 sm:gap-2 pt-1">
                  <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Submitted</span>
                  </div>
                  <div className="h-0.5 flex-1 bg-emerald-500/40 rounded-full" />
                  <div className={`flex items-center gap-1 font-semibold ${proposal.viewedAt ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-zinc-500"}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{proposal.viewedAt ? "Viewed" : "Unread"}</span>
                  </div>
                  <div className={`h-0.5 flex-1 rounded-full ${proposal.shortlistedAt || proposal.status === "Shortlisted" || proposal.status === "Accepted" || proposal.status === "Hired" ? "bg-amber-500/40" : "bg-gray-200 dark:bg-white/10"}`} />
                  <div className={`flex items-center gap-1 font-semibold ${proposal.shortlistedAt || proposal.status === "Shortlisted" || proposal.status === "Accepted" || proposal.status === "Hired" ? "text-amber-500" : "text-gray-400 dark:text-zinc-500"}`}>
                    <Star className={`w-3.5 h-3.5 shrink-0 ${proposal.shortlistedAt || proposal.status === "Shortlisted" ? "fill-amber-500 text-amber-500" : ""}`} />
                    <span>Shortlisted</span>
                  </div>
                  <div className={`h-0.5 flex-1 rounded-full ${proposal.status === "Accepted" || proposal.status === "Hired" ? "bg-emerald-500/40" : "bg-gray-200 dark:bg-white/10"}`} />
                  <div className={`flex items-center gap-1 font-semibold ${proposal.status === "Accepted" || proposal.status === "Hired" ? "text-emerald-500" : proposal.status === "Rejected" ? "text-red-500" : "text-gray-400 dark:text-zinc-500"}`}>
                    {proposal.status === "Accepted" || proposal.status === "Hired" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    ) : proposal.status === "Rejected" ? (
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center text-[9px] font-bold">✕</span>
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-zinc-600 flex items-center justify-center text-[8px]">4</span>
                    )}
                    <span>{proposal.status === "Accepted" || proposal.status === "Hired" ? "Hired" : proposal.status === "Rejected" ? "Not Selected" : "Offer / Hire"}</span>
                  </div>
                </div>
              </div>

              {/* Financial Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02]">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Proposed Bid</span>
                  <div className="text-base font-extrabold text-amber-500 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                    <CreditIcon className="h-4 w-4" /> {proposal.bidAmount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1 block">
                    You earn <strong className="text-gray-600 dark:text-zinc-400">{(Math.floor(proposal.bidAmount * 0.9)).toLocaleString()}</strong> (-10% platform fee)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Additional Work Rate</span>
                  <p className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1 mt-1">
                    +{proposal.additionalWorkRate}% / Extra Pass
                  </p>
                  <div className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1 space-y-0.5">
                    <div>Charge <strong className="text-amber-500 dark:text-amber-400">+{addedOverageAmount.toLocaleString()}</strong> / extra pass</div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-gray-600 dark:text-zinc-400 font-bold">Earn {(Math.floor(addedOverageAmount * 0.9)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase block">Milestone Count</span>
                  <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1 mt-1">
                    <Layers className="h-3.5 w-3.5 text-emerald-400" /> {proposal.milestones.length} Steps
                  </p>
                  <span className="text-[10px] text-gray-500 dark:text-zinc-500 mt-1 block">
                    {totalHours}h Total Estimated Hours
                  </span>
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

            {/* Attached Work Samples & Demos */}
            {proposal.attachments && proposal.attachments.length > 0 && (
              <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-4 mt-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-blue-500" />
                    Attached Work Samples & Demos ({proposal.attachments.length})
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">Click to preview</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {proposal.attachments.map((att: any, idx: number) => {
                    const downloadUrl = att.path?.startsWith("http")
                      ? att.path
                      : `${import.meta.env.VITE_CLOUDFRONT_URL || ""}/${att.path?.startsWith("/") ? att.path.slice(1) : att.path}`;
                    const mime = (att.mime_type || "").toLowerCase();
                    const name = att.name || `Sample_${idx + 1}`;
                    const ext = name.split(".").pop()?.toLowerCase() || "";
                    const isVideo = mime.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext);
                    const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
                    const isPdf = mime === "application/pdf" || ext === "pdf";
                    const isZip = mime.includes("zip") || ext === "zip";

                    const cleanName = getCleanFileName(name);
                    const sizeStr = att.size_bytes ? `${(att.size_bytes / 1024 / 1024).toFixed(1)} MB` : "";

                    return (
                      <div
                        key={idx}
                        className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] overflow-hidden hover:border-blue-500/40 transition-all flex flex-col justify-between group shadow-xs"
                      >
                        {/* Media Preview Box */}
                        {isVideo ? (
                          <div
                            onClick={() => setPreviewItem({ url: downloadUrl, name, type: "video" })}
                            className="relative h-32 bg-black flex items-center justify-center cursor-pointer overflow-hidden group/video"
                          >
                            <video
                              src={downloadUrl}
                              preload="metadata"
                              className="w-full h-full object-cover opacity-65 group-hover/video:opacity-85 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                              <div className="w-11 h-11 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover/video:scale-110 transition-transform">
                                <Play className="w-5 h-5 fill-white ml-0.5" />
                              </div>
                            </div>
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white shadow-xs">
                              VIDEO DEMO
                            </span>
                          </div>
                        ) : isImage ? (
                          <div
                            onClick={() => setPreviewItem({ url: downloadUrl, name, type: "image" })}
                            className="relative h-32 bg-gray-100 dark:bg-white/5 flex items-center justify-center cursor-pointer overflow-hidden group/img"
                          >
                            <img
                              src={downloadUrl}
                              alt={name}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white shadow-xs">
                              IMAGE
                            </span>
                          </div>
                        ) : isPdf ? (
                          <div
                            onClick={() => setPreviewItem({ url: downloadUrl, name, type: "pdf" })}
                            className="h-32 bg-red-500/5 dark:bg-red-500/10 flex flex-col items-center justify-center gap-1.5 cursor-pointer border-b border-gray-200 dark:border-white/10 group/pdf"
                          >
                            <FileText className="w-8 h-8 text-red-500 group-hover/pdf:scale-110 transition-transform" />
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400">PDF DOCUMENT</span>
                          </div>
                        ) : (
                          <div
                            onClick={() => window.open(downloadUrl, "_blank")}
                            className="h-32 bg-blue-500/5 dark:bg-blue-500/10 flex flex-col items-center justify-center gap-1.5 cursor-pointer border-b border-gray-200 dark:border-white/10"
                          >
                            <FileText className="w-8 h-8 text-blue-500" />
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                              {isZip ? "ZIP ARCHIVE" : "ATTACHED FILE"}
                            </span>
                          </div>
                        )}

                        {/* Card Meta / Actions */}
                        <div className="p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-white truncate block flex-1" title={name}>
                              {cleanName}
                            </span>
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="text-gray-400 hover:text-blue-500 transition-colors p-0.5"
                              title="Download Raw File"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400">
                            <span>{sizeStr || ext.toUpperCase()}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isVideo) setPreviewItem({ url: downloadUrl, name, type: "video" });
                                else if (isImage) setPreviewItem({ url: downloadUrl, name, type: "image" });
                                else if (isPdf) setPreviewItem({ url: downloadUrl, name, type: "pdf" });
                                else window.open(downloadUrl, "_blank");
                              }}
                              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> Preview
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Attachments Portfolio */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-6 mt-6">
              <Profile_Portfolio 
                portfolioItems={portfolioItems} 
                isOwner={false} 
              />
            </div>

            {/* Competitive Insights */}
            <div className="rounded-3xl border border-blue-500/20 bg-blue-50 dark:bg-blue-500/5 p-6 backdrop-blur-xl shadow-sm space-y-3 mt-6">
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" /> Competitive Insights
              </h3>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-blue-500/70 font-semibold uppercase">Total Applicants</p>
                  <p className="text-lg font-extrabold text-blue-700 dark:text-blue-300">{proposal.totalApplicants || 0}</p>
                </div>
                <div>
                  <p className="text-[10px] text-blue-500/70 font-semibold uppercase">Avg. Bid</p>
                  <div className="text-lg font-extrabold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                    <CreditIcon className="h-4 w-4" /> {(proposal.avgBid || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-300/80 leading-relaxed pt-2 border-t border-blue-500/10">
                Your bid is highly competitive. Clients viewing this job prefer comprehensive milestone breakdowns.
              </p>
            </div>


          </div>

          {/* ================= RIGHT COLUMN (5/12) ================= */}
          <div className="lg:col-span-5 space-y-6">

            {/* SECTION 3: Milestone Roadmap / Selected Team Milestone Role */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-emerald-400" />
                  {proposal.target_milestone_title || proposal.job_milestone_id
                    ? "Selected Milestone for Team Proposal View"
                    : "Milestone Roadmap"}
                </h3>
                <span className="text-xs font-mono text-gray-500 dark:text-zinc-400">{totalHours}h Total</span>
              </div>

              {(proposal.target_milestone_title || proposal.job_milestone_id) && (
                <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/[0.04] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 mb-1.5">
                        Team Role Milestone
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        {proposal.target_milestone_title || "Designated Team Role"}
                      </h4>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-extrabold text-green-600 dark:text-green-400 flex items-center justify-end">
                        <CreditIcon className="h-3.5 w-3.5 text-yellow-500 inline mr-1 shrink-0" />
                        {(proposal.target_milestone_budget || proposal.bidAmount).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400 block">Fixed Role Budget</span>
                    </div>
                  </div>
                  {proposal.target_milestone_description && (
                    <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                      {proposal.target_milestone_description}
                    </p>
                  )}
                  {(proposal.target_milestone_slots || proposal.target_milestone_duration_hours) && (
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-purple-500/10 text-[11px] font-semibold">
                      {proposal.target_milestone_slots && (
                        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                          <Users className="h-3.5 w-3.5" />
                          <span>Role Slots Allocation: {proposal.target_milestone_slots} slot{proposal.target_milestone_slots > 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {proposal.target_milestone_duration_hours && (
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                          <Clock className="h-3.5 w-3.5 text-purple-500" />
                          <span>Milestone Timeline: {proposal.target_milestone_duration_hours} hrs (~{(proposal.target_milestone_duration_hours / 24).toFixed(1)} days)</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {proposal.milestones && proposal.milestones.length > 0 ? (
                  proposal.milestones.map((m, idx) => (
                    <div key={m.id || idx} className="p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.02] space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                        <span>Step {idx + 1}: {m.name}</span>
                        <div className="flex flex-col items-end">
                          <span className="text-amber-500 dark:text-amber-400 font-mono flex items-center">
                            <CreditIcon className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 inline mr-1 shrink-0" />
                            {milestonePayout.toLocaleString()}
                          </span>
                          <span className="text-[9px] text-gray-600 dark:text-zinc-400">Net: {(Math.floor(milestonePayout * 0.9)).toLocaleString()}</span>
                        </div>
                      </div>

                      {m.description && <p className="text-gray-500 dark:text-zinc-400 text-[11px] leading-relaxed">{m.description}</p>}

                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-500 dark:text-zinc-500 pt-2 border-t border-gray-100 dark:border-white/5">
                        <span>Est. Hours: <strong className="text-gray-600 dark:text-zinc-300">{m.hours} hrs</strong></span>
                        <span className="flex items-center gap-1">
                          <RefreshCcw className="h-2.5 w-2.5 text-emerald-400" /> Revisions: <strong className="text-gray-600 dark:text-zinc-300">{m.revisions} pass</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          Added Overage Rate:
                          <strong className="text-amber-500 dark:text-amber-400 font-mono flex items-center">
                            +<CreditIcon className="h-3 w-3 text-amber-500 dark:text-amber-400 inline mx-0.5 shrink-0" />
                            {addedOverageAmount.toLocaleString()} (+{proposal.additionalWorkRate}%)
                          </strong>
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  proposal.target_milestone_title ? (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 italic p-3 text-center">
                      Execution milestones are mapped to the designated milestone role deliverables above.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 italic p-3 text-center">
                      No additional milestone steps provided.
                    </p>
                  )
                )}
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

            {/* Attachments Gallery */}
            <div className="rounded-3xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 backdrop-blur-xl shadow-2xl space-y-6 mt-6">
              <Profile_Gallery 
                accountId={proposal?.freelancerAccountId || ""} 
                isOwner={false} 
              />
            </div>

          </div>
        </div>

        {/* ================= SECTION 5: EXPANDABLE HOVER DECISION CONTROLS (BOTTOM) ================= */}
        <div className="sticky bottom-6 z-40 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-dark-surface/90 p-4 md:px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-2xl backdrop-blur-xl mt-8 w-full transition-all">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider hidden sm:flex items-center gap-1.5">
                Decision & Action Controls
              </h3>
              <span className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">Current Status: {proposal.status}</span>
            </div>

            {/* Actions Bar for Client */}
            {proposal.type === "incoming" && (
              <div className="flex flex-wrap items-center justify-end gap-2">

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

          {proposal.status === "Rejected" && proposal.rejectionReason && (
            <div className="mt-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-xs space-y-1">
              <span className="font-bold text-red-400 uppercase flex items-center gap-1 text-[10px]">
                <ShieldAlert className="h-3.5 w-3.5" /> Rejection Rationale
              </span>
              <p className="text-gray-600 dark:text-zinc-300">{proposal.rejectionReason}</p>
            </div>
          )}
        </div>
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
        {isAcceptConfirmOpen && proposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-3xl rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#12141a] p-5 sm:p-7 shadow-2xl space-y-6 text-left my-6 overflow-hidden font-['Plus_Jakarta_Sans']"
            >
              {/* Header with Badges */}
              <div className="flex items-start justify-between border-b border-zinc-200 dark:border-white/10 pb-4">
                <div className="space-y-2 text-left">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <FileCheck2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">
                        Formal Contract Offer
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Binding milestone escrow agreement extended for your review and execution
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 flex items-center gap-1">
                      {proposal.jobHiringType === 'multiple' || proposal.target_milestone_title ? (
                        <>
                          <Users className="h-3 w-3" /> Team Milestone Job
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3" /> Individual Freelancer Job
                        </>
                      )}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Fixed Price Escrow Protected
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 flex items-center gap-1">
                      <Clock className="h-3 w-3 animate-pulse" /> Pending Your Signature
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(-1)}
                  className="rounded-xl p-1.5 text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition"
                  title="Close Modal"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Escrow & Delivery Hero Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/5">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Agreed Escrow Payout
                  </span>
                  <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-black text-xl">
                    <CreditIcon className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>{proposal.bidAmount.toLocaleString()} Credits</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block">
                    Held securely in platform escrow
                  </span>
                </div>

                <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-white/5 pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Milestone Phases
                  </span>
                  <p className="text-zinc-900 dark:text-zinc-100 font-extrabold text-sm pt-0.5">
                    {proposal.milestones.length > 0 ? `${proposal.milestones.length} Phase${proposal.milestones.length > 1 ? 's' : ''}` : 'Single Phase Delivery'}
                  </p>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block">
                    Sequential verification &amp; release
                  </span>
                </div>

                <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-white/5 pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    Assigned Position
                  </span>
                  <p className="text-zinc-900 dark:text-zinc-100 font-extrabold text-sm pt-0.5 truncate">
                    {proposal.target_milestone_title || "Full Job Scope"}
                  </p>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold block">
                    {proposal.target_milestone_tasks?.length ? `${proposal.target_milestone_tasks.length} Deliverable tasks` : "Deliverables defined below"}
                  </span>
                </div>
              </div>

              {/* Scrollable Agreement Body */}
              <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* I. PARTIES INVOLVED */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>I. Parties Involved</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-zinc-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      {proposal.clientAvatar ? (
                        <img src={proposal.clientAvatar} alt="" className="h-11 w-11 rounded-full object-cover border-2 border-purple-500/40 shrink-0" />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-bold text-sm flex items-center justify-center shrink-0 border border-purple-500/30">
                          {proposal.clientName?.charAt(0) || "C"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                          Client (Hirer)
                        </span>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate mt-1">
                          {proposal.clientName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {proposal.freelancerAvatar ? (
                        <img src={proposal.freelancerAvatar} alt="" className="h-11 w-11 rounded-full object-cover border-2 border-emerald-500/40 shrink-0" />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-500/30">
                          {proposal.freelancerName?.charAt(0) || "F"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          Freelancer (Contractor)
                        </span>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate mt-1">
                          {proposal.freelancerName}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* II. SCOPE OF WORK */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      II. Scope of Work &amp; Assignment
                    </h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {proposal.jobHiringType === 'multiple' || proposal.target_milestone_title ? 'Team Position Scope' : 'Standard Scope'}
                    </span>
                  </div>

                  <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/10 space-y-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                        Job Posting Title
                      </span>
                      <p className="text-sm font-extrabold text-zinc-900 dark:text-white leading-snug">
                        {proposal.jobTitle}
                      </p>
                    </div>

                    {/* Assigned Milestone Box if team project */}
                    {(proposal.jobHiringType === 'multiple' || proposal.target_milestone_title) && (
                      <div className="p-4 rounded-2xl bg-purple-500/5 dark:bg-purple-500/10 border-2 border-purple-500/25 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <Layers className="h-3.5 w-3.5" /> Assigned Milestone Role
                            </span>
                            <p className="text-sm font-black text-zinc-900 dark:text-white">
                              {proposal.target_milestone_title || "Designated Team Role"}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Role Assignment
                          </span>
                        </div>

                        {proposal.target_milestone_description && (
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {proposal.target_milestone_description}
                          </p>
                        )}

                        {proposal.target_milestone_tasks && proposal.target_milestone_tasks.length > 0 && (
                          <div className="pt-2.5 border-t border-purple-500/20 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                              <ListTodo className="h-3.5 w-3.5" />
                              Assigned Deliverables / Tasks Checklist ({proposal.target_milestone_tasks.length})
                            </span>
                            <div className="grid gap-1.5">
                              {proposal.target_milestone_tasks.map((task: string, tIdx: number) => (
                                <div
                                  key={tIdx}
                                  className="flex items-center gap-2.5 text-xs text-zinc-800 dark:text-zinc-200 bg-white dark:bg-[#1a1d24] p-2.5 rounded-xl border border-purple-500/15 shadow-2xs font-medium"
                                >
                                  <div className="h-4 w-4 rounded-full bg-purple-100 dark:bg-purple-950 border border-purple-400 dark:border-purple-600 flex items-center justify-center shrink-0 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                    ✓
                                  </div>
                                  <span className="leading-snug flex-1 font-semibold">{task}</span>
                                  <span className="text-[10px] text-zinc-400 font-medium">Required Deliverable</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Job Post Description with clean collapse */}
                    <div>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                        Full Job Post Brief
                      </span>
                      <div className="relative">
                        <div className={`text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap ${!isJobDescriptionExpanded ? 'max-h-24 overflow-hidden' : ''}`}>
                          {proposal.jobDescription || targetJob?.description || "Description not available. The scope is defined by the job posting and subsequent communications."}
                        </div>
                        {((proposal.jobDescription || targetJob?.description || "").length > 200) && (
                          <button
                            type="button"
                            onClick={() => setIsJobDescriptionExpanded(!isJobDescriptionExpanded)}
                            className="mt-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <span>{isJobDescriptionExpanded ? "Show less" : "Show full project description"}</span>
                            {isJobDescriptionExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* III. LOCKED MILESTONES & SCHEDULE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      III. Locked Milestones &amp; Schedule
                    </h4>
                    {(proposal.jobHiringType === 'multiple' || proposal.target_milestone_title) && (
                      <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                        (Showing deliverables for your assigned role)
                      </span>
                    )}
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/[0.02] rounded-2xl border border-zinc-200 dark:border-white/10 overflow-hidden">
                    {proposal.milestones.length > 0 ? (
                      <table className="w-full text-left">
                        <thead className="border-b border-zinc-200 dark:border-white/10 bg-zinc-100/70 dark:bg-white/[0.04]">
                          <tr>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Phase / Deliverable</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase text-center">Revisions</th>
                            <th className="px-4 py-2.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase text-right">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                          {proposal.milestones.map((m, i) => (
                            <tr key={i} className="hover:bg-white dark:hover:bg-white/5 transition-colors">
                              <td className="px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 font-semibold">{m.name}</td>
                              <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 text-center">{m.revisions} pass{m.revisions === 1 ? '' : 'es'}</td>
                              <td className="px-4 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold text-right">{m.hours}h</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-zinc-200 dark:border-white/10 bg-zinc-100/50 dark:bg-white/[0.02]">
                          <tr>
                            <td className="px-4 py-3 text-xs font-bold text-zinc-900 dark:text-white" colSpan={3}>
                              <div className="flex items-center justify-between">
                                <span>Total Committed Escrow:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 text-sm font-black flex items-center gap-1.5">
                                  <CreditIcon className="h-4 w-4 text-amber-500" />
                                  {proposal.bidAmount.toLocaleString()} Credits
                                </span>
                              </div>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    ) : (
                      <div className="p-4 text-xs text-zinc-600 dark:text-zinc-300 text-center">
                        Single Phase Delivery &bull; Agreed Escrow: <strong className="text-amber-500">{proposal.bidAmount.toLocaleString()} Credits</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* IV. AGREED TERMS OF SERVICE */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      IV. Agreed Terms of Service (TOS)
                    </h4>
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-white/5">
                      Preset: {proposal.tosTitle}
                    </span>
                  </div>
                  <div className="bg-zinc-50 dark:bg-white/[0.02] p-4 rounded-2xl border border-zinc-200 dark:border-white/10">
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed font-mono whitespace-pre-wrap max-h-36 overflow-y-auto thin-scrollbar">
                      {proposal.tosContent}
                    </div>
                  </div>
                </div>

                {/* V. WORKFLOW & PLATFORM GUARANTEES */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    V. Workflow &amp; Platform Protections
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>5-Day Inaction Approval</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Clients have 5 days to review submitted deliverables. If inactive, the milestone automatically approves and escrow releases.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                        <Shield className="h-4 w-4 text-blue-500 shrink-0" />
                        <span>Protected Escrow Guarantee</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        100% of milestone funds are held in platform escrow prior to work commencement, ensuring guaranteed payouts upon delivery.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Confidentiality (NDA)</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Protected project scope and confidential asset handling guidelines apply during development.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50/70 dark:bg-white/[0.02] space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Portfolio Rights</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Freelancers are permitted to showcase completed work in their platform portfolio following project sign-off.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox or Accepted State */}
              {proposal.status === "Hired" ? (
                <div className="pt-2">
                  <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold">You have accepted this contract offer</span>
                    </div>
                  </div>
                </div>
              ) : proposal.status === "Pending" ? (
                <div className="pt-2">
                  <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 flex items-center justify-between text-red-600 dark:text-red-400">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold">You have declined this contract offer</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl border-2 border-emerald-500/30 dark:border-emerald-500/20 bg-emerald-500/5">
                  <label className="flex items-start gap-3.5 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                      />
                      <div className="w-5 h-5 rounded-lg border-2 border-zinc-400 dark:border-zinc-500 bg-white dark:bg-white/5 shadow-2xs peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all flex items-center justify-center group-hover:border-emerald-400">
                        <Check className={`w-3.5 h-3.5 text-white transition-opacity ${agreedToTerms ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed flex-1">
                      <strong className="text-zinc-900 dark:text-white block mb-0.5 text-sm">
                        I Agree to Platform Terms &amp; Binding Escrow Agreement
                      </strong>
                      I acknowledge that clicking accept forms a legally binding contract. Escrow funds will be committed for milestone fulfillment, and work will commence according to the stated deliverables.
                    </div>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-white/10">
                {proposal.status === "Hired" ? (
                  <>
                    <button
                      onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}`)}
                      className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
                    >
                      Return to Proposal
                    </button>
                    <button
                      onClick={() => navigate(`/contracts/${proposal.contractId}`)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      View Contract Workspace
                    </button>
                  </>
                ) : proposal.status === "Pending" ? (
                  <button
                    onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}`)}
                    className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
                  >
                    Return to Proposal
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsRejectOfferModalOpen(true)}
                      disabled={isProcessing}
                      className="px-5 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                    >
                      Reject Offer
                    </button>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => navigate(`/jobs/proposals/sent/${proposal.id}`)}
                        disabled={isProcessing}
                        className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition disabled:opacity-50"
                      >
                        Close &amp; Review Later
                      </button>
                      <button
                        onClick={async () => {
                          await handleConfirmAccept();
                        }}
                        disabled={isProcessing || !agreedToTerms}
                        className="px-6 py-2.5 rounded-xl bg-emerald-500 text-xs font-bold text-white hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isProcessing ? "Processing..." : "Sign & Accept Contract"}
                      </button>
                    </div>
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

      {/* Media Lightbox / Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-4xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                {previewItem.type === "video" ? (
                  <Film className="w-5 h-5 text-blue-500 shrink-0" />
                ) : previewItem.type === "image" ? (
                  <ImageIcon className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-red-500 shrink-0" />
                )}
                <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {previewItem.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-xs font-bold text-gray-700 dark:text-zinc-200 transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-gray-950/40">
              {previewItem.type === "video" ? (
                <video
                  src={previewItem.url}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-auto max-w-full rounded-2xl shadow-xl border border-white/10"
                />
              ) : previewItem.type === "image" ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.name}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded-2xl shadow-xl border border-white/10"
                />
              ) : (
                <iframe
                  src={previewItem.url}
                  className="w-full h-[70vh] rounded-2xl border border-gray-200 dark:border-white/10 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalsViewDetailsAsApplicant;
