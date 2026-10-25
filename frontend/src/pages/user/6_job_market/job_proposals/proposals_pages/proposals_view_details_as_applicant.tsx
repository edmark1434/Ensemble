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
  Tag,
  Crown,
} from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import { useJobs } from "@/hooks/useJobs";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import { getImageUrl } from "@/lib/utils";
import useGlobalState from "@/lib/global_state";
import { JobRichText } from "../../job_components/JobRichText";
import { toast } from "react-hot-toast";
import { showErrorToast } from "@/components/utility/toast";
import type { ProposalItemData } from "../proposals_components/proposals_list";
import { CreditIcon } from "@/components/ui/credit-icon";
import { openMarketplaceConversation } from "@/components/ui/inbox/marketplace_conversation";
import ProposalLifecycleTracker from "../proposals_components/ProposalLifecycleTracker";
import { Profile_Portfolio, type PortfolioItem } from "@/pages/user/7_profile/Displays/Body/Profile_Portfolio";
import { Profile_Gallery } from "@/pages/user/7_profile/Displays/Body/Profile_Gallery";
import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";

interface ActingTeamInfo {
  team_id: string;
  name: string;
  display_name?: string;
  team_name?: string;
  handle?: string;
  avatar_path?: string;
  banner_preset?: string;
  banner_url?: string;
  banner_path?: string;
  bio?: string;
  description?: string;
  members_count?: number;
  member_count?: number;
}

