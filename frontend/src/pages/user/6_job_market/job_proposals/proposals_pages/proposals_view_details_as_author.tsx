import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  UserMinus,
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  User,
  Send,
  Users,
  ShieldCheck,
  Sparkles,
  Play,
  Volume2,
  Eye,
  Download,
  Image as ImageIcon,
  X,
  Paperclip,
  Check,
  ChevronRight,
  FolderOpen,
} from "lucide-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import { getImageUrl } from "@/lib/utils";
import { JobRichText } from "../../job_components/JobRichText";
import { toast } from "react-hot-toast";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import type { ProposalItemData, ProposalStatus } from "../proposals_components/proposals_list";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import api from "@/lib/axios";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import ProposalLifecycleTracker from "../proposals_components/ProposalLifecycleTracker";
import { Profile_Portfolio, type PortfolioItem } from "@/pages/user/7_profile/Displays/Body/Profile_Portfolio";
import { Profile_Gallery } from "@/pages/user/7_profile/Displays/Body/Profile_Gallery";

interface ActingTeamInfo {
  id: string;
  name?: string;
  team_name?: string;
  avatar_path?: string;
  avatar_url?: string;
  members_count?: number;
  member_count?: number;
}

export const ProposalsViewDetailsAsAuthor: React.FC = () => {
  const { user } = useGlobalState();
  const theme = useGlobalState((state) => state.theme);
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { fetchProposalById, sendJobOffer, updateProposalStatus, loading } = useJobs();

  const [proposal, setProposal] = useState<ProposalItemData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [actingTeamInfo, setActingTeamInfo] = useState<ActingTeamInfo | null>(null);

  // Modals
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
  const [shortlistMessage, setShortlistMessage] = useState("");
  const [isShortlisting, setIsShortlisting] = useState(false);

  const [isUnshortlistModalOpen, setIsUnshortlistModalOpen] = useState(false);
  const [isUnshortlisting, setIsUnshortlisting] = useState(false);

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [contractStartsAt, setContractStartsAt] = useState("");

  const [customMilestones, setCustomMilestones] = useState<any[]>([]);
  const [isCustomizingMilestones, setIsCustomizingMilestones] = useState(false);
  const [customBidAmount, setCustomBidAmount] = useState<number>(0);

  // Portfolio items of applicant
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // Media Lightbox
  const [previewItem, setPreviewItem] = useState<{
    url: string;
    name: string;
    type: "video" | "audio" | "image" | "pdf" | "other";
  } | null>(null);

  useEffect(() => {
    if (!previewItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewItem]);

  // Fetch Wallet Balance
  useEffect(() => {
    let isMounted = true;
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then((res) => {
        if (isMounted) {
          setWalletBalance(res.data?.wallet?.balance_credits || 0);
        }
      })
      .catch((err) => console.error("Failed to load wallet balance:", err));
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Proposal Details
  useEffect(() => {
    const loadProposal = async () => {
      if (!proposalId) return;
      setIsInitializing(true);
      try {
        const p = await fetchProposalById(proposalId);
        if (p) {
          const clientName = p.client_name || p.client_handle || "Job Client";
          const freelancerName = p.freelancer_name || p.freelancer_handle || "Applicant";

          const initialMilestones = (p.milestones || [])
            .filter((m: any) => m && (m.id || m.proposal_milestone_id || m.name))
            .map((m: any, idx: number) => ({
              id: m.id || m.proposal_milestone_id || `m-${idx}`,
              name: m.name || `Phase ${idx + 1}`,
              description: m.description || "",
              hours: parseFloat(m.hours) || 0,
              revisions: parseInt(m.revisions, 10) || 0,
            }));

          setCustomMilestones(initialMilestones);
          setCustomBidAmount(parseFloat(p.rate_credits) || 0);

          setProposal({
            id: p.proposal_id,
            jobId: p.job_id,
            contractId: p.contract_id,
            jobTitle: p.job_title || "Target Project",
            partyName: freelancerName,
            clientAccountId: p.client_account_id,
            freelancerAccountId: p.freelancer_account_id,
            clientTeamId: p.client_team_id || undefined,
            freelancerTeamId: p.freelancer_team_id || undefined,
            clientTeamVisibility: p.client_team_visibility || undefined,
            freelancerTeamVisibility: p.freelancer_team_visibility || undefined,
            clientName,
            clientAvatar: constructAvatarUrl(p.client_avatar_path, clientName),
            freelancerName,
            freelancerAvatar: constructAvatarUrl(p.freelancer_avatar_path, freelancerName),
            jobBanner: getImageUrl(p.job_thumbnail_path) || "",
            rating: p.freelancer_rating != null ? Number(p.freelancer_rating) : 5.0,
            bidAmount: parseFloat(p.rate_credits) || 0,
            additionalWorkRate: parseFloat(p.revision_price_credits) || 0,
            coverLetter: p.letter || "",
            tosContent: p.terms_content || "Standard terms apply to this proposal.",
            tosTitle: p.terms_title || "Custom Service Terms",
            tosDescription: p.terms_type || "Standard engagement conditions",
            submittedAt: p.created_at ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently",
            submittedAgo: "Recently",
            jobPostedAt: p.job_created_at ? new Date(p.job_created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A",
            totalApplicants: parseInt(p.total_applicants) || 0,
            avgBid: parseFloat(p.avg_bid) || 0,
            jobStatus: p.job_status,
            jobDeletedAt: p.job_deleted_at,
            jobDescription: p.job_description,
            jobHiringType: p.job_hiring_type || "single",
            status: p.status,
            type: "incoming",
            rejectionReason: p.reject_reason,
            job_milestone_id: p.job_milestone_id,
            target_milestone_title: p.target_milestone_title,
            target_milestone_description: p.target_milestone_description,
            viewedAt: p.viewed_at,
            shortlistedAt: p.shortlisted_at,
            actingTeamId: p.acting_team_id || undefined,
            screeningAnswers: Array.isArray(p.screening_answers) ? p.screening_answers : [],
            attachments: Array.isArray(p.attachments) ? p.attachments : [],
            milestones: initialMilestones,
          });

          // Fetch team info if proposal was submitted by a team
          const teamId = p.acting_team_id || p.actingTeamId;
          const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (teamId && UUID_REGEX.test(teamId)) {
            api.get(`/api/teams/${teamId}`)
              .then((res) => {
                const t = res.data?.data || res.data?.team || res.data;
                if (t) setActingTeamInfo(t);
              })
              .catch((err) => console.error("Failed to load acting team:", err));
          } else {
            setActingTeamInfo(null);
          }
        } else {
          setDebugInfo({ error: "Not found", searchId: proposalId });
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

  useEffect(() => {
    const accountId = proposal?.freelancerAccountId;
    if (!accountId) return;
    setLoadingPortfolio(true);
    api.get(`/api/accounts/profile/${accountId}/attachments`)
      .then((attachmentsResponse) => {
        const items = (attachmentsResponse.data?.attachments || []).map((att: any) => {
          const cloudfront = import.meta.env.VITE_CLOUDFRONT_URL || "";
          const path = att.file_path || "";
          const fileUrl = path ? `${cloudfront}${path.startsWith("/") ? "" : "/"}${path}` : undefined;
          return {
            id: String(att.account_attachment_id || att.file_id || Math.random()),
            type: (att.attachment_kind === "link" ? "link" : "document") as "link" | "document",
            title: att.name || "Attachment",
            description: att.description || (att.attachment_kind === "link" ? att.external_url : att.file_name || "Document"),
            fileUrl: fileUrl,
            externalUrl: att.external_url || undefined,
            createdAt: att.created_at,
          };
        });
        setPortfolioItems(items);
      })
      .catch((err) => console.error("Failed to load candidate portfolio items:", err))
      .finally(() => setLoadingPortfolio(false));
  }, [proposal?.freelancerAccountId]);

  // Actions
  const handleShortlist = async () => {
    if (!proposal) return;
    setIsShortlisting(true);
    try {
      if (updateProposalStatus) {
        await updateProposalStatus(proposal.id, "Shortlisted");
      }
      setProposal((prev) => (prev ? { ...prev, status: "Shortlisted", shortlistedAt: new Date().toISOString() } : null));
      setIsShortlistModalOpen(false);
      setShortlistMessage("");
      showSuccessToast(`${proposal.partyName} shortlisted.`);
    } catch (err: any) {
      console.error("Failed to shortlist proposal", err);
      showErrorToast(err.response?.data?.message || "Failed to shortlist proposal.");
    } finally {
      setIsShortlisting(false);
    }
  };

  const handleUnshortlist = async () => {
    if (!proposal) return;
    setIsUnshortlisting(true);
    try {
      if (updateProposalStatus) {
        await updateProposalStatus(proposal.id, "Pending");
      }
      setProposal((prev) => (prev ? { ...prev, status: "Pending", shortlistedAt: null } : null));
      setIsUnshortlistModalOpen(false);
      showSuccessToast(`${proposal.partyName} moved back to pending review.`);
    } catch (err: any) {
      console.error("Failed to unshortlist proposal", err);
      showErrorToast(err.response?.data?.message || "Failed to unshortlist proposal.");
    } finally {
      setIsUnshortlisting(false);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    try {
      if (updateProposalStatus) {
        await updateProposalStatus(proposal.id, "Rejected", rejectionReason);
      }
      setProposal((prev) => (prev ? { ...prev, status: "Rejected", rejectionReason } : null));
      setIsRejectModalOpen(false);
      setRejectionReason("");
      showSuccessToast("Proposal declined.");
    } catch (err: any) {
      console.error("Failed to reject proposal", err);
      showErrorToast(err.response?.data?.message || "Failed to reject proposal.");
    }
  };

  const handleConfirmAccept = async () => {
    if (!proposal) return;
    const personalAccountId = user?.account_id;
    const usesPersonalWallet = String(proposal.clientAccountId) === String(personalAccountId);
    const effectiveBid = isCustomizingMilestones && customBidAmount > 0 ? customBidAmount : proposal.bidAmount;

    if (usesPersonalWallet && walletBalance < effectiveBid) {
      toast.error("Insufficient wallet balance to extend contract offer. Please top up your wallet credits.");
      return;
    }

    try {
      await sendJobOffer(
        proposal.id,
        effectiveBid,
        contractStartsAt ? new Date(contractStartsAt).toISOString() : undefined,
        isCustomizingMilestones ? customMilestones : undefined
      );

      setProposal((prev) =>
        prev
          ? {
              ...prev,
              status: "Approved",
              updatedAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            }
          : null
      );
      setIsAcceptConfirmOpen(false);
      showSuccessToast("Formal contract offer extended! Awaiting freelancer acceptance.");
    } catch (err: any) {
      console.error("Failed to send job offer", err);
      const msg = err.response?.data?.message || err.message || "Unknown error";
      showErrorToast(`Failed to extend job offer: ${msg}`);
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
    navigate(`/jobs/my-job-post/${proposal.jobId}`);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 rounded-full border-2 border-zinc-300 dark:border-white/20 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Loading incoming proposal...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6 font-['Plus_Jakarta_Sans']">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center mx-auto text-gray-400">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Proposal Not Found</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">This incoming proposal could not be retrieved.</p>
          </div>
          <button
            onClick={() => navigate("/jobs/proposals")}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
          >
            Return to Proposals
          </button>
        </div>
      </div>
    );
  }

  // Calculations
  const totalBid = proposal.bidAmount || 0;
  const count = proposal.milestones.length || 1;
  const totalHours = proposal.milestones.reduce((acc, m) => acc + (Number(m.hours) || 0), 0);
  const milestoneAveragePayout = Math.floor(totalBid / count);
  const overageRateBonus = Math.floor(milestoneAveragePayout * (proposal.additionalWorkRate / 100));

  // Status Styling Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
      case "Accepted":
        return {
          step: "03",
          label: "ACCEPTED",
          className: "border-emerald-400/70 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        };
      case "Hired":
        return {
          step: "04",
          label: "HIRED",
          className: "border-purple-400/70 text-purple-600 dark:text-purple-400 bg-purple-500/10",
        };
      case "Shortlisted":
        return {
          step: "02",
          label: "SHORTLISTED",
          className: "border-blue-400/70 text-blue-600 dark:text-blue-400 bg-blue-500/10",
        };
      case "Rejected":
        return {
          step: "",
          label: "REJECTED",
          className: "border-red-400/70 text-red-600 dark:text-red-400 bg-red-500/10",
        };
      case "Withdrawn":
        return {
          step: "",
          label: "WITHDRAWN",
          className: "border-gray-300 dark:border-white/20 text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-white/5",
        };
      default:
        return {
          step: "01",
          label: "PENDING",
          className: "border-amber-400/70 text-amber-600 dark:text-amber-400 bg-amber-500/10",
        };
    }
  };

  const statusBadge = getStatusBadge(proposal.status);

  return (
    <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white font-['Plus_Jakarta_Sans'] overflow-x-clip pt-6 pb-36">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <ShapeGrid
          shape="square"
          squareSize={48}
          direction="diagonal"
          speed={0.4}
          borderColor={theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.07)"}
          hoverFillColor={theme === "dark" ? "rgba(59, 130, 246, 0.15)" : "rgba(59, 130, 246, 0.1)"}
          hoverTrailAmount={3}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 mx-auto max-w-6xl p-4 sm:p-6 md:p-8 w-full space-y-6 text-left"
      >
        {/* Top Navigation & Status Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
          <button
            onClick={() => navigate(proposal.jobId ? `/jobs/proposals/incoming/${proposal.jobId}` : "/jobs/proposals")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition shrink-0 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Incoming Proposals</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-500 dark:text-zinc-400">
              Proposal Ref: <span className="font-semibold text-gray-700 dark:text-zinc-300">{proposal.id.slice(0, 8)}</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* ================= 4-STAGE PROPOSAL LIFECYCLE PROGRESSION ================= */}
        <ProposalLifecycleTracker currentStatus={proposal.status} />

        {/* ================= 1. TARGET JOB & PROPOSER REPRESENTATION (HEADER CARD) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Target Job Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500" /> Your Job Posting
                </span>
                <button
                  onClick={handleViewTargetJob}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <span>Manage Job Post</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>

              {/* Job Cover & Title */}
              <div className="flex items-start gap-3">
                {proposal.jobBanner ? (
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5">
                    <img
                      src={proposal.jobBanner}
                      alt={proposal.jobTitle}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-2">
                    {proposal.jobTitle}
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Posted on {proposal.jobPostedAt}
                  </p>
                </div>
              </div>
            </div>

            {/* Total Applicants Bar */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
              <span>{proposal.totalApplicants || 1} Applicant{(proposal.totalApplicants || 1) !== 1 ? "s" : ""} Competing</span>
              {proposal.avgBid ? (
                <span className="flex items-center gap-1">
                  Average Bid: <CreditIcon className="h-3 w-3 text-amber-500" />
                  <strong className="text-gray-700 dark:text-zinc-300 font-semibold">{proposal.avgBid.toLocaleString()}</strong>
                </span>
              ) : null}
            </div>
          </div>

          {/* Right: Proposer Representation & Timeline Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-500" /> Applicant Representation
                </span>
                {proposal.status === "Shortlisted" ? (
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                    ★ Shortlisted
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-white/5 px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-white/10">
                    Candidate Application
                  </span>
                )}
              </div>

              {/* Representation Party Details */}
              {actingTeamInfo ? (
                <div className="flex items-center gap-3">
                  <img
                    src={constructAvatarUrl(actingTeamInfo.avatar_path, actingTeamInfo.name || actingTeamInfo.team_name)}
                    alt={actingTeamInfo.name || "Team"}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getFallbackAvatarUrl(actingTeamInfo.name || "Team");
                    }}
                    className="h-12 w-12 rounded-xl border border-gray-200 dark:border-white/10 object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {actingTeamInfo.name || actingTeamInfo.team_name || "Studio / Team"}
                      </h3>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full shrink-0">
                        Team
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      Represented by <strong className="text-gray-700 dark:text-zinc-300">{proposal.partyName}</strong> ({actingTeamInfo.members_count || actingTeamInfo.member_count || 1} members)
                    </p>
                  </div>
                  <button
                    onClick={() => handleViewProfile(proposal.freelancerAccountId, actingTeamInfo.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition shrink-0 cursor-pointer"
                  >
                    Team Profile
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <img
                    src={proposal.freelancerAvatar}
                    alt={proposal.partyName}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = getFallbackAvatarUrl(proposal.partyName);
                    }}
                    className="h-12 w-12 rounded-full border border-gray-200 dark:border-white/10 object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {proposal.partyName}
                      </h3>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                        Solo Freelancer
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                      <span className="flex items-center gap-1 font-bold text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" />
                        {Number(proposal.rating || 5.0).toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>Verified Talent</span>
                    </div>
                  </div>
                  {proposal.freelancerAccountId && (
                    <button
                      onClick={() => handleViewProfile(proposal.freelancerAccountId)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition shrink-0 cursor-pointer"
                    >
                      View Profile
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Submission Date */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-gray-400" />
                Submitted on <strong className="text-gray-700 dark:text-zinc-300 font-semibold">{proposal.submittedAt}</strong>
              </span>
              {proposal.updatedAt && (
                <span className="text-gray-400">Updated {proposal.updatedAt}</span>
              )}
            </div>
          </div>
        </div>

        {/* ================= 2. 3-METRIC SPECIFICATIONS STRIP ================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Proposed Bid */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 shadow-xs">
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
              Proposed Total Bid
            </span>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 mt-1">
              <CreditIcon className="h-5 w-5 text-amber-500 shrink-0" />
              <span>{totalBid.toLocaleString()} Credits</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5">
              Escrow locked upon contract creation across {proposal.milestones.length} milestone{proposal.milestones.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Card 2: Additional Work Rate */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 shadow-xs">
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
              Additional Revision Rate
            </span>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-1 mt-1">
              <span>+{proposal.additionalWorkRate}%</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400">/ extra pass</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 flex items-center gap-1">
              Extra pass cost: <CreditIcon className="h-3 w-3 text-amber-500 inline" />
              <strong className="text-gray-700 dark:text-zinc-300 font-bold">+{overageRateBonus.toLocaleString()} Credits</strong> per requested revision pass
            </p>
          </div>

          {/* Card 3: Scope & Schedule */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-4 shadow-xs">
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
              Milestone Breakdown Scope
            </span>
            <div className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mt-1">
              <Layers className="h-5 w-5 text-blue-500 shrink-0" />
              <span>{proposal.milestones.length} Milestone Phases</span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5">
              Estimated Total Duration: <strong className="text-gray-700 dark:text-zinc-300 font-bold">{totalHours} Hours</strong>
            </p>
          </div>
        </div>

        {/* ================= 3. COVER PITCH & SOLUTION RATIONALE ================= */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> Cover Pitch & Solution Rationale
            </h3>
            <span className="text-[11px] text-gray-400">Candidate Submission</span>
          </div>

          <div className="text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
            <JobRichText content={proposal.coverLetter || "No pitch statement provided."} />
          </div>

          {/* Screening Questionnaire Responses */}
          {proposal.screeningAnswers && proposal.screeningAnswers.length > 0 && (
            <div className="pt-4 border-t border-gray-100 dark:border-white/5 space-y-3">
              <h4 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Screening Questionnaire Responses
              </h4>
              <div className="space-y-2">
                {proposal.screeningAnswers.map((qa: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 text-xs space-y-1"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Q: {qa.question || `Question ${idx + 1}`}
                    </p>
                    <p className="text-gray-600 dark:text-zinc-300">
                      A: {qa.answer || "No response provided"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ================= 4. MILESTONES SCHEDULE & DELIVERABLES TABLE ================= */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-xs">
          <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-500" />
              <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                Milestones Schedule & Deliverables ({proposal.milestones.length})
              </h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-zinc-400 font-semibold">
              {totalHours} hrs estimated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[240px]">Milestone Phase & Deliverable Scope</th>
                  <th className="py-3 px-3 text-center">Duration</th>
                  <th className="py-3 px-3 text-center">Revisions</th>
                  <th className="py-3 px-3 text-center">Share</th>
                  <th className="py-3 px-4 text-right">Phase Escrow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {proposal.milestones.length > 0 ? (
                  proposal.milestones.map((m, idx) => {
                    const share = totalHours > 0 ? Math.round(((Number(m.hours) || 0) / totalHours) * 100) : Math.round(100 / count);
                    const phasePayout = Math.floor(totalBid * (share / 100)) || milestoneAveragePayout;

                    return (
                      <tr key={m.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                        <td className="py-3.5 px-4 text-center font-bold text-gray-400 dark:text-zinc-500">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-gray-900 dark:text-white text-xs">{m.name}</p>
                          {m.description && (
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                              {m.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-700 dark:text-zinc-300 font-semibold whitespace-nowrap">
                          {m.hours} hrs
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-700 dark:text-zinc-300 whitespace-nowrap">
                          {m.revisions} pass{m.revisions !== 1 ? "es" : ""}
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-500 dark:text-zinc-400 font-semibold whitespace-nowrap">
                          {share}%
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                            {phasePayout.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-gray-400 dark:text-zinc-500 italic">
                      Single project delivery milestone without incremental sub-phases.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] text-xs font-bold text-gray-900 dark:text-white">
                  <td colSpan={2} className="py-3 px-4 uppercase text-[10px] tracking-wider text-gray-500 dark:text-zinc-400">
                    Total Contract Escrow Value
                  </td>
                  <td className="py-3 px-3 text-center">{totalHours} hrs</td>
                  <td className="py-3 px-3 text-center text-gray-400">—</td>
                  <td className="py-3 px-3 text-center">100%</td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 text-amber-500">
                      <CreditIcon className="h-3.5 w-3.5" />
                      {totalBid.toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ================= 5. ATTACHED WORK SAMPLES & REFERENCES ================= */}
        {proposal.attachments && proposal.attachments.length > 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
              <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-500" />
                Submitted Work Samples & References ({proposal.attachments.length})
              </h3>
              <span className="text-[11px] text-gray-400">Click to preview in lightbox</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {proposal.attachments.map((att: any, idx: number) => {
                const downloadUrl = att.path?.startsWith("http")
                  ? att.path
                  : `${import.meta.env.VITE_CLOUDFRONT_URL || ""}/${att.path?.startsWith("/") ? att.path.slice(1) : att.path}`;
                const mime = (att.mime_type || "").toLowerCase();
                const name = att.name || `Sample_${idx + 1}`;
                const ext = name.split(".").pop()?.toLowerCase() || "";

                const isVideo = mime.startsWith("video/") || ["mp4", "webm", "mov"].includes(ext);
                const isAudio = mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext);
                const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
                const isPdf = mime === "application/pdf" || ext === "pdf";

                const sizeStr = att.size_bytes ? `${(att.size_bytes / 1024 / 1024).toFixed(1)} MB` : "";

                return (
                  <div
                    key={idx}
                    className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] overflow-hidden hover:border-blue-500/30 transition flex flex-col justify-between group shadow-2xs"
                  >
                    {/* Media Thumbnail */}
                    {isVideo ? (
                      <div
                        onClick={() => setPreviewItem({ url: downloadUrl, name, type: "video" })}
                        className="relative h-28 bg-black flex items-center justify-center cursor-pointer overflow-hidden group/video"
                      >
                        <video src={downloadUrl} preload="metadata" className="w-full h-full object-cover opacity-60 group-hover/video:opacity-80 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-md group-hover/video:scale-105 transition-transform">
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                          VIDEO DEMO
                        </span>
                      </div>
                    ) : isAudio ? (
                      <div
                        onClick={() => setPreviewItem({ url: downloadUrl, name, type: "audio" })}
                        className="h-28 bg-blue-500/5 dark:bg-blue-500/10 flex flex-col items-center justify-center gap-1.5 cursor-pointer border-b border-gray-200 dark:border-white/10 group/audio"
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center group-hover/audio:scale-105 transition-transform">
                          <Volume2 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">AUDIO TRACK</span>
                      </div>
                    ) : isImage ? (
                      <div
                        onClick={() => setPreviewItem({ url: downloadUrl, name, type: "image" })}
                        className="relative h-28 bg-gray-100 dark:bg-white/5 flex items-center justify-center cursor-pointer overflow-hidden group/img"
                      >
                        <img src={downloadUrl} alt={name} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" />
                        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-600 text-white">
                          IMAGE
                        </span>
                      </div>
                    ) : isPdf ? (
                      <div
                        onClick={() => setPreviewItem({ url: downloadUrl, name, type: "pdf" })}
                        className="h-28 bg-red-500/5 dark:bg-red-500/10 flex flex-col items-center justify-center gap-1.5 cursor-pointer border-b border-gray-200 dark:border-white/10 group/pdf"
                      >
                        <FileText className="w-8 h-8 text-red-500 group-hover/pdf:scale-105 transition-transform" />
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400">PDF DOCUMENT</span>
                      </div>
                    ) : (
                      <div
                        onClick={() => window.open(downloadUrl, "_blank")}
                        className="h-28 bg-gray-100 dark:bg-white/5 flex flex-col items-center justify-center gap-1.5 cursor-pointer border-b border-gray-200 dark:border-white/10"
                      >
                        <FileText className="w-8 h-8 text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-600 dark:text-zinc-400">ATTACHED FILE</span>
                      </div>
                    )}

                    {/* Metadata & Actions */}
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate block flex-1" title={name}>
                          {name}
                        </span>
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="text-gray-400 hover:text-blue-500 transition-colors p-0.5"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400">
                        <span>{sizeStr || ext.toUpperCase()}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isVideo) setPreviewItem({ url: downloadUrl, name, type: "video" });
                            else if (isAudio) setPreviewItem({ url: downloadUrl, name, type: "audio" });
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

        {/* ================= 6. APPLICANT PORTFOLIO & CASE STUDIES ================= */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-500" />
              Applicant Portfolio &amp; Case Studies
            </h3>
            <span className="text-[11px] text-gray-400">Verified Profile Showcase</span>
          </div>

          <Profile_Portfolio
            portfolioItems={portfolioItems}
            isOwner={false}
            isLoading={loadingPortfolio}
          />
        </div>

        {/* ================= 7. APPLICANT CREATIVE GALLERY ================= */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-purple-500" />
              Applicant Creative Gallery &amp; Media Works
            </h3>
            <span className="text-[11px] text-gray-400">Profile Media Assets</span>
          </div>

          <Profile_Gallery
            accountId={proposal.freelancerAccountId || ""}
            isOwner={false}
          />
        </div>

        {/* ================= 8. TERMS OF SERVICE ================= */}
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                {proposal.tosTitle || "Candidate Service Terms"}
              </h3>
            </div>
            <span className="text-[11px] text-gray-400">{proposal.tosDescription || "Engagement Rules"}</span>
          </div>
          <div className="p-4 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] text-xs text-gray-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">
            {proposal.tosContent}
          </div>
        </div>

        {/* Rejection Notification (if declined) */}
        {proposal.status === "Rejected" && (
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs space-y-1">
            <span className="font-bold text-red-600 dark:text-red-400 uppercase flex items-center gap-1.5 text-[10px] tracking-wider">
              <ShieldAlert className="h-4 w-4" /> Proposal Declined
            </span>
            <p className="text-gray-700 dark:text-zinc-300 leading-relaxed pl-5">
              {proposal.rejectionReason || "You have declined this candidate's proposal application."}
            </p>
          </div>
        )}
      </motion.div>

      {/* ================= 7. FIXED ACTION BAR (BOTTOM) ================= */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 dark:border-white/10 bg-white/90 dark:bg-dark-surface/90 backdrop-blur-xl shadow-lg p-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-zinc-400 hidden sm:inline">
              Candidate Status:
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* When Pending */}
            {proposal.status === "Pending" && (
              <>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={() => setIsShortlistModalOpen(true)}
                  className="px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Star className="h-4 w-4" />
                  <span>Shortlist</span>
                </button>
                <button
                  onClick={() => setIsAcceptConfirmOpen(true)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Extend Contract Offer</span>
                </button>
              </>
            )}

            {/* When Shortlisted */}
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Discussion Chat</span>
                </button>
                <button
                  onClick={() => setIsUnshortlistModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <UserMinus className="h-4 w-4" />
                  <span>Remove Shortlist</span>
                </button>
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Decline</span>
                </button>
                <button
                  onClick={() => setIsAcceptConfirmOpen(true)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>Extend Contract Offer</span>
                </button>
              </>
            )}

            {/* When Offer Extended */}
            {proposal.status === "Approved" && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-bold">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>Formal Offer Extended — Awaiting Freelancer Execution</span>
              </div>
            )}

            {/* When Hired */}
            {(proposal.status === "Hired" || proposal.status === "Accepted") && (
              <button
                onClick={() => navigate(proposal.contractId ? `/contracts/${proposal.contractId}` : "/contracts")}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Active Contract & Workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Shortlist Confirmation Modal */}
      <AnimatePresence>
        {isShortlistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" /> Shortlist Candidate
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Shortlist <strong className="text-gray-900 dark:text-white">{proposal.partyName}</strong> to easily keep track of top candidates and open dedicated interview discussions.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsShortlistModalOpen(false)}
                  disabled={isShortlisting}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShortlist}
                  disabled={isShortlisting}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-xs font-bold text-black hover:bg-amber-400 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isShortlisting ? "Saving..." : "Confirm Shortlist"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Remove Shortlist Modal */}
      <AnimatePresence>
        {isUnshortlistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-gray-500" /> Remove from Shortlist
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Move <strong className="text-gray-900 dark:text-white">{proposal.partyName}</strong> back to the regular pending applications list?
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsUnshortlistModalOpen(false)}
                  disabled={isUnshortlisting}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnshortlist}
                  disabled={isUnshortlisting}
                  className="px-5 py-2 rounded-xl bg-gray-900 dark:bg-white text-xs font-bold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-zinc-200 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isUnshortlisting ? "Updating..." : "Remove Shortlist"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Reject Proposal Modal */}
      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="space-y-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" /> Decline Candidate Proposal
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                  Provide optional constructive feedback to <strong className="text-gray-900 dark:text-white">{proposal.partyName}</strong> regarding your decision:
                </p>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Budget mismatch, different portfolio focus, positions already filled..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-5 py-2 rounded-xl bg-red-600 text-xs font-bold text-white hover:bg-red-500 transition shadow-sm cursor-pointer"
                >
                  Decline Proposal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Accept / Extend Formal Offer Modal */}
      <AnimatePresence>
        {isAcceptConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 sm:p-6 shadow-2xl space-y-4 text-left my-6"
            >
              <div className="flex items-start justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Extend Formal Contract Offer</h3>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Form a binding escrow milestone contract extended to <strong className="text-gray-700 dark:text-zinc-300">{proposal.partyName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setIsAcceptConfirmOpen(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Escrow Balance & Bid Strip */}
              <div className="p-3.5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-zinc-400">Agreed Contract Escrow:</span>
                  <span className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1">
                    <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                    {(isCustomizingMilestones && customBidAmount > 0 ? customBidAmount : proposal.bidAmount).toLocaleString()} Credits
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/5 text-[11px]">
                  <span className="text-gray-500 dark:text-zinc-400">Your Wallet Balance:</span>
                  <span className={`font-bold ${walletBalance >= (isCustomizingMilestones && customBidAmount > 0 ? customBidAmount : proposal.bidAmount) ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                    {walletBalance.toLocaleString()} Credits
                  </span>
                </div>
              </div>

              {/* Start Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 block">
                  Contract Start Date (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={contractStartsAt}
                    onChange={(e) => setContractStartsAt(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                      setContractStartsAt(localDateTime);
                    }}
                    className="text-[11px] bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold px-3 py-2.5 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition cursor-pointer"
                  >
                    Set to Now
                  </button>
                </div>
              </div>

              {/* Milestone Customization */}
              <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    Negotiated Scope & Milestones
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomizingMilestones(!isCustomizingMilestones)}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {isCustomizingMilestones ? "Reset to Proposed" : "Customize Milestones"}
                  </button>
                </div>

                {isCustomizingMilestones ? (
                  <div className="space-y-2.5 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-600 dark:text-zinc-400 font-medium">Agreed Offer Amount (Credits):</span>
                      <input
                        type="number"
                        min={10}
                        value={customBidAmount || ""}
                        onChange={(e) => setCustomBidAmount(Math.max(10, parseInt(e.target.value) || 10))}
                        className="w-28 text-right rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface px-2.5 py-1 text-xs font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {customMilestones.map((m, idx) => (
                        <div key={m.id || idx} className="p-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 space-y-1.5 text-xs">
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => {
                              const updated = [...customMilestones];
                              updated[idx].name = e.target.value;
                              setCustomMilestones(updated);
                            }}
                            className="w-full rounded border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 px-2 py-1 text-[11px] font-semibold text-gray-900 dark:text-white"
                          />
                          <div className="flex items-center gap-3 text-[10px] text-gray-500">
                            <span>Hours:</span>
                            <input
                              type="number"
                              min={1}
                              value={m.hours}
                              onChange={(e) => {
                                const updated = [...customMilestones];
                                updated[idx].hours = Math.max(1, parseInt(e.target.value) || 1);
                                setCustomMilestones(updated);
                              }}
                              className="w-14 rounded border border-gray-200 dark:border-white/10 px-1 py-0.5"
                            />
                            <span>Revisions:</span>
                            <input
                              type="number"
                              min={0}
                              value={m.revisions}
                              onChange={(e) => {
                                const updated = [...customMilestones];
                                updated[idx].revisions = Math.max(0, parseInt(e.target.value) || 0);
                                setCustomMilestones(updated);
                              }}
                              className="w-14 rounded border border-gray-200 dark:border-white/10 px-1 py-0.5"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                    Using candidate&apos;s proposed {proposal.milestones.length} milestone phase{proposal.milestones.length !== 1 ? "s" : ""}.
                  </p>
                )}
              </div>

              {/* Agreement Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01] cursor-pointer text-xs text-gray-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="leading-relaxed">
                  I agree to extend this formal offer and acknowledge that platform escrow will hold the contract amount upon candidate acceptance.
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                <button
                  onClick={() => setIsAcceptConfirmOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAccept}
                  disabled={loading || !agreedToTerms}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Extending Offer..." : "Send Contract Offer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Media Lightbox Modal (Portal to body) */}
      {previewItem &&
        createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-['Plus_Jakarta_Sans']">
            <div className="relative w-full max-w-4xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  {previewItem.type === "video" ? (
                    <Play className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : previewItem.type === "audio" ? (
                    <Volume2 className="w-4 h-4 text-blue-500 shrink-0" />
                  ) : previewItem.type === "image" ? (
                    <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
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
                    className="p-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
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
                    className="max-h-[72vh] w-auto max-w-full rounded-xl shadow-xl border border-white/10"
                  />
                ) : previewItem.type === "audio" ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-2xl border border-white/10 space-y-4 max-w-md w-full text-center">
                    <div className="h-14 w-14 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Volume2 className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-bold text-white truncate max-w-xs">{previewItem.name}</span>
                    <audio src={previewItem.url} controls autoPlay className="w-full mt-2" />
                  </div>
                ) : previewItem.type === "image" ? (
                  <img
                    src={previewItem.url}
                    alt={previewItem.name}
                    className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-xl border border-white/10"
                  />
                ) : (
                  <iframe
                    src={previewItem.url}
                    className="w-full h-[72vh] rounded-xl border border-gray-200 dark:border-white/10 bg-white"
                  />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ProposalsViewDetailsAsAuthor;
