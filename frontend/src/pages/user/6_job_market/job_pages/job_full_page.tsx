import { getBudgetDisplayInfo } from "@/lib/formatBudget";
import { resolveAvatarPath } from "@/lib/accountAvatars";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Briefcase,
  Users,
  User,
  Star,
  Bookmark,
  Share2,
  Flag,
  Edit2,
  Send,
  Wrench,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ZoomIn,
  X,
  ChevronDown,
  Paperclip,
  ExternalLink,
  Sparkles,
  Eye,
  Play,
  RotateCcw,
  TrendingUp,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import ShapeGrid from "@/components/ui/ShapeGrid";
import UserHeader from "@/components/nav/user_header";
import api from "@/lib/axios";
import useGlobalState from "@/lib/global_state";
import { CreditIcon } from "@/components/ui/credit-icon";
import { GuestLoginModal } from "@/components/ui/GuestLoginModal";
import { continueIfAccountVerified } from "@/lib/accountVerification";
import { JobRichText } from "../job_components/JobRichText";
import { JobsOtherPosts } from "../job_components/jobs_other_posts";
import PopupReportJob from "../job_components/job_popups/popup_report_job";
import type { Job } from "../job_components/job_lists";
import { computeJobRankingBreakdown } from "../job_ranking";
import { formatDistanceToNow } from "date-fns";

const CircularProgress: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
}> = ({ percentage, size = 36, strokeWidth = 3.5 }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0 select-none"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-gray-200 dark:stroke-white/10"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-blue-600 dark:stroke-blue-500 transition-all duration-500 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold font-mono text-gray-800 dark:text-zinc-100">
        {clamped}%
      </span>
    </div>
  );
};

const JobFullPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);
  const isVerified = useGlobalState((state) => state.isVerified);
  const theme = useGlobalState((state) => state.theme);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);
  const [isWorkflowOpen, setIsWorkflowOpen] = useState(true);
  const [isMilestonesOpen, setIsMilestonesOpen] = useState(true);
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [isExtending, setIsExtending] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const getTimeAgo = (date: Date) => {
    try {
      let str = formatDistanceToNow(date, { addSuffix: true });
      str = str
        .replace(/minutes?/, (m) => (m === "minutes" ? "mins" : "min"))
        .replace(/hours?/, (m) => (m === "hours" ? "hrs" : "hr"))
        .replace(/seconds?/, (m) => (m === "seconds" ? "secs" : "sec"))
        .replace(/days?/, "d")
        .replace(/months?/, "m")
        .replace(/years?/, (m) => (m === "years" ? "yrs" : "yr"))
        .replace("about ", "");
      return str;
    } catch {
      return "recently";
    }
  };

  useEffect(() => {
    const fetchJobDetails = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await api.get(`/api/jobs/${id}`);
        if (response.data && response.data.success && response.data.data) {
          const j = response.data.data;
          const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
          const mapUrl = (path?: string) => {
            if (!path) return "/placeholder.svg";
            if (path.startsWith("http") || path.startsWith("/")) return path;
            return `${cloudFrontUrl}/${path}`;
          };

          const minBudget = Number(j.rate_credits_min) || 0;
          const maxBudget = Number(j.rate_credits_max) || 0;
          const isTeamPost = Boolean(
            j.hiring_type === "team" ||
            j.is_team ||
            j.posted_as === "Team"
          );
          const bInfo = getBudgetDisplayInfo({
            minBudget,
            maxBudget,
            isTeam: isTeamPost,
            milestonesCount: Array.isArray(j.milestones) ? j.milestones.length : 0,
            positionsNeeded: j.positions_needed
          });
          const priceRange = bInfo.amountText;

          const isTeam = Boolean(
            j.hiring_type === "team" ||
            j.is_team ||
            j.posted_as === "Team"
          );

          const mappedJob: Job = {
            id: j.job_id || j.id,
            title: j.title,
            description: j.description || "",
            status: j.status || "Open",
            category: j.category || "General",
            difficulty: j.experience_level || "Intermediate",
            priceRange,
            minBudget,
            maxBudget,
            postedBy: j.client_name || j.client_handle || "Unknown",
            client_account_id: j.client_account_id,
            clientAvatar: resolveAvatarPath(j.client_avatar_path),
            postedAt: new Date(j.created_at).toLocaleString(),
            createdAt: j.created_at,
            updatedAt: j.updated_at ? `Updated ${new Date(j.updated_at).toLocaleDateString()}` : undefined,
            timeAgo: getTimeAgo(new Date(j.created_at)),
            clientRating: parseFloat(j.client_rating) || 0,
            ratingCount: parseInt(j.client_rating_count) || 0,
            positionsNeeded: Number(j.no_of_hires) || 1,
            hiredCount: parseInt(j.hired_count) || 0,
            applicantsCount: parseInt(j.applicant_count) || 0,
            savesCount: parseInt(j.saves_count) || 0,
            timeline: `${j.timeline_min || 0}-${j.timeline_max || 0} Days`,
            thumbnail: mapUrl(j.thumbnail_path || j.thumbnail),
            skills: j.tags || [],
            isSaved: Boolean(j.is_saved),
            isOwnPost: Boolean(j.is_own_post),
            isManageablePost: Boolean(j.is_manageable_post),
            isPersonalPost: Boolean(j.is_personal_post),
            hasProposed: Boolean(j.has_proposed),
            myProposalId: j.my_proposal_id || null,
            team_id: j.team_id || null,
            teamId: j.team_id || null,
            team_visibility: j.team_visibility || null,
            teamVisibility: j.team_visibility || null,
            is_team: isTeam,
            isTeam: isTeam,
            posted_as: j.posted_as,
            hiring_type: j.hiring_type || (isTeam ? "team" : "single"),
            milestones: Array.isArray(j.milestones) ? j.milestones : [],
            deadline: j.rough_deadline ? new Date(j.rough_deadline).toLocaleDateString() : undefined,
            requireNDA: Boolean(j.require_nda),
            portfolioUseAllowed: Boolean(j.portfolio_use_allowed),
            portfolioDuration: j.portfolio_use_duration_seconds || null,
            isExistingProject: Boolean(j.is_existing_project),
            existingProjectId: j.existing_project_id || null,
            initiatorRole: j.initiator_role || "Client",
            attachments: Array.isArray(j.attachments) ? j.attachments : [],
            screeningQuestions: Array.isArray(j.screening_questions) ? j.screening_questions : [],
            shortlistedCount: parseInt(j.shortlisted_count) || 0,
            clientHireRate: typeof j.client_hire_rate === "number" ? j.client_hire_rate : (parseInt(j.client_hire_rate) || 100),
            clientLastActive: j.client_last_active ? getTimeAgo(new Date(j.client_last_active)) : undefined,
            applicationDeadline: j.application_deadline,
            isUrgent: Boolean(j.is_urgent),
            hardDeadline: j.hard_deadline,
            freeExtensionCount: parseInt(j.free_extension_count, 10) || 0,
            applicationExtendedAt: j.application_extended_at,
            postingFeeCredits: parseInt(j.posting_fee_credits, 10) || 50
          };

          setJob(mappedJob);
        } else {
          setJob(null);
        }
      } catch (error) {
        console.error("Failed to fetch job details:", error);
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    fetchJobDetails();
  }, [id, reloadTrigger]);

  const [isExpireModalOpen, setIsExpireModalOpen] = useState(false);

  const handleExecuteExpireNow = async () => {
    if (!job) return;
    setIsExpiring(true);
    setActionSuccessMsg(null);
    try {
      const res = await api.post(`/api/jobs/${job.id}/expire-now`);
      if (res.data?.success) {
        setActionSuccessMsg(res.data.message || "Job closed and 50 credits refunded to your wallet.");
        setReloadTrigger((prev) => prev + 1);
        setIsExpireModalOpen(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to expire job");
    } finally {
      setIsExpiring(false);
    }
  };

  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    if (!job?.applicationDeadline) {
      setCountdown("");
      return;
    }

    const calcTime = () => {
      const targetTime = new Date(job.applicationDeadline).getTime();
      const diffMs = targetTime - Date.now();

      if (diffMs <= 0) {
        setCountdown("00h 00m 00s");
        return;
      }

      const totalSec = Math.floor(diffMs / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n: number) => String(n).padStart(2, "0");
      if (days > 0) {
        setCountdown(`${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      } else {
        setCountdown(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
      }
    };

    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [job?.applicationDeadline]);

  const nowTime = new Date().getTime();
  const appDeadlineTime = job?.applicationDeadline ? new Date(job.applicationDeadline).getTime() : null;
  const isWindowExpired = Boolean(
    job?.status?.toLowerCase() === "expired" ||
    job?.status?.toLowerCase() === "closed" ||
    (appDeadlineTime && appDeadlineTime <= nowTime)
  );
  const hoursRemaining = appDeadlineTime ? Math.max(0, Math.round((appDeadlineTime - nowTime) / (1000 * 60 * 60))) : null;

  const isTeam = Boolean(
    job?.is_team ||
    job?.isTeam ||
    job?.posted_as?.toLowerCase() === "team" ||
    job?.team_id ||
    job?.teamId
  );
  const teamVisibility = String(job?.team_visibility || job?.teamVisibility || "").toLowerCase();
  const isPrivateTeam = isTeam && teamVisibility === "private";
  const targetTeamId = job?.team_id || job?.teamId;
  const rankInfo = job ? computeJobRankingBreakdown(job) : null;
  const isTeamHiring = Boolean(
    job?.hiring_type === "team" ||
    (Array.isArray(job?.milestones) && job.milestones.length > 0)
  );

  const handleViewProfile = () => {
    if (!job) return;
    if (isTeam && targetTeamId) {
      navigate(`/teams/${encodeURIComponent(targetTeamId)}`);
      return;
    }
    if (job.isPersonalPost) {
      navigate("/profile");
    } else if (job.client_account_id) {
      navigate(`/profile/${job.client_account_id}`);
    }
  };

  const handleToggleSave = async () => {
    if (!job || isGuestMode) return;
    const previousSaved = job.isSaved;
    const previousCount = job.savesCount;

    setJob((prev) =>
      prev
        ? {
            ...prev,
            isSaved: !previousSaved,
            savesCount: previousSaved ? Math.max(0, previousCount - 1) : previousCount + 1
          }
        : null
    );

    try {
      await api.post(`/api/jobs/${job.id}/save`);
    } catch {
      setJob((prev) =>
        prev
          ? {
              ...prev,
              isSaved: previousSaved,
              savesCount: previousCount
            }
          : null
      );
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job?.title,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (loading) {
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
              Loading Job Post Details
            </h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Retrieving project brief, budget specifications, and workflow terms...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Job Post Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mt-2">
          The job post you are looking for does not exist or has been removed.
        </p>
        <button
          onClick={() => navigate("/jobs/postings")}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
        >
          Back to Job Market
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-base flex flex-col w-full relative">
      {/* Sticky Top Headers Container */}
      <div className="sticky top-0 z-40 bg-white dark:bg-dark-base flex flex-col border-b border-gray-200 dark:border-white/10 shadow-sm">
        <div className="z-50">
          <UserHeader pageTitle="Job Market" />
        </div>
        <div className="border-b border-gray-200 dark:border-white/10 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/jobs/postings")}
            className="flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Job Market
          </button>
          {job && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                title="Share Job"
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400 cursor-pointer"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {!isGuestMode && (
                <button
                  onClick={handleToggleSave}
                  title="Save Job Post"
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                    job.isSaved ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <Bookmark className={`h-4 w-4 ${job.isSaved ? "fill-current" : ""}`} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1200px] w-full mx-auto py-8 px-4">
        {loading || !job ? (
          /* SKELETON LOADER */
          <div className="w-full flex flex-col lg:flex-row gap-8 items-start animate-pulse">
            <div className="flex-1 min-w-0 space-y-6 w-full">
              <div className="flex items-center gap-2 pt-2">
                <div className="h-6 w-16 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-6 w-24 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-6 w-28 rounded bg-gray-200 dark:bg-zinc-800" />
              </div>
              <div className="space-y-2">
                <div className="h-8 w-3/4 rounded-xl bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-zinc-800" />
              </div>
              <div className="w-full h-64 sm:h-80 md:h-96 rounded-2xl bg-gray-200 dark:bg-zinc-800" />
              <div className="space-y-2 pt-4">
                <div className="h-5 w-48 rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-zinc-800" />
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-zinc-800" />
              </div>
            </div>

            <div className="w-full lg:w-[400px] shrink-0 space-y-4 pt-2">
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 h-20" />
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-base h-72" />
            </div>
          </div>
        ) : (
          /* FULL PAGE 2-COLUMN VIEW */
          <div className="w-full flex flex-col lg:flex-row gap-8 items-start">
            {/* LEFT COLUMN */}
            <div className="flex-1 min-w-0 space-y-6">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`relative overflow-hidden px-2.5 py-1 rounded text-[11px] font-black border ${
                    job.status?.toLowerCase() === "open"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.25)] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40"
                      : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                  }`}
                >
                  <span className="relative z-10">{job.status}</span>
                  {job.status?.toLowerCase() === "open" && (
                    <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-emerald-400/30 to-transparent" />
                  )}
                </span>

                <span className="px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-bold text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                  {job.category}
                </span>

                <span className="px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-bold text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                  {job.difficulty}
                </span>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-medium text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span>Timeline: {job.timeline}</span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-100 dark:bg-white/5 text-[11px] font-medium text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/10">
                  <Users className="h-3.5 w-3.5 text-gray-500" />
                  <span>{job.positionsNeeded} {job.positionsNeeded === 1 ? "Opening" : "Openings"}</span>
                </div>
                {rankInfo?.isRisingJob && (
                  <button
                    type="button"
                    onClick={() => navigate("/jobs/info")}
                    title={`Rising Job Post — Click to see how this badge works (Score: ${rankInfo.totalScore})`}
                    className="relative overflow-hidden inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 hover:bg-emerald-200/90 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 dark:hover:bg-emerald-500/35 shadow-xs transition-colors cursor-pointer"
                  >
                    <TrendingUp className="relative z-10 h-3 w-3" />
                    <span className="relative z-10">Rising</span>
                    <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent pointer-events-none" />
                  </button>
                )}
                <div className="hidden">
                </div>
              </div>

              {/* Title & Actions */}
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
                    {job.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-zinc-500 mt-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>Posted {job.postedAt}</span>
                    </div>
                    {job.updatedAt && (
                      <div className="flex items-center gap-1.5 text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-md border border-gray-300 dark:border-zinc-700 text-xs font-semibold shadow-2xs">
                        <RefreshCw className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                        <span>{job.updatedAt}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {job.isManageablePost ? (
                    <button
                      onClick={() => navigate(`/jobs/edit/${job.id}`)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-blue-600/40 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-500/25 transition shadow-2xs cursor-pointer"
                      title="Edit Job Post"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit Post</span>
                    </button>
                  ) : !job.isOwnPost && !isGuestMode ? (
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-zinc-400 font-bold text-xs hover:bg-gray-50 dark:hover:bg-white/10 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                      title="Report Job"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      <span>Report</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Action Success Alert */}
              {actionSuccessMsg && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 p-4 flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{actionSuccessMsg}</span>
                  </div>
                  <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Closed Job Notice */}
              {(job.status?.toLowerCase() === "expired" || job.status?.toLowerCase() === "closed") && (
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/40 p-4 flex items-center justify-between gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>This job post is closed.</span>
                  </div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {job.isOwnPost ? "Posting fee was refunded to your wallet." : "Proposal intake has closed."}
                  </span>
                </div>
              )}

              {/* Application Window Status Banner (Shown to Owner & Applicants while Open / Active) */}
              {job && job.applicationDeadline && (job.status === "Open" || job.status === "Active") && (
                <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/70 dark:bg-zinc-900/60 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-amber-400 dark:border-l-amber-400 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm tracking-tight whitespace-nowrap">
                      Application Window Status
                    </span>
                    {countdown && (
                      <span
                        className="px-2.5 py-0.5 rounded-md bg-gray-200/90 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 text-xs font-bold tracking-tight whitespace-nowrap"
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      >
                        {countdown}
                      </span>
                    )}
                  </div>

                  {/* Expire & Refund button: only visible if 0 proposals */}
                  {(job.isManageablePost || job.isOwnPost) && (job.applicantsCount || 0) === 0 && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isExpiring}
                        onClick={() => setIsExpireModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-gray-50 dark:hover:bg-zinc-700/60 text-gray-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition shadow-2xs active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{isExpiring ? "Processing..." : `Expire & Refund ${job.postingFeeCredits || 50} Cr`}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Main Thumbnail Banner with Overlays */}
              <div
                onClick={() => {
                  if (job.thumbnail && !job.thumbnail.includes("placeholder")) {
                    setActiveLightboxImg(job.thumbnail);
                  }
                }}
                className="w-full h-64 sm:h-80 md:h-96 rounded-2xl overflow-hidden bg-gray-100 dark:bg-white/5 relative border border-gray-200 dark:border-white/10 group cursor-pointer"
              >
                <img
                  src={job.thumbnail}
                  alt={job.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/placeholder.svg";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                {/* Top stats pills */}
                <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/10 shadow-sm">
                    <Send className="h-3.5 w-3.5 text-blue-400" />
                    <span>{job.applicantsCount} Proposals</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/10 shadow-sm">
                    <Briefcase className="h-3.5 w-3.5 text-amber-400" />
                    <span>{job.hiredCount} / {job.positionsNeeded} Hired</span>
                  </div>
                </div>

                {/* Posted time ago */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white text-xs font-medium drop-shadow-md z-10">
                  <Clock className="h-3.5 w-3.5 text-zinc-300" />
                  <span>Posted {job.timeAgo}</span>
                </div>

                {/* Expand overlay */}
                <div className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/60 backdrop-blur-md text-white/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-bold">
                  <ZoomIn className="h-4 w-4" />
                  <span>Expand</span>
                </div>

                {/* Skills tags overlay */}
                {job.skills && job.skills.length > 0 && (
                  <div className="absolute bottom-12 left-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-zinc-300 shadow-sm shrink-0">
                        <Wrench className="h-3.5 w-3.5" />
                      </div>
                      {job.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-xs font-semibold text-white shadow-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scope of Work & Requirements */}
              <section className="pt-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">
                  Scope of Work & Requirements
                </h3>
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] text-sm text-gray-700 dark:text-zinc-300 leading-relaxed shadow-sm">
                  <JobRichText content={job.description} />
                </div>
              </section>

              {/* Project Briefs & Reference Attachments (1.B) */}
              {job.attachments && job.attachments.length > 0 && (
                <section className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                      Project Briefs & Attached Documents ({job.attachments.length})
                    </h4>
                    <span className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                      {job.attachments.length} {job.attachments.length === 1 ? "file" : "files"} attached
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {job.attachments.map((att: any, idx: number) => {
                      const cloudFrontUrl = import.meta.env.VITE_CLOUDFRONT_URL || "";
                      const fileUrl = att.url || (att.path ? `${cloudFrontUrl}/${att.path.replace(/^\//, "")}` : "#");
                      const fileName = att.name || att.file_name || `Project Brief #${idx + 1}`;
                      const sizeBytes = att.size_bytes || att.size || 0;
                      const mime = (att.mime_type || "").toLowerCase();
                      const ext = (fileName.split(".").pop() || "").toLowerCase();
                      const isImage = mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
                      const isVideo = mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv", "avi"].includes(ext);
                      const isPdf = mime === "application/pdf" || ext === "pdf";

                      const formatSize = (bytes: number) => {
                        if (!bytes || bytes <= 0) return "";
                        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                      };

                      return (
                        <div
                          key={att.file_id || idx}
                          className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 overflow-hidden shadow-2xs hover:shadow-md hover:border-gray-300 dark:hover:border-white/20 transition-all flex flex-col justify-between"
                        >
                          {/* Visual Preview / Media Display */}
                          <div className="relative w-full h-40 bg-gray-100 dark:bg-black/30 overflow-hidden flex items-center justify-center">
                            {isImage && fileUrl !== "#" ? (
                              <img
                                src={fileUrl}
                                alt={fileName}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : isVideo && fileUrl !== "#" ? (
                              <div className="relative w-full h-full bg-black/80 flex items-center justify-center">
                                <video
                                  src={fileUrl}
                                  className="w-full h-full object-contain"
                                  preload="metadata"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none group-hover:bg-black/40 transition-colors">
                                  <span className="w-10 h-10 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-md">
                                    <Play className="h-5 w-5 fill-current ml-0.5" />
                                  </span>
                                </div>
                              </div>
                            ) : isPdf ? (
                              <div className="relative w-full h-full bg-red-50/50 dark:bg-red-950/20 flex flex-col items-center justify-center p-3 text-center">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-2 shadow-xs">
                                  <FileText className="h-6 w-6" />
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500 text-white uppercase tracking-wider">
                                  PDF Document
                                </span>
                              </div>
                            ) : (
                              <div className="relative w-full h-full bg-gray-50 dark:bg-zinc-800/50 flex flex-col items-center justify-center p-3 text-center">
                                <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-zinc-300 flex items-center justify-center mb-2 shadow-xs">
                                  <Paperclip className="h-6 w-6" />
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 uppercase tracking-wider">
                                  {ext.toUpperCase() || "File"}
                                </span>
                              </div>
                            )}

                            {/* Action Overlay: Click to Preview / View */}
                            {fileUrl !== "#" && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                {isImage ? (
                                  <button
                                    type="button"
                                    onClick={() => setActiveLightboxImg(fileUrl)}
                                    className="px-3 py-1.5 rounded-lg bg-white/90 text-gray-900 text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-white transition cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>View Image</span>
                                  </button>
                                ) : (
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-white/90 text-gray-900 text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-white transition cursor-pointer"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span>Open File</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Info Bar at Bottom */}
                          <div className="p-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-2 bg-white dark:bg-zinc-900/60">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-900 dark:text-white truncate" title={fileName}>
                                {`Project Brief #${idx + 1}`}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-gray-600 dark:text-zinc-400 font-medium truncate max-w-[120px]" title={fileName}>
                                  {fileName}
                                </span>
                                {sizeBytes > 0 && (
                                  <span className="text-[10px] text-gray-400 dark:text-zinc-500">
                                    • {formatSize(sizeBytes)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {fileUrl !== "#" && (
                              <div className="flex items-center gap-1 shrink-0">
                                {isImage && (
                                  <button
                                    type="button"
                                    onClick={() => setActiveLightboxImg(fileUrl)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                    title="View full image"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={fileName}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
                                  title="Download or open in new tab"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Screening Questions Notice (1.A) */}
              {job.screeningQuestions && job.screeningQuestions.length > 0 && (
                <section className="p-4 rounded-2xl border border-blue-200/60 dark:border-blue-500/20 bg-blue-50/50 dark:bg-blue-500/5 space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Client Screening Questions Required ({job.screeningQuestions.length})
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-zinc-300">
                    The client has set dealbreaker questions for applicants. You will be prompted to answer them when submitting your proposal:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-700 dark:text-zinc-200 pl-1 font-medium">
                    {job.screeningQuestions.map((q: string, idx: number) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Team Milestones (When applicable) */}
              {isTeamHiring && Array.isArray(job.milestones) && job.milestones.length > 0 && (
                <section className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm overflow-hidden backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() => setIsMilestonesOpen((prev) => !prev)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-500" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                        Milestones & Roles Allocation ({job.milestones.length})
                      </h3>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${
                        isMilestonesOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence initial={false}>
                    {isMilestonesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-gray-100 dark:border-white/5"
                      >
                        <div className="p-4 space-y-3">
                          {job.milestones.map((m: any, idx: number) => {
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

              {/* Required Skills Section */}
              {job.skills && job.skills.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-gray-400" />
                    Required Skills & Qualifications
                  </h4>
                  <div className="flex flex-wrap gap-2 p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm">
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT COLUMN (STICKY SIDEBAR) */}
            <div className="w-full lg:w-[400px] shrink-0 space-y-4 pt-2 sticky top-[160px]">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm backdrop-blur-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-10 w-10 shrink-0">
                    <img
                      src={job.clientAvatar}
                      alt={job.postedBy}
                      className={`h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-white/10 ${!job.clientAvatar ? 'hidden' : ''}`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling;
                        if (fallback) {
                          fallback.classList.remove('hidden');
                          fallback.classList.add('flex');
                        }
                      }}
                    />
                    <div className={`${job.clientAvatar ? 'hidden' : 'flex'} absolute inset-0 items-center justify-center rounded-full bg-gray-200 dark:bg-zinc-800 text-sm font-bold text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 overflow-hidden`}>
                      {job.postedBy ? job.postedBy.charAt(0).toUpperCase() : "U"}
                    </div>
                  </div>

                  <div className="text-left min-w-0">
                    <p className="text-[10px] uppercase text-gray-500 dark:text-zinc-500 font-bold tracking-wider">
                      {isTeam ? "Project Team" : "Project Client"}
                    </p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {job.postedBy}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span>{job.ratingCount > 0 ? `${job.clientRating} (${job.ratingCount})` : "N/A"}</span>
                    </div>
                  </div>
                </div>

                {!isPrivateTeam && (
                  <button
                    onClick={handleViewProfile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white transition shrink-0 cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                    <span>{isTeam ? "View Team" : "View Profile"}</span>
                  </button>
                )}
              </div>

              {/* Owner Job Discovery Score Card (Gray, Collapsible, Closed by Default) */}
              {job.isOwnPost && rankInfo && (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-white/[0.03] overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => setIsScoreOpen((prev) => !prev)}
                    className="w-full p-4 flex items-center justify-between gap-2 hover:bg-gray-100/60 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        Your Job Discovery Score
                      </span>
                      {rankInfo.isRisingJob && (
                      <span className="relative overflow-hidden inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border-2 border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 shrink-0 shadow-xs">
                        <TrendingUp className="relative z-10 h-2.5 w-2.5" />
                        <span className="relative z-10">Rising</span>
                        <span className="absolute inset-0 -translate-x-full animate-badge-shine bg-gradient-to-r from-transparent via-white/50 dark:via-white/30 to-transparent pointer-events-none" />
                      </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black text-gray-900 dark:text-white font-mono">
                        {rankInfo.totalScore.toFixed(1)} / 100
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${
                          isScoreOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isScoreOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-gray-200/70 dark:border-white/10"
                      >
                        <div className="p-4 space-y-2.5">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-zinc-400">
                            <span>Evaluated as: <strong className="text-gray-700 dark:text-zinc-200">{rankInfo.jobTypeLabel}</strong></span>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-dark-base/80 border border-gray-200/80 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 truncate">
                                  Trust <span className="font-mono text-[10px] text-gray-400 dark:text-zinc-500">(35)</span>
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-mono mt-0.5">
                                  {(rankInfo.bayesianScore * 35).toFixed(1)}
                                </div>
                              </div>
                              <CircularProgress percentage={rankInfo.bayesianScore * 100} size={36} strokeWidth={3.5} />
                            </div>

                            <div className="p-2.5 rounded-xl bg-white dark:bg-dark-base/80 border border-gray-200/80 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 truncate">
                                  Freshness <span className="font-mono text-[10px] text-gray-400 dark:text-zinc-500">(25)</span>
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-mono mt-0.5">
                                  {(rankInfo.freshnessScore * 25).toFixed(1)}
                                </div>
                              </div>
                              <CircularProgress percentage={rankInfo.freshnessScore * 100} size={36} strokeWidth={3.5} />
                            </div>

                            <div className="p-2.5 rounded-xl bg-white dark:bg-dark-base/80 border border-gray-200/80 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 truncate">
                                  Brief & Bid <span className="font-mono text-[10px] text-gray-400 dark:text-zinc-500">(25)</span>
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-mono mt-0.5">
                                  {(rankInfo.completenessScore * 25).toFixed(1)}
                                </div>
                              </div>
                              <CircularProgress percentage={rankInfo.completenessScore * 100} size={36} strokeWidth={3.5} />
                            </div>

                            <div className="p-2.5 rounded-xl bg-white dark:bg-dark-base/80 border border-gray-200/80 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs">
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-gray-500 dark:text-zinc-400 truncate">
                                  Open Seats <span className="font-mono text-[10px] text-gray-400 dark:text-zinc-500">(15)</span>
                                </div>
                                <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white font-mono mt-0.5">
                                  {(rankInfo.availabilityScore * 15).toFixed(1)}
                                </div>
                              </div>
                              <CircularProgress percentage={rankInfo.availabilityScore * 100} size={36} strokeWidth={3.5} />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 pt-1">
                            <span>
                              {rankInfo.completenessScore >= 0.85
                                ? "85%+ brief & bid quality!"
                                : "Add 3+ skills & scope for 85%+"}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigate("/jobs/info")}
                              className="inline-flex items-center gap-1 font-semibold text-gray-700 dark:text-zinc-200 hover:underline shrink-0 cursor-pointer"
                            >
                              <HelpCircle className="h-3 w-3" />
                              How it works
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Budget & Action Box */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-dark-base shadow-sm p-6 space-y-5">
                <div>
{(() => {
                    const bDisplay = getBudgetDisplayInfo({
                      minBudget: job.minBudget,
                      maxBudget: job.maxBudget,
                      isTeam: isTeamHiring,
                      milestonesCount: job.milestones?.length || 0,
                      positionsNeeded: job.positionsNeeded,
                    });
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-zinc-500 tracking-wider">
                            Budget Benchmark
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${bDisplay.tagColorClass}`}>
                            {bDisplay.tagLabel}
                          </span>
                        </div>
                        <div className="text-2xl font-black text-amber-500 dark:text-amber-400 flex items-center gap-2 leading-none">
                          <CreditIcon className="h-6 w-6 text-amber-500 dark:text-amber-400 shrink-0" />
                          <span>{bDisplay.amountText}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                          {bDisplay.subtitle}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Key stats row */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-white/5 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">
                      Timeline
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-zinc-200">
                      {job.timeline}
                    </span>
                  </div>
                  {job.deadline && (
                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-0.5">
                        Deadline
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-zinc-200">
                        {job.deadline}
                      </span>
                    </div>
                  )}
                </div>

                {/* Proposals and Openings summary */}
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400 font-medium pt-2 border-t border-gray-100 dark:border-white/5">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                    <strong>{job.hiredCount} / {job.positionsNeeded}</strong> Hired
                  </span>
                  <span className="flex items-center gap-1">
                    <Send className="h-3.5 w-3.5 text-gray-400" />
                    <strong>{job.applicantsCount}</strong> Proposals
                  </span>
                  <span className="flex items-center gap-1">
                    <Bookmark className="h-3.5 w-3.5 text-gray-400" />
                    <strong>{job.savesCount}</strong> Saves
                  </span>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  {job.isOwnPost && !job.isManageablePost ? (
                    <div className="w-full rounded-xl border border-blue-500/20 bg-blue-500/10 py-3 text-center text-xs font-bold text-blue-400">
                      This job was posted by a Team you belong to
                    </div>
                  ) : !job.isOwnPost ? (
                    job.hasProposed ? (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => navigate(`/jobs/proposals/sent/${job.myProposalId}`)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 py-3.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition active:scale-[0.98] cursor-pointer"
                        >
                          <FileText className="h-4 w-4" /> View your Proposal
                        </button>
                        {isTeamHiring && (
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 text-center block">
                            You have applied for a milestone role on this team project.
                          </span>
                        )}
                      </div>
                    ) : isWindowExpired ? (
                      <div className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800/60 py-3.5 text-center text-xs font-bold text-zinc-500 dark:text-zinc-400 select-none">
                        Application Window Closed
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <button
                          disabled={isCheckingAccess}
                          onClick={async () => {
                            if (isCheckingAccess) return;
                            if (isGuestMode) return setIsModalOpen(true);
                            setIsCheckingAccess(true);
                            try {
                              await continueIfAccountVerified(
                                () => navigate(`/jobs/${job.id}/make-proposal`),
                                false,
                                "Account Verification is required to submit a Job Proposal. Please verify your identity to proceed."
                              );
                            } finally {
                              setIsCheckingAccess(false);
                            }
                          }}
                          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition shadow-lg bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 ${
                            isCheckingAccess ? "opacity-80 cursor-wait" : "active:scale-[0.98] cursor-pointer"
                          }`}
                        >
                          {isCheckingAccess ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>Opening...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>{isGuestMode ? "Login to Apply" : "Send Proposal"}</span>
                              {!isGuestMode && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white tracking-wide">
                                  <CreditIcon className="h-3 w-3 text-amber-300" /> 10 Cr
                                </span>
                              )}
                            </>
                          )}
                        </button>
                        {!isGuestMode && (
                          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center flex items-center justify-center gap-1">
                            <span>Requires</span>
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-0.5">
                              <CreditIcon className="h-3 w-3 text-amber-500" /> 10 Credits
                            </span>
                            <span>to submit proposal (charged at checkout)</span>
                          </div>
                        )}
                      </div>
                    )
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/jobs/edit/${job.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-blue-600/40 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/25 py-3 text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit Post
                      </button>
                      <button
                        onClick={() => navigate(`/jobs/proposals/incoming/${job.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/10 py-3 text-xs font-bold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700 transition cursor-pointer"
                      >
                        <Users className="h-3.5 w-3.5 text-blue-400" /> Manage Applicants
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Activity Insights (2.D) */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 p-5 space-y-3.5 shadow-sm backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Activity on this Job
                  </h3>
                  <span className="text-[10px] text-gray-500 dark:text-zinc-500 font-mono">Live stats</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-zinc-400">Proposals received:</span>
                    <span className="font-bold text-gray-900 dark:text-white font-mono">{job.applicantsCount}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-zinc-400">Shortlisted:</span>
                    <span className="font-bold text-amber-500 font-mono">{job.shortlistedCount ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-500 dark:text-zinc-400">Client hire rate:</span>
                    <span className="font-bold text-emerald-500 font-mono">{job.clientHireRate ?? 100}%</span>
                  </div>
                  {job.clientLastActive && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-gray-500 dark:text-zinc-400">Client last active:</span>
                      <span className="font-bold text-gray-800 dark:text-zinc-300 font-mono">{job.clientLastActive}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible Workflow & Terms */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/80 shadow-sm overflow-hidden backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setIsWorkflowOpen((prev) => !prev)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                      Workflow & Terms
                    </h3>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 dark:text-zinc-400 transition-transform duration-200 ${
                      isWorkflowOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isWorkflowOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-t border-gray-100 dark:border-white/5"
                    >
                      <div className="p-4 space-y-3.5 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {job.initiatorRole === "Client" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">Client initiates project?</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                              {job.initiatorRole === "Client"
                                ? "Yes, client prepares project upon hire."
                                : "No, freelancer creates the project workspace."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {job.isExistingProject ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">Existing project linked?</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                              {job.isExistingProject ? "Yes, repository or files prepared." : "No existing project linked."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {job.requireNDA ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">Confidentiality / NDA?</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                              {job.requireNDA ? "Strict confidentiality agreement required." : "Standard platform confidentiality."}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <div className="mt-0.5 shrink-0">
                            {job.portfolioUseAllowed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">Portfolio usage allowed?</p>
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
                              {job.portfolioUseAllowed
                                ? `Yes, allowed up to ${job.portfolioDuration || 30}s in portfolio.`
                                : "No, confidential work not permitted in public portfolio."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SECTION: Other Job Posts You May Like */}
        {job && <JobsOtherPosts currentJobId={job.id} />}
      </div>

      {/* Lightbox Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeLightboxImg && (
              <div className="fixed inset-0 z-[300000] flex items-center justify-center p-4 md:p-8">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveLightboxImg(null)}
                  className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
                />

                <button
                  type="button"
                  onClick={() => setActiveLightboxImg(null)}
                  className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="h-6 w-6" />
                </button>

                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative z-10 max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                >
                  <img
                    src={activeLightboxImg}
                    alt="Lightbox Preview"
                    className="w-full h-full object-contain"
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Expire & Refund Confirmation Modal */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isExpireModalOpen && (
              <div className="fixed inset-0 z-[300000] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isExpiring && setIsExpireModalOpen(false)}
                  className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs cursor-pointer"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 8 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Crisp Header - Strictly NO icon beside title */}
                  <div className="flex items-start justify-between pb-3 border-b border-gray-100 dark:border-white/10 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                        Force Close Job Post
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                        Expire intake window immediately and refund posting fee
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isExpiring}
                      onClick={() => setIsExpireModalOpen(false)}
                      className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Crisp Body Description */}
                  <div className="space-y-3 mb-5">
                    <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed">
                      {`Are you sure you want to force close and expire this job post immediately? Since 0 proposals have been submitted, the intake window will be terminated immediately and your full posting fee (${job?.postingFeeCredits || 50} Credits) will be refunded to your wallet.`}
                    </p>

                    <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-500 dark:text-zinc-400">
                        Refund to Wallet:
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-bold">
                        {`${job?.postingFeeCredits || 50} Credits`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isExpiring}
                      onClick={() => setIsExpireModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isExpiring}
                      onClick={handleExecuteExpireNow}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {isExpiring ? "Processing..." : "Force Close & Refund"}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Guest Login Modal */}
      <GuestLoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Report Modal */}
      {job && (
        <PopupReportJob
          isOpen={isReportModalOpen}
          jobTitle={job.title}
          onClose={() => setIsReportModalOpen(false)}
          onSubmitReport={async (reason, details) => {
            await api.post(`/api/jobs/${job.id}/report`, { reason, description: details });
          }}
        />
      )}
    </div>
  );
};

export default JobFullPage;
