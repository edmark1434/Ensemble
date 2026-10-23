import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
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
  MessageSquare,
  ExternalLink,
  ShieldAlert,
  User,
  Users,
  ShieldCheck,
  Play,
  Volume2,
  Eye,
  Download,
  Image as ImageIcon,
  X,
  Paperclip,
  Check,
  ChevronDown,
  Maximize2,
  Minimize2,
  FolderOpen,
  Sparkles,
  UserCheck,
  UserMinus,
  Tag,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import { getImageUrl } from "@/lib/utils";
import useGlobalState from "@/lib/global_state";
import { JobRichText } from "../../job_components/JobRichText";
import { toast } from "react-hot-toast";
import { showErrorToast, showSuccessToast } from "@/components/utility/toast";
import { CreditIcon } from "@/components/ui/credit-icon";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import ProposalLifecycleTracker from "../proposals_components/ProposalLifecycleTracker";
import { Profile_Portfolio, type PortfolioItem } from "@/pages/user/7_profile/Displays/Body/Profile_Portfolio";
import { Profile_Gallery } from "@/pages/user/7_profile/Displays/Body/Profile_Gallery";
import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";

interface ActingTeamInfo {
  team_id?: string;
  id?: string;
  name?: string;
  team_name?: string;
  avatar_path?: string;
  avatar_url?: string;
  banner_preset?: string;
  banner_url?: string;
  banner_path?: string;
  bio?: string;
  description?: string;
  members_count?: number;
  member_count?: number;
}

export const ProposalsViewDetailsAsAuthor: React.FC = () => {
  const { proposalId } = useParams<{ proposalId: string }>();
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const user = useGlobalState((state) => state.user);
  const { pathname } = useLocation();
  const { fetchProposalById, sendJobOffer, updateProposalStatus, loading } = useJobs();

  const [proposal, setProposal] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [actingTeamInfo, setActingTeamInfo] = useState<ActingTeamInfo | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Author Action Modals
  const [isShortlistModalOpen, setIsShortlistModalOpen] = useState(false);
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

  // Portfolio items of candidate
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);

  // Collapsible section states (Sections 2-7 collapsible, Section 1 permanently visible)
  const [isSection2Collapsed, setIsSection2Collapsed] = useState(false); // Cover Letter & Screening Q&A
  const [isSection3Collapsed, setIsSection3Collapsed] = useState(false); // TOS & Job Specifications
  const [isSection4Collapsed, setIsSection4Collapsed] = useState(false); // Work Samples
  const [isSection5Collapsed, setIsSection5Collapsed] = useState(false); // Milestones
  const [isSection6Collapsed, setIsSection6Collapsed] = useState(false); // Portfolio
  const [isSection7Collapsed, setIsSection7Collapsed] = useState(false); // Gallery

  const areAllSectionsCollapsed =
    isSection2Collapsed &&
    isSection3Collapsed &&
    isSection4Collapsed &&
    isSection5Collapsed &&
    isSection6Collapsed &&
    isSection7Collapsed;

  const toggleAllSections = () => {
    const next = !areAllSectionsCollapsed;
    setIsSection2Collapsed(next);
    setIsSection3Collapsed(next);
    setIsSection4Collapsed(next);
    setIsSection5Collapsed(next);
    setIsSection6Collapsed(next);
    setIsSection7Collapsed(next);
  };

  // Sub-accordions for milestone card tasks
  const [expandedMilestoneTasks, setExpandedMilestoneTasks] = useState<Record<number, boolean>>({});

  const toggleMilestoneTasks = (idx: number) => {
    setExpandedMilestoneTasks((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Lightbox Media Preview State
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
          const count = (p.milestones || []).length || 1;

          const initialMilestones = (p.milestones || [])
            .filter((m: any) => m && (m.id || m.proposal_milestone_id || m.name))
            .map((m: any, idx: number) => ({
              id: m.id || m.proposal_milestone_id || `m-${idx}`,
              name: m.name || `Phase ${idx + 1}`,
              description: m.description || "",
              hours: parseFloat(m.hours) || 0,
              revisions: parseInt(m.revisions, 10) || 0,
              percentage: Number(m.percentage) || Math.round(100 / count),
              tasks: Array.isArray(m.tasks) ? m.tasks.filter(Boolean) : (m.description ? [m.description] : []),
            }));

          // Initialize tasks expansion to open
          const initialTasksState: Record<number, boolean> = {};
          initialMilestones.forEach((_: any, idx: number) => {
            initialTasksState[idx] = true;
          });
          setExpandedMilestoneTasks(initialTasksState);
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
            freelancerHandle: p.freelancer_handle,
            freelancerBio: p.freelancer_bio || p.description,
            freelancerType: p.freelancer_type || (p.acting_team_id || p.freelancer_team_id ? "Team" : "User"),
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
            jobCategory: p.job_category || "Production",
            jobSkills: Array.isArray(p.job_skills) ? p.job_skills : (typeof p.job_skills === "string" ? JSON.parse(p.job_skills || "[]") : []),
            jobExperienceLevel: p.job_experience_level || "Intermediate",
            jobTimeline: p.job_timeline || "Standard",
            jobMinBudget: parseFloat(p.job_min_budget) || parseFloat(p.job_budget_credits) || 0,
            jobMaxBudget: parseFloat(p.job_max_budget) || parseFloat(p.job_budget_credits) || 0,
            jobBudgetType: p.job_budget_type || (p.job_max_budget ? "range" : "open"),
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

          // Fetch team info if proposing as a team
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
        }
      } catch (err) {
        console.error("Failed to load proposal details", err);
      } finally {
        setIsInitializing(false);
      }
    };

    loadProposal();
  }, [proposalId, pathname]);

  // Load candidate portfolio items
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
      .catch((err) => console.error("Failed to load portfolio items:", err))
      .finally(() => setLoadingPortfolio(false));
  }, [proposal?.freelancerAccountId]);

  // Author Actions
  const handleShortlist = async () => {
    if (!proposal) return;
    setIsShortlisting(true);
    try {
      if (updateProposalStatus) {
        await updateProposalStatus(proposal.id, "Shortlisted");
      }
      setProposal((prev: any) =>
        prev ? { ...prev, status: "Shortlisted", shortlistedAt: new Date().toISOString() } : null
      );
      setIsShortlistModalOpen(false);
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
      setProposal((prev: any) =>
        prev ? { ...prev, status: "Pending", shortlistedAt: null } : null
      );
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
      setProposal((prev: any) =>
        prev ? { ...prev, status: "Rejected", rejectionReason } : null
      );
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

      setProposal((prev: any) =>
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

  // Helper to resolve phase color accent
  const getPhaseTheme = (index: number) => {
    switch (index % 4) {
      case 0:
        return { circleBg: "bg-blue-600 text-white", name: "blue" };
      case 1:
        return { circleBg: "bg-purple-600 text-white", name: "purple" };
      case 2:
        return { circleBg: "bg-emerald-600 text-white", name: "emerald" };
      case 3:
      default:
        return { circleBg: "bg-amber-600 text-white", name: "amber" };
    }
  };

  // Helper to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileType = (mimeType?: string, fileName?: string): "video" | "audio" | "image" | "pdf" | "other" => {
    if (mimeType?.startsWith("video/")) return "video";
    if (mimeType?.startsWith("audio/")) return "audio";
    if (mimeType?.startsWith("image/")) return "image";
    if (mimeType?.includes("pdf") || fileName?.toLowerCase().endsWith(".pdf")) return "pdf";
    return "other";
  };

  const isTeam = Boolean(
    proposal?.actingTeamId ||
    (proposal?.freelancerType && proposal?.freelancerType.toLowerCase() === "team") ||
    actingTeamInfo
  );

  // Candidate banner
  const candidateBannerUrl = useMemo(() => {
    if (isTeam && actingTeamInfo) {
      if (actingTeamInfo.banner_preset) {
        return bannerPresetUrl(actingTeamInfo.banner_preset) || "/profile_banner_presets/Ensemble%20Purple.png";
      }
      if (actingTeamInfo.banner_url || actingTeamInfo.banner_path) {
        return getImageUrl(actingTeamInfo.banner_url || actingTeamInfo.banner_path);
      }
      return "/profile_banner_presets/Ensemble%20Purple.png";
    }
    const preset = resolveBannerPreset(null, proposal?.freelancerHandle || proposal?.freelancerName || "candidate");
    return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Blue.png";
  }, [isTeam, actingTeamInfo, proposal?.freelancerHandle, proposal?.freelancerName]);

  // Clean, single-line sanitized job description for the preview snippet
  const cleanJobDescription = useMemo(() => {
    if (!proposal?.jobDescription) return "No project description provided.";
    return proposal.jobDescription
      .replace(/[#*_`~\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }, [proposal?.jobDescription]);

  if (isInitializing) {
    return (
      <div className="relative w-full min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white flex items-center justify-center p-6 font-['Plus_Jakarta_Sans'] overflow-hidden">
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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 flex flex-col items-center gap-3 text-center"
        >
          <div className="w-40 h-40 flex items-center justify-center">
            <DotLottieReact
              src="/icons/lottie/loading-ensemble.lottie"
              loop
              autoplay
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Loading Received Proposal
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Gathering candidate roadmap, terms, and pitch...
            </p>
          </div>
        </motion.div>
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
  const totalHours = proposal.milestones.reduce((acc: number, m: any) => acc + (Number(m.hours) || 0), 0);
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
          className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
        };
      case "Hired":
        return {
          step: "04",
          label: "HIRED",
          className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
        };
      case "Shortlisted":
        return {
          step: "02",
          label: "SHORTLISTED",
          className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
        };
      case "Rejected":
        return {
          step: "00",
          label: "DECLINED",
          className: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",
        };
      case "Withdrawn":
        return {
          step: "00",
          label: "WITHDRAWN",
          className: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-500/50",
        };
      case "Pending":
      default:
        return {
          step: "01",
          label: "PENDING REVIEW",
          className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
        };
    }
  };

  const statusBadge = getStatusBadge(proposal.status);

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-dark-base text-gray-900 dark:text-white font-['Plus_Jakarta_Sans'] pb-28">
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6"
      >
        {/* =========================================================================
            TOP ACTION BAR: Return Link, Status Tag, and Master Collapse/Expand
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/jobs/proposals")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Received Proposals</span>
            </button>

            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">
              #PROP-{proposal.id.slice(0, 8).toUpperCase()}
            </span>

            {/* Status Tag */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-xs ${statusBadge.className}`}
            >
              <Tag className="h-3 w-3 shrink-0 opacity-90" />
              <span>{statusBadge.label}</span>
            </span>
          </div>

          {/* Master Expand All / Collapse All Toggle Button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={toggleAllSections}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-2xs transition cursor-pointer"
            >
              {areAllSectionsCollapsed ? (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-blue-500" />
                  <span>Expand All Sections</span>
                </>
              ) : (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Collapse All Sections</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            STANDARDIZED LIFECYCLE TRACKER
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-4 sm:p-5 shadow-2xs">
          <ProposalLifecycleTracker currentStatus={proposal.status} />
        </div>

        {/* =========================================================================
            SECTION 1: PROPOSAL REPRESENTATION & TARGET LISTING (PERMANENTLY VISIBLE)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
            {/* Header Strip */}
            <div className="p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Candidate Representation & Target Listing
              </span>
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                Submitted {proposal.submittedAt}
              </span>
            </div>

            {/* 2-Column Grid */}
            <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* LEFT: Candidate Profile / Studio Card */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-2xs flex flex-col justify-between text-left">
                {/* Banner Preview */}
                <div className="h-20 sm:h-24 w-full relative overflow-hidden bg-zinc-800">
                  <img
                    src={candidateBannerUrl}
                    alt="Banner"
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/40 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">
                    {isTeam ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    <span>{isTeam ? "Creative Team" : "Solo Talent"}</span>
                  </div>
                </div>

                {/* Card Content with Overlapping Avatar */}
                <div className="p-5 pt-0 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Overlapping Avatar */}
                    <div className="relative z-10 -mt-7 mb-2.5 flex items-end justify-between">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm shrink-0">
                        {isTeam && actingTeamInfo?.avatar_path ? (
                          <img
                            src={constructAvatarUrl(actingTeamInfo.avatar_path, actingTeamInfo.name || actingTeamInfo.team_name)}
                            alt={actingTeamInfo.name || "Team"}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getFallbackAvatarUrl(actingTeamInfo.name || "Team");
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : proposal.freelancerAvatar ? (
                          <img
                            src={proposal.freelancerAvatar}
                            alt={proposal.freelancerName}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getFallbackAvatarUrl(proposal.freelancerName);
                            }}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-zinc-500">
                            {proposal.freelancerName[0]}
                          </div>
                        )}
                      </div>

                      {/* Rating pill */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs font-bold text-gray-700 dark:text-zinc-200">
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        <span>{Number(proposal.rating || 5.0).toFixed(1)}</span>
                      </div>
                    </div>

                    {/* Name & Handle */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                          {isTeam ? (actingTeamInfo?.name || actingTeamInfo?.team_name || proposal.freelancerName) : proposal.freelancerName}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                          {isTeam ? "Team / Studio" : "Candidate"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 block truncate font-mono">
                        @{proposal.freelancerHandle || "candidate"}
                      </span>
                    </div>

                    {/* Bio / Description */}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {isTeam
                        ? actingTeamInfo?.description || actingTeamInfo?.bio || "Representing registered creative team on this project workspace."
                        : proposal.freelancerBio || "Verified creative specialist on Ensemble."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <span>Talent Structure:</span>
                    <button
                      type="button"
                      onClick={() => handleViewProfile(proposal.freelancerAccountId, proposal.actingTeamId)}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <span>{isTeam ? "Shared Team Organization" : "Solo Freelancer Workspace"}</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: Target Job Post, Description, Budget Benchmark vs Proposed Bid */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 flex flex-col justify-between space-y-4 shadow-2xs text-left">
                <div className="space-y-3">
                  {/* Target Job Title & Client */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                        Target Job Posting
                      </span>
                      <button
                        type="button"
                        onClick={handleViewTargetJob}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        <span>View Job Post</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mt-0.5 line-clamp-1">
                      {proposal.jobTitle}
                    </h3>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Posted by <strong className="text-zinc-700 dark:text-zinc-300">You</strong> • Timeline: <strong className="text-zinc-700 dark:text-zinc-300">{proposal.jobTimeline}</strong>
                    </p>
                  </div>

                  {/* Clean Job Description Snippet */}
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {cleanJobDescription}
                    </p>
                  </div>

                  {/* Benchmark Budget vs Proposed Bid Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Client Budget Benchmark */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                        Your Budget Benchmark
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                        {proposal.jobBudgetType === "open" || (!proposal.jobMaxBudget && proposal.jobMinBudget > 0)
                          ? `From ${proposal.jobMinBudget.toLocaleString()} Cr (Open Bid)`
                          : proposal.jobMaxBudget > 0
                          ? `${proposal.jobMinBudget.toLocaleString()} ~ ${proposal.jobMaxBudget.toLocaleString()} Cr`
                          : "Open Bid"}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">Target Guideline</span>
                    </div>

                    {/* Candidate's Proposed Bid */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                        Candidate Proposed Bid
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                        <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{totalBid.toLocaleString()} Credits</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium block truncate">
                        Full Milestone Escrow
                      </span>
                    </div>
                  </div>
                </div>

                {/* Additional Work Rate Strip */}
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                      Additional Work Rate
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      +{proposal.additionalWorkRate}% per additional pass
                    </span>
                  </div>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                    +{overageRateBonus} Cr / extra pass
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: COVER LETTER PITCH & CLIENT SCREENING QUESTIONS
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
          <div
            onClick={() => setIsSection2Collapsed(!isSection2Collapsed)}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Cover Letter Pitch & Screening Questions
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                {proposal.screeningAnswers && proposal.screeningAnswers.length > 0 ? `${proposal.screeningAnswers.length} Q&A` : "Direct Pitch"}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection2Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection2Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!isSection2Collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 space-y-5"
              >
                {/* Cover Pitch Box */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Candidate's Proposal Pitch
                  </span>
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-2xs">
                    <JobRichText content={proposal.coverLetter} />
                  </div>
                </div>

                {/* Screening Questionnaire Responses */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Candidate's Screening Question Responses
                  </span>
                  {proposal.screeningAnswers && proposal.screeningAnswers.length > 0 ? (
                    <div className="space-y-3">
                      {proposal.screeningAnswers.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs text-left"
                        >
                          <p className="font-bold text-zinc-900 dark:text-white">
                            <span className="text-zinc-400 mr-1.5 font-semibold">Q{idx + 1}:</span>
                            {item.question}
                          </p>
                          <p className="text-zinc-600 dark:text-zinc-300 pl-4 border-l-2 border-zinc-300 dark:border-zinc-700">
                            {item.answer || <span className="text-zinc-400 italic">No answer provided.</span>}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 italic p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800">
                      No screening questions were specified for this project.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =========================================================================
            SECTION 3: TERMS OF SERVICE & CLIENT SPECIFICATIONS
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
          <div
            onClick={() => setIsSection3Collapsed(!isSection3Collapsed)}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Terms of Service & Job Specifications
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                {proposal.tosTitle || "Service Agreement"}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection3Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection3Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!isSection3Collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                  {/* LEFT: Candidate's Terms of Service */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                        Candidate's Service Agreement
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Binding terms proposed for project deliverables, rights, and workflow
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">
                          {proposal.tosTitle || "Custom Service Terms"}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {proposal.tosDescription || "Engagement Terms"}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-h-48 overflow-y-auto pr-1">
                        <JobRichText content={proposal.tosContent} />
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Client Project Specifications */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                        Target Job Specifications
                      </span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Expected skill profile, experience level, and timeline requirements
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
                      {/* Skills */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 block">
                          Required Skill Tags
                        </span>
                        {proposal.jobSkills && proposal.jobSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {proposal.jobSkills.map((sk: string, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">No specific skills tagged</span>
                        )}
                      </div>

                      {/* Experience & Timeline grid */}
                      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-700/60">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Experience Level</span>
                          <span className="font-bold text-zinc-900 dark:text-white capitalize">
                            {proposal.jobExperienceLevel}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">Target Timeline</span>
                          <span className="font-bold text-zinc-900 dark:text-white">
                            {proposal.jobTimeline}
                          </span>
                        </div>
                      </div>

                      {/* Headcount */}
                      <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700/60 flex items-center justify-between">
                        <span className="text-zinc-500">Target Role Headcount:</span>
                        <span className="font-bold text-zinc-900 dark:text-white">
                          {proposal.jobHiringType === "single" ? "Single Creative Talent (1)" : "Multiple Production Specialists"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =========================================================================
            SECTION 4: ATTACHED WORK SAMPLES
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
          <div
            onClick={() => setIsSection4Collapsed(!isSection4Collapsed)}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Attached Work Samples
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                {proposal.attachments && proposal.attachments.length > 0 ? `${proposal.attachments.length} Files` : "0 Files"}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection4Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection4Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!isSection4Collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6"
              >
                {proposal.attachments && proposal.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {proposal.attachments.map((file: any, idx: number) => {
                      const cloudfront = import.meta.env.VITE_CLOUDFRONT_URL || "";
                      const filePath = file.path || "";
                      const url = filePath ? `${cloudfront}${filePath.startsWith("/") ? "" : "/"}${filePath}` : "";
                      const fType = getFileType(file.mime_type, file.name);
                      const ext = file.name ? file.name.split(".").pop()?.toUpperCase() : "FILE";
                      const size = formatFileSize(file.size_bytes);

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-3 shadow-2xs text-left"
                        >
                          <div
                            onClick={() => url && setPreviewItem({ url, name: file.name, type: fType })}
                            className="h-11 w-11 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 cursor-pointer relative group border border-zinc-200 dark:border-zinc-700 flex items-center justify-center"
                          >
                            {fType === "image" && url ? (
                              <img src={url} alt={file.name} className="h-full w-full object-cover" />
                            ) : fType === "video" ? (
                              <Play className="h-4 w-4 text-purple-500" />
                            ) : fType === "audio" ? (
                              <Volume2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <FileText className="h-4 w-4 text-blue-500" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-zinc-900 dark:text-white truncate" title={file.name}>
                              {file.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-400 mt-0.5 font-medium">
                              <span>{ext}</span>
                              <span>•</span>
                              <span>{size}</span>
                            </div>
                          </div>

                          {url && (
                            <button
                              type="button"
                              onClick={() => setPreviewItem({ url, name: file.name, type: fType })}
                              className="px-2 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="Preview"
                            >
                              View
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 italic p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800 text-left">
                    No work sample files attached to this proposal.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =========================================================================
            SECTION 5: MILESTONES (HIGH-CRAFT ROADMAP CARDS)
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
          <div
            onClick={() => setIsSection5Collapsed(!isSection5Collapsed)}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Milestone Roadmap & Production Schedule ({proposal.milestones.length} Phases)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                {totalHours} hrs Total • 100% Balanced
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection5Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection5Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!isSection5Collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 space-y-4"
              >
                <div className="space-y-3.5">
                  {proposal.milestones.map((m: any, idx: number) => {
                    const pct = Number(m.percentage) || Math.round(100 / count);
                    const milestonePayout = Math.floor(totalBid * (pct / 100));
                    const theme = getPhaseTheme(idx);
                    const isTasksExpanded = Boolean(expandedMilestoneTasks[idx]);
                    const taskList = Array.isArray(m.tasks) ? m.tasks.filter(Boolean) : (m.description ? [m.description] : []);

                    return (
                      <div
                        key={m.id || idx}
                        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-5 shadow-2xs space-y-3 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 text-left"
                      >
                        {/* Top Header Row of Milestone Card */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Circular Phase Number Badge: (1), (2), (3), (4) */}
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${theme.circleBg}`}>
                              {idx + 1}
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                              {m.name || `Phase ${idx + 1}`}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
                            {/* Credits Pill */}
                            <div className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 shadow-2xs">
                              <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                              <span>{milestonePayout.toLocaleString()} Credits</span>
                            </div>

                            {/* Toggle Tasks Dropdown */}
                            <button
                              type="button"
                              onClick={() => toggleMilestoneTasks(idx)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title={isTasksExpanded ? "Collapse tasks" : "Expand tasks"}
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isTasksExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Secondary Tags Row */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-600 dark:text-zinc-300">
                          <div className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 flex items-center gap-1.5 font-medium">
                            <Clock className="h-3 w-3 text-zinc-400" />
                            <span>Duration: {m.hours} hrs ({Math.max(1, (m.hours / 24).toFixed(1))}d)</span>
                          </div>

                          <div className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 flex items-center gap-1.5 font-medium">
                            <Percent className="h-3 w-3 text-zinc-400" />
                            <span>% Budget Share: {pct}%</span>
                          </div>

                          <div className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 flex items-center gap-1.5 font-medium">
                            <RefreshCcw className="h-3 w-3 text-zinc-400" />
                            <span>{m.revisions} Revisions Included</span>
                          </div>
                        </div>

                        {/* Expandable Task Checklist */}
                        <AnimatePresence initial={false}>
                          {isTasksExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18, ease: "easeOut" }}
                              className="overflow-hidden pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2 text-xs"
                            >
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                                Phase Deliverables & Tasks
                              </span>
                              {taskList.length > 0 ? (
                                <div className="space-y-1.5">
                                  {taskList.map((task: string, tIdx: number) => (
                                    <div key={tIdx} className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                      <span>{task}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-zinc-400 italic">Core phase production & delivery tasks.</p>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =========================================================================
            SECTION 6: CANDIDATE PORTFOLIO & CASE STUDIES (WITH CLIENT SUMMARY BANNER)
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
          <div
            onClick={() => setIsSection6Collapsed(!isSection6Collapsed)}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Applicant Portfolio & Case Studies
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                {portfolioItems.length} Project{portfolioItems.length === 1 ? "" : "s"}
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection6Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection6Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!isSection6Collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6"
              >
                {/* Candidate Creative Track Record Summary Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/70 space-y-3.5 text-left mb-6 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <FolderOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                          <span>Candidate Creative Track Record</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            Verified Candidate
                          </span>
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Portfolio case studies and professional credentials submitted by {proposal.partyName}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleViewProfile(proposal.freelancerAccountId, proposal.actingTeamId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-2xs transition cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <span>View Full Public Profile</span>
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                        Case Studies
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white block">
                        {portfolioItems.length} Verified Project{portfolioItems.length === 1 ? "" : "s"}
                      </span>
                      <span className="text-[10px] text-zinc-400">Active portfolio assets</span>
                    </div>

                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                        Client Rating
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        <span>{Number(proposal.rating || 5.0).toFixed(1)} / 5.0</span>
                      </span>
                      <span className="text-[10px] text-zinc-400">Historical performance</span>
                    </div>

                    <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                        Talent Structure
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                        {proposal.actingTeamId || isTeam ? (
                          <>
                            <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span className="truncate">{actingTeamInfo?.name || "Creative Studio / Team"}</span>
                          </>
                        ) : (
                          <>
                            <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">Solo Specialist</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-zinc-400">Representation format</span>
                    </div>
                  </div>
                </div>

                <Profile_Portfolio
                  portfolioItems={portfolioItems}
                  isOwner={false}
                  isLoading={loadingPortfolio}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =========================================================================
            SECTION 7: CANDIDATE CREATIVE GALLERY & MEDIA WORKS
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
          <div
            onClick={() => setIsSection7Collapsed(!isSection7Collapsed)}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Applicant Creative Gallery & Media Works
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                Media Repository
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection7Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection7Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>

          <AnimatePresence initial={false}>
            {!isSection7Collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6"
              >
                <div className="mb-4 text-left">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Visual and audio media assets published by <strong className="text-zinc-800 dark:text-zinc-200">{proposal.partyName}</strong>:
                  </p>
                </div>
                <Profile_Gallery
                  accountId={proposal.freelancerAccountId || ""}
                  isOwner={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rejection Rationale (if rejected) */}
        {proposal.status === "Rejected" && proposal.rejectionReason && (
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs space-y-1 text-left">
            <span className="font-bold text-red-600 dark:text-red-400 uppercase flex items-center gap-1.5 text-[10px] tracking-wider">
              <ShieldAlert className="h-4 w-4" /> Decline Rationale
            </span>
            <p className="text-gray-700 dark:text-zinc-300 leading-relaxed pl-5.5">
              {proposal.rejectionReason}
            </p>
          </div>
        )}
      </motion.div>

      {/* =========================================================================
          STATIONARY DECISION BAR (STICKY BOTTOM BAR FOR CLIENT / AUTHOR)
         ========================================================================= */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 p-4 z-40 shadow-lg">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                openMarketplaceConversation({
                  contextType: "job_proposal",
                  contextId: proposal.id,
                  navigate,
                })
              }
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-700 dark:text-zinc-200 flex items-center gap-2 transition cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span>Chat with Candidate</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* If proposal is currently Hired */}
            {proposal.status === "Hired" && proposal.contractId && (
              <button
                onClick={() => navigate(`/contracts/${proposal.contractId}`)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="h-4 w-4" />
                <span>View Active Contract</span>
              </button>
            )}

            {/* If Offer was extended by client awaiting freelancer acceptance */}
            {(proposal.status === "Accepted" || proposal.status === "Approved") && (
              <span className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>Formal Offer Extended (Awaiting Candidate)</span>
              </span>
            )}

            {/* If pending review or shortlisted: author can shortlist, reject, or hire */}
            {(proposal.status === "Pending" || proposal.status === "Shortlisted") && (
              <>
                {/* Shortlist Toggle */}
                {proposal.status === "Shortlisted" ? (
                  <button
                    onClick={() => setIsUnshortlistModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-500" />
                    <span>Shortlisted</span>
                  </button>
                ) : (
                  <button
                    onClick={handleShortlist}
                    disabled={isShortlisting}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-amber-500/40 hover:text-amber-500 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Star className="h-3.5 w-3.5" />
                    <span>{isShortlisting ? "Saving..." : "Shortlist"}</span>
                  </button>
                )}

                {/* Decline Button */}
                <button
                  onClick={() => setIsRejectModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold transition cursor-pointer"
                >
                  Decline Proposal
                </button>

                {/* Hire Candidate Button */}
                <button
                  onClick={() => setIsAcceptConfirmOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Hire Candidate</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODALS & LIGHTBOX
         ========================================================================= */}

      {/* 1. Unshortlist Confirmation Modal */}
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

      {/* 2. Reject Proposal Modal */}
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

      {/* 3. Accept / Extend Formal Offer Modal */}
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

      {/* 4. Media Lightbox */}
      {previewItem &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
            onClick={() => setPreviewItem(null)}
          >
            <div
              className="relative max-w-4xl max-h-[85vh] w-full bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3.5 border-b border-white/10 bg-zinc-900/90 text-white text-xs font-semibold">
                <span className="truncate pr-4">{previewItem.name}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={previewItem.url}
                    download={previewItem.name}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs px-2.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewItem(null)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-black/40">
                {previewItem.type === "image" && (
                  <img
                    src={previewItem.url}
                    alt={previewItem.name}
                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg"
                  />
                )}
                {previewItem.type === "video" && (
                  <video
                    src={previewItem.url}
                    controls
                    autoPlay
                    className="max-h-[70vh] w-auto max-w-full rounded-lg"
                  />
                )}
                {previewItem.type === "audio" && (
                  <div className="p-8 text-center space-y-4">
                    <Volume2 className="h-16 w-16 text-blue-400 mx-auto animate-pulse" />
                    <p className="text-white text-sm font-semibold">{previewItem.name}</p>
                    <audio src={previewItem.url} controls autoPlay className="w-80" />
                  </div>
                )}
                {previewItem.type === "pdf" && (
                  <iframe
                    src={previewItem.url}
                    title={previewItem.name}
                    className="w-full h-[70vh] rounded-lg border border-white/10"
                  />
                )}
                {previewItem.type === "other" && (
                  <div className="text-center p-8 space-y-3">
                    <FileText className="h-16 w-16 text-zinc-400 mx-auto" />
                    <p className="text-sm font-bold text-white">{previewItem.name}</p>
                    <p className="text-xs text-zinc-400">Preview not supported for this file type.</p>
                  </div>
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