export const ProposalsViewDetailsAsApplicant: React.FC = () => {
  const { proposalId, contractId } = useParams<{ proposalId: string; contractId?: string }>();
  const navigate = useNavigate();
  const theme = useGlobalState((state) => state.theme);
  const user = useGlobalState((state) => state.user);
  const { pathname } = useLocation();
  const { fetchProposalById, withdrawProposal, acceptJobOffer, rejectContract } = useJobs();

  const [proposal, setProposal] = useState<any | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [actingTeamInfo, setActingTeamInfo] = useState<ActingTeamInfo | null>(null);

  // Decision Modal States
  const [isAcceptConfirmOpen, setIsAcceptConfirmOpen] = useState(!!contractId);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isRejectOfferModalOpen, setIsRejectOfferModalOpen] = useState(false);
  const [offerRejectReason, setOfferRejectReason] = useState("");
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Portfolio items state
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

          setProposal({
            id: p.proposal_id,
            jobId: p.job_id,
            contractId: p.contract_id,
            jobTitle: p.job_title || "Target Project",
            partyName: clientName,
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
            type: "sent",
            rejectionReason: p.reject_reason,
            job_milestone_id: p.job_milestone_id,
            target_milestone_title: p.target_milestone_title,
            target_milestone_description: p.target_milestone_description,
            viewedAt: p.viewed_at,
            shortlistedAt: p.shortlisted_at,
            actingTeamId: p.acting_team_id || p.freelancer_team_id || undefined,
            teamLeaderAccountId: p.team_leader_account_id || undefined,
            teamLeaderName: p.team_leader_name || undefined,
            totalTeamMemberCount: parseInt(p.total_team_member_count, 10) || 0,
            proposedByName: p.proposed_by_name || p.proposed_by_handle || undefined,
            proposedByHandle: p.proposed_by_handle || undefined,
            includedTeamMembers: Array.isArray(p.included_team_members) ? p.included_team_members : [],
            screeningAnswers: Array.isArray(p.screening_answers) ? p.screening_answers : [],
            attachments: Array.isArray(p.attachments) ? p.attachments : [],
            milestones: initialMilestones,
          });

          // Fetch team info if proposing as a team
          const teamId = p.acting_team_id || p.actingTeamId || p.freelancer_team_id;
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

  const [selectedPortfolioMemberId, setSelectedPortfolioMemberId] = useState<string>("all");
  const [memberPortfolioGroups, setMemberPortfolioGroups] = useState<
    {
      account_id: string;
      display_name: string;
      handle?: string;
      avatar_url?: string;
      is_leader?: boolean;
      is_proposer?: boolean;
      items: PortfolioItem[];
    }[]
  >([]);

  useEffect(() => {
    const accountId = proposal?.freelancerAccountId;
    const includedMembers = Array.isArray(proposal?.includedTeamMembers) ? proposal.includedTeamMembers : [];
    const cloudfront = import.meta.env.VITE_CLOUDFRONT_URL || "";

    const mapAttachment = (att: any, memberMeta?: { name: string; avatar?: string }): PortfolioItem => {
      const path = att.file_path || "";
      const fileUrl = path ? `${cloudfront}${path.startsWith("/") ? "" : "/"}${path}` : undefined;
      return {
        id: String(att.account_attachment_id || att.file_id || Math.random()),
        type: (att.attachment_kind === "link" ? "link" : "document") as "link" | "document",
        title: att.name || "Attachment",
        description: att.description || (att.attachment_kind === "link" ? att.external_url : att.file_name || "Document"),
        fileUrl,
        externalUrl: att.external_url || undefined,
        createdAt: att.created_at,
        ...(memberMeta ? { memberName: memberMeta.name, memberAvatar: memberMeta.avatar } : {}),
      };
    };

    if (includedMembers.length > 0) {
      let mounted = true;
      setLoadingPortfolio(true);
      Promise.allSettled(
        includedMembers.map(async (m: any) => {
          const mName = m.display_name || m.name || m.handle || "Member";
          const mAvatar = constructAvatarUrl(m.avatar_path, mName);
          const res = await api.get(`/api/accounts/profile/${m.account_id}/attachments`);
          const raw = Array.isArray(res.data?.attachments) ? res.data.attachments : [];
          return {
            account_id: String(m.account_id),
            display_name: mName,
            handle: m.handle,
            avatar_url: mAvatar,
            is_leader: Boolean(m.is_leader),
            is_proposer: Boolean(m.is_proposer),
            items: raw.map((att: any) => mapAttachment(att, { name: mName, avatar: mAvatar })),
          };
        })
      )
        .then((results) => {
          if (!mounted) return;
          const groups: typeof memberPortfolioGroups = [];
          const allCombined: PortfolioItem[] = [];
          for (const r of results) {
            if (r.status === "fulfilled" && r.value) {
              groups.push(r.value);
              allCombined.push(...r.value.items);
            }
          }
          setMemberPortfolioGroups(groups);
          setPortfolioItems(allCombined);
        })
        .catch((err) => console.error("Failed to load team member portfolios:", err))
        .finally(() => {
          if (mounted) setLoadingPortfolio(false);
        });
      return () => {
        mounted = false;
      };
    }

    if (!accountId) return;
    setLoadingPortfolio(true);
    setMemberPortfolioGroups([]);
    api.get(`/api/accounts/profile/${accountId}/attachments`)
      .then((attachmentsResponse) => {
        const items = (attachmentsResponse.data?.attachments || []).map((att: any) => mapAttachment(att));
        setPortfolioItems(items);
      })
      .catch((err) => console.error("Failed to load portfolio items:", err))
      .finally(() => setLoadingPortfolio(false));
  }, [proposal?.freelancerAccountId, proposal?.includedTeamMembers]);

  const handleConfirmAccept = async () => {
    if (!proposal || !proposal.contractId || isProcessing) return;
    setIsProcessing(true);
    try {
      await acceptJobOffer(proposal.contractId);
      setProposal((prev: any) =>
        prev
          ? {
              ...prev,
              status: "Hired",
              updatedAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            }
          : null
      );
      toast.success("You have successfully accepted the job offer!");
      setIsAcceptConfirmOpen(false);
      navigate(`/contracts/${proposal.contractId}`);
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
      setProposal((prev: any) =>
        prev
          ? {
              ...prev,
              status: "Rejected",
              rejectionReason: offerRejectReason,
              updatedAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            }
          : null
      );
      toast.success("Job offer declined.");
      setIsRejectOfferModalOpen(false);
    } catch (error: any) {
      console.error("Failed to reject offer:", error);
      showErrorToast(error.response?.data?.message || "Failed to decline offer.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!proposal || isWithdrawing) return;
    setIsWithdrawing(true);
    try {
      await withdrawProposal(proposal.id);
      setProposal((prev: any) =>
        prev
          ? {
              ...prev,
              status: "Withdrawn",
              updatedAt: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
            }
          : null
      );
      toast.success("Proposal successfully withdrawn.");
      setIsWithdrawModalOpen(false);
    } catch (error: any) {
      console.error("Failed to withdraw proposal:", error);
      showErrorToast(error.response?.data?.message || "Failed to withdraw proposal.");
    } finally {
      setIsWithdrawing(false);
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
    navigate(`/jobs/postings/${proposal.jobId}`);
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

  // User and Team banners
  const userBannerPreset = (user as any)?.banner_preset || null;
  const userBannerUrl = useMemo(() => {
    const preset = resolveBannerPreset(userBannerPreset, proposal?.freelancerHandle || proposal?.freelancerName || "freelancer");
    return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Blue.png";
  }, [userBannerPreset, proposal?.freelancerHandle, proposal?.freelancerName]);

  const teamBannerUrl = useMemo(() => {
    if (!proposal?.actingTeamId && !actingTeamInfo) return null;
    if (actingTeamInfo?.avatar_path || (actingTeamInfo as any)?.avatar_url) {
      return getImageUrl(actingTeamInfo.avatar_path || (actingTeamInfo as any).avatar_url);
    }
    if (actingTeamInfo?.banner_url || actingTeamInfo?.banner_path) {
      return getImageUrl(actingTeamInfo.banner_url || actingTeamInfo.banner_path);
    }
    if (actingTeamInfo?.banner_preset) {
      return bannerPresetUrl(actingTeamInfo.banner_preset) || "/profile_banner_presets/Ensemble%20Purple.png";
    }
    return "/profile_banner_presets/Ensemble%20Purple.png";
  }, [proposal?.actingTeamId, actingTeamInfo]);

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
              Loading Proposal Details
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Gathering application milestones, terms, and pitch...
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
            <p className="text-xs text-gray-500 dark:text-zinc-400">This proposal could not be retrieved or has been removed.</p>
          </div>
          <button
            onClick={() => navigate("/jobs/proposals/sent")}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer"
          >
            Return to Sent Proposals
          </button>
        </div>
      </div>
    );
  }

  // Financial Calculations
  const totalBid = proposal.bidAmount || 0;
  const count = proposal.milestones.length || 1;
  const netEarnings = Math.floor(totalBid * 0.9);
  const platformFee = Math.ceil(totalBid * 0.1);
  const totalHours = proposal.milestones.reduce((acc: number, m: any) => acc + (Number(m.hours) || 0), 0);
  const milestoneAveragePayout = Math.floor(totalBid / count);
  const overageRateBonus = Math.floor(milestoneAveragePayout * (proposal.additionalWorkRate / 100));

  const isJobDeleted = proposal?.jobStatus === "Deleted" || !!proposal?.jobDeletedAt;
  const isTeam = proposal.freelancerType === "Team" || Boolean(proposal.actingTeamId || proposal.freelancerTeamId);

  // Status Styling Badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
      case "Accepted":
        return {
          label: "ACCEPTED",
          className: "bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/50",
        };
      case "Hired":
        return {
          label: "HIRED",
          className: "bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-400/50",
        };
      case "Shortlisted":
        return {
          label: "SHORTLISTED",
          className: "bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/50",
        };
      case "Rejected":
        return {
          label: "DECLINED",
          className: "bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-400/50",
        };
      case "Withdrawn":
        return {
          label: "WITHDRAWN",
          className: "bg-zinc-100 text-zinc-800 border-zinc-300 dark:bg-zinc-700/40 dark:text-zinc-200 dark:border-zinc-500/50",
        };
      case "Pending":
      default:
        return {
          label: "PENDING",
          className: "bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-400/50",
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
        {/* Deleted Job Post Alert */}
        {isJobDeleted && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 shadow-xs">
            <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-red-600 dark:text-red-400">Target Job Post Deleted</h4>
              <p className="text-[11px] text-red-600/80 dark:text-red-400/80 mt-0.5">
                The client has closed or removed this job posting. Your proposal is archived.
              </p>
            </div>
          </div>
        )}

        {/* Top Navigation & Status Header with Master Collapse Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate("/jobs/proposals/sent")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-200 transition shrink-0 cursor-pointer shadow-xs"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Sent Proposals</span>
            </button>

            <span className="text-[11px] text-gray-500 dark:text-zinc-400">
              Proposal Ref: <span className="font-semibold text-gray-700 dark:text-zinc-300 font-mono">{proposal.id.slice(0, 8)}</span>
            </span>

            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border shadow-xs ${statusBadge.className}`}>
              <Tag className="h-3 w-3 shrink-0 opacity-90" />
              <span>{statusBadge.label}</span>
            </span>
          </div>

          {/* Master Collapse / Expand Button */}
          <button
            type="button"
            onClick={toggleAllSections}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 text-xs font-semibold transition cursor-pointer select-none"
          >
            {areAllSectionsCollapsed ? (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-zinc-500" />
                <span>Expand All Sections</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-zinc-500" />
                <span>Collapse All Sections</span>
              </>
            )}
          </button>
        </div>

        {/* ================= 4-STAGE PROPOSAL LIFECYCLE PROGRESSION ================= */}
        <ProposalLifecycleTracker currentStatus={proposal.status} />

        {/* =========================================================================
            SECTION 1: PROPOSAL REPRESENTATION & TARGET LISTING (MATCHING REVIEW STEP)
           ========================================================================= */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
          {/* Gray Section Header */}
          <div className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 text-left select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Proposal Representation & Target Listing
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
                {isTeam ? "Team / Studio" : "Solo Freelancer"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {proposal.status === "Pending" && (
                <button
                  type="button"
                  onClick={() => navigate(`/jobs/proposals/edit/${proposal.id}`)}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold px-2 py-1 transition cursor-pointer"
                >
                  <span>Edit Proposal</span>
                </button>
              )}
            </div>
          </div>

          {/* Section 1 Content */}
          <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* LEFT: Proposer Identity Card with Banner & Overlapping Avatar */}
              <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between overflow-hidden shadow-2xs text-left">
                {/* Banner Strip */}
                <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                  {isTeam ? (
                    <img
                      src={teamBannerUrl || "/profile_banner_presets/Ensemble%20Purple.png"}
                      alt="Team Banner"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/profile_banner_presets/Ensemble%20Purple.png";
                      }}
                    />
                  ) : (
                    <img
                      src={userBannerUrl}
                      alt="Profile Banner"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/profile_banner_presets/Ensemble%20Blue.png";
                      }}
                    />
                  )}
                  <div className="absolute top-3 right-3 z-10">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900/80 dark:bg-black/70 text-white backdrop-blur-xs border border-white/10 shadow-xs">
                      {isTeam ? "Team Proposing" : "Solo Proposing"}
                    </span>
                  </div>
                </div>

                {/* Card Content with Overlapping Avatar */}
                <div className="p-5 pt-0 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Overlapping Avatar */}
                    <div className="relative z-10 -mt-7 mb-2.5 flex items-end justify-between">
                      <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm shrink-0">
                        {proposal.freelancerAvatar ? (
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
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0">
                          {isTeam ? "Team" : "Myself"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 block truncate">
                        @{isTeam ? (actingTeamInfo?.handle || "team") : (proposal.freelancerHandle || "freelancer")}
                      </span>
                    </div>

                    {/* Bio / Description */}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                      {isTeam
                        ? actingTeamInfo?.description || actingTeamInfo?.bio || "Representing registered creative team on this project workspace."
                        : proposal.freelancerBio || "Proposing under your individual verified profile, track record, and portfolio."}
                    </p>

                    {/* Included Team Members Roster */}
                    {isTeam && Array.isArray(proposal.includedTeamMembers) && proposal.includedTeamMembers.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            Included Team Members ({proposal.includedTeamMembers.length}/
                            {Math.max(
                              proposal.totalTeamMemberCount || 0,
                              actingTeamInfo?.member_count || 0,
                              proposal.includedTeamMembers.length
                            )}{" "}
                            Total)
                          </span>
                          {(proposal.proposedByName || proposal.includedTeamMembers.find((m: any) => m.is_proposer)?.display_name) && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              Proposed by{" "}
                              <strong className="text-zinc-800 dark:text-zinc-200">
                                {proposal.proposedByName ||
                                  proposal.includedTeamMembers.find((m: any) => m.is_proposer)?.display_name}
                              </strong>
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {proposal.includedTeamMembers.map((m: any, idx: number) => {
                            const isOwnerLeader = Boolean(m.is_leader || m.role === "Owner");
                            const isProposer = Boolean(m.is_proposer);
                            const mName = m.display_name || m.name || m.handle || "Member";
                            const mAvatar = constructAvatarUrl(m.avatar_path || m.avatar_url || m.avatar, mName);
                            return (
                              <div
                                key={m.account_id || idx}
                                className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-xs text-zinc-800 dark:text-zinc-200 shadow-2xs select-none"
                              >
                                <div className="h-5 w-5 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0 border border-white dark:border-zinc-700 shadow-2xs">
                                  <img
                                    src={mAvatar}
                                    alt={mName}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = getFallbackAvatarUrl(mName);
                                    }}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <span className="font-medium text-xs truncate max-w-[120px]" title={mName}>
                                  {isProposer ? `${mName} (You)` : mName}
                                </span>
                                {isOwnerLeader && (
                                  <div className="relative group/leader inline-flex items-center shrink-0">
                                    <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 cursor-help" />
                                    <div
                                      role="tooltip"
                                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover/leader:opacity-100 transition-opacity duration-150 z-50 bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                                    >
                                      Team Leader
                                      <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-white dark:border-t-zinc-900" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <span>Contract Workspace:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {isTeam ? "Shared Team Project" : "Solo Freelancer Workspace"}
                    </span>
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
                        <span>View Full Job</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mt-0.5 line-clamp-1">
                      {proposal.jobTitle}
                    </h3>
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      Posted by <strong className="text-zinc-700 dark:text-zinc-300">{proposal.clientName}</strong> • Timeline: <strong className="text-zinc-700 dark:text-zinc-300">{proposal.jobTimeline}</strong>
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
                        Client Budget
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                        {proposal.jobBudgetType === "open" || (!proposal.jobMaxBudget && proposal.jobMinBudget > 0)
                          ? `From ${proposal.jobMinBudget.toLocaleString()} Cr (Open Bid)`
                          : proposal.jobMaxBudget > 0
                          ? `${proposal.jobMinBudget.toLocaleString()} ~ ${proposal.jobMaxBudget.toLocaleString()} Cr`
                          : "Open Bid"}
                      </span>
                      <span className="text-[10px] text-zinc-400 block">Reference Benchmark</span>
                    </div>

                    {/* Your Proposed Bid */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                        Your Proposed Bid
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-1 truncate">
                        <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span>{totalBid.toLocaleString()} Credits</span>
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block truncate">
                        Net: {netEarnings.toLocaleString()} Cr (-10% fee)
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
                    Cover Letter Pitch
                  </span>
                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-2xs">
                    <JobRichText content={proposal.coverLetter} />
                  </div>
                </div>

                {/* Screening Questionnaire Responses */}
                <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                    Answers to Client's Screening Questions
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
                      No screening questions were required for this proposal.
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
                Terms of Service & Client Specifications
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {/* LEFT: Terms of Service */}
                  <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-3 shadow-2xs text-left">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          My Terms of Service
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {proposal.tosTitle || "Contractual Agreement"}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 max-h-56 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        <JobRichText content={proposal.tosContent || "*Standard platform delivery and revision terms apply.*"} />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400">
                      <span>Preset: Standard Terms</span>
                      <span>Includes {proposal.additionalWorkRate}% Overtime Rate</span>
                    </div>
                  </div>

                  {/* RIGHT: Client Specifications */}
                  <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-3 shadow-2xs text-left">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                          Client Job Specifications
                        </span>
                        <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          From Job Post
                        </span>
                      </div>

                      {/* Required Skills */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                          Required Skills & Expertise
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {proposal.jobSkills && proposal.jobSkills.length > 0 ? (
                            proposal.jobSkills.map((skill: string, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-zinc-400">Creative production skills</span>
                          )}
                        </div>
                      </div>

                      {/* Timeline & Experience */}
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-[10px] uppercase text-zinc-400 block font-semibold">Experience Level</span>
                          <span className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 block">
                            {proposal.jobExperienceLevel}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                          <span className="text-[10px] uppercase text-zinc-400 block font-semibold">Target Timeline</span>
                          <span className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 block">
                            {proposal.jobTimeline}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/80">
                      <span>Headcount: 1 Contract Workspace</span>
                      <span>Phased Milestone Delivery</span>
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
            SECTION 6: APPLICANT PORTFOLIO & CASE STUDIES
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
                className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 space-y-5"
              >
                {isTeam && memberPortfolioGroups.length > 0 ? (
                  <div className="space-y-5">
                    {/* Member Selector Pills to Choose Whose Portfolio to View */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mr-1">
                          View Portfolio:
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedPortfolioMemberId("all")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                            selectedPortfolioMemberId === "all"
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                              : "bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>All Included ({portfolioItems.length})</span>
                        </button>

                        {memberPortfolioGroups.map((group) => {
                          const isSelected = selectedPortfolioMemberId === group.account_id;
                          return (
                            <button
                              key={group.account_id}
                              type="button"
                              onClick={() => setSelectedPortfolioMemberId(group.account_id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                  : "bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <img
                                src={group.avatar_url || getFallbackAvatarUrl(group.display_name)}
                                alt={group.display_name}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = getFallbackAvatarUrl(group.display_name);
                                }}
                                className="h-4 w-4 rounded-full object-cover shrink-0"
                              />
                              <span className="truncate max-w-[120px]">{group.display_name}</span>
                              {group.is_leader && (
                                <span
                                  className={`px-1.5 py-0.1 rounded text-[9px] font-bold ${
                                    isSelected
                                      ? "bg-white/25 text-white"
                                      : "bg-amber-500 text-white"
                                  }`}
                                >
                                  Team Leader
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-semibold ${
                                  isSelected ? "text-blue-100" : "text-zinc-400 dark:text-zinc-500"
                                }`}
                              >
                                ({group.items.length})
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {selectedPortfolioMemberId !== "all" && (
                        <button
                          type="button"
                          onClick={() => handleViewProfile(selectedPortfolioMemberId)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer self-start sm:self-auto shrink-0"
                        >
                          <span>View Member Profile</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filtered Portfolio Display */}
                    <Profile_Portfolio
                      portfolioItems={
                        selectedPortfolioMemberId === "all"
                          ? portfolioItems
                          : memberPortfolioGroups.find((g) => g.account_id === selectedPortfolioMemberId)?.items || []
                      }
                      isOwner={false}
                      isLoading={loadingPortfolio}
                    />
                  </div>
                ) : (
                  <Profile_Portfolio
                    portfolioItems={portfolioItems}
                    isOwner={false}
                    isLoading={loadingPortfolio}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* =========================================================================
            SECTION 7: APPLICANT CREATIVE GALLERY & MEDIA WORKS
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
                {isTeam && Array.isArray(proposal.includedTeamMembers) && proposal.includedTeamMembers.length > 0
                  ? `Combined Team Gallery (${proposal.includedTeamMembers.length} Members)`
                  : "Media Repository"}
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
                <Profile_Gallery
                  accountId={proposal.freelancerAccountId || ""}
                  memberAccounts={
                    isTeam && Array.isArray(proposal.includedTeamMembers) && proposal.includedTeamMembers.length > 0
                      ? proposal.includedTeamMembers
                      : undefined
                  }
                  unlimited={true}
                  isOwner={false}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rejection Rationale (if rejected) */}
        {proposal.status === "Rejected" && proposal.rejectionReason && (
          <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-xs space-y-1">
            <span className="font-bold text-red-600 dark:text-red-400 uppercase flex items-center gap-1.5 text-[10px] tracking-wider">
              <ShieldAlert className="h-4 w-4" /> Client Rejection Rationale
            </span>
            <p className="text-gray-700 dark:text-zinc-300 leading-relaxed pl-5.5">
              {proposal.rejectionReason}
            </p>
          </div>
        )}
      </motion.div>

      {/* =========================================================================
          STATIONARY DECISION BAR (STICKY BOTTOM BAR)
         ========================================================================= */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 p-4 z-40 shadow-lg">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
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
              <span>Chat with Client</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* If Offer was extended by client */}
            {(proposal.status === "Accepted" || proposal.status === "Approved") && proposal.contractId && (
              isTeam &&
              proposal.teamLeaderAccountId &&
              String(user?.account_id) !== String(proposal.teamLeaderAccountId) ? (
                <span className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>
                    Contract Offer Sent to Team Leader ({proposal.teamLeaderName || "Team Leader"}) — Awaiting Acceptance
                  </span>
                </span>
              ) : (
                <>
                  <button
                    onClick={() => setIsRejectOfferModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-bold transition cursor-pointer"
                  >
                    Decline Offer
                  </button>
                  <button
                    onClick={() => setIsAcceptConfirmOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Accept Job Offer</span>
                  </button>
                </>
              )
            )}

            {/* If proposal is currently Hired */}
            {proposal.status === "Hired" && proposal.contractId && (
              <button
                onClick={() => navigate(`/contracts/${proposal.contractId}`)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition flex items-center gap-2 cursor-pointer"
              >
                <Briefcase className="h-4 w-4" />
                <span>Go to Active Contract</span>
              </button>
            )}

            {/* If pending review: withdraw option */}
            {(proposal.status === "Pending" || proposal.status === "Shortlisted") && (
              <button
                onClick={() => setIsWithdrawModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:border-red-500/40 hover:text-red-500 text-xs font-semibold text-gray-600 dark:text-zinc-400 transition cursor-pointer"
              >
                Withdraw Proposal
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODALS & LIGHTBOX
         ========================================================================= */}

      {/* Media Lightbox */}
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
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setPreviewItem(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex items-center justify-center overflow-auto max-h-[75vh]">
                {previewItem.type === "image" && (
                  <img src={previewItem.url} alt={previewItem.name} className="max-h-[70vh] object-contain rounded-lg" />
                )}
                {previewItem.type === "video" && (
                  <video src={previewItem.url} controls autoPlay className="max-h-[70vh] w-full rounded-lg" />
                )}
                {previewItem.type === "audio" && (
                  <div className="p-8 w-full max-w-md text-center space-y-4">
                    <Volume2 className="h-12 w-12 text-blue-500 mx-auto animate-pulse" />
                    <audio src={previewItem.url} controls className="w-full" />
                  </div>
                )}
                {previewItem.type === "pdf" && (
                  <iframe src={previewItem.url} title={previewItem.name} className="w-full h-[70vh] rounded-lg" />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Accept Job Offer Confirmation Modal */}
      {isAcceptConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Accept Job Offer</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Formal engagement for {proposal.jobTitle}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-2 text-xs">
              <div className="flex justify-between text-gray-700 dark:text-zinc-300">
                <span>Total Escrow Deposit:</span>
                <span className="font-bold text-amber-500">{totalBid.toLocaleString()} Credits</span>
              </div>
              <div className="flex justify-between text-gray-700 dark:text-zinc-300">
                <span>Net Earnings (90%):</span>
                <span className="font-bold text-emerald-500">{netEarnings.toLocaleString()} Credits</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-zinc-400">
                <span>Milestones:</span>
                <span>{proposal.milestones.length} Phases</span>
              </div>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-600 dark:text-zinc-300 pt-1">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>I confirm that I accept the proposed scope, timeline, and terms of service for this project contract.</span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAcceptConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!agreedToTerms || isProcessing}
                onClick={handleConfirmAccept}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? "Processing..." : "Confirm & Start Contract"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Offer Modal */}
      {isRejectOfferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Decline Job Offer</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Are you sure you want to decline this job offer? The client will be notified.
            </p>
            <textarea
              value={offerRejectReason}
              onChange={(e) => setOfferRejectReason(e.target.value)}
              placeholder="Reason for declining (optional)..."
              rows={3}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-500/50 resize-none"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectOfferModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmRejectOffer}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {isProcessing ? "Declining..." : "Decline Offer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Withdraw Proposal</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to withdraw your proposal for <strong>{proposal.jobTitle}</strong>? The client will no longer see your submission as active.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
              >
                Keep Proposal
              </button>
              <button
                type="button"
                disabled={isWithdrawing}
                onClick={handleConfirmWithdraw}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Proposal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProposalsViewDetailsAsApplicant;
