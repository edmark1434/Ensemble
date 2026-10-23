import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import { 
  Check, 
  User, 
  Users, 
  ArrowLeft, 
  ArrowRight,
  Eye, 
  Edit2, 
  Sparkles, 
  Send, 
  Bookmark, 
  Wrench, 
  Clock, 
  Star, 
  TrendingUp, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  AlertCircle,
  X,
  ChevronDown,
  Maximize2,
  Minimize2,
  HelpCircle,
  Paperclip,
  Tag,
  Layers,
  Lock,
  Share2,
  Briefcase,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { JobRichText } from "../JobRichText";
import { CreditIcon } from "@/components/ui/credit-icon";
import { SlideCommit } from "@/components/ui/SlideCommit";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";
import useGlobalState from "@/lib/global_state";
import { computeJobRankingBreakdown } from "../../job_ranking";
import { getBudgetDisplayInfo } from "@/lib/formatBudget";
import type { Job } from "../job_lists";
import { constructAvatarUrl } from "@/lib/accountAvatars";

interface CreateReviewProps {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  previewUrl: string | null;
  minBudget: string;
  maxBudget: string;
  budgetType?: "range" | "open";
  minTimeline: string;
  maxTimeline: string;
  deadline: string;
  positions: number;
  postingAs: "self" | "team";
  setPostingAs: (val: "self" | "team") => void;
  selectedTeam: string;
  setSelectedTeam: (val: string) => void;
  portfolioUseAllowed?: boolean;
  portfolioDuration?: string;
  isExistingProject?: boolean;
  existingProjectId?: string | null;
  initiatorRole?: string;
  requireNDA?: boolean;
  skills: string[];
  errors: { [key: string]: string };
  setErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  formatCommaString: (val: string) => string;
  onEditStep: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  screeningQuestions?: string[];
  briefFiles?: File[];
  preScopedMilestones?: any[];
}

export const CreateReview: React.FC<CreateReviewProps> = ({
  title,
  description,
  category,
  difficulty,
  previewUrl,
  minBudget,
  maxBudget,
  budgetType = "range",
  minTimeline,
  maxTimeline,
  deadline,
  positions,
  postingAs,
  setPostingAs,
  selectedTeam,
  setSelectedTeam,
  portfolioUseAllowed,
  portfolioDuration,
  isExistingProject,
  existingProjectId,
  initiatorRole,
  requireNDA,
  skills,
  errors: _errors,
  setErrors: _setErrors,
  formatCommaString,
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting,
  screeningQuestions = [],
  briefFiles = [],
  preScopedMilestones = [],
}) => {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const user = useGlobalState((state) => state.user);
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark";

  // Collapsible sections state matching Proposal Review
  const [isSection2Collapsed, setIsSection2Collapsed] = useState(false);
  const [isSection3Collapsed, setIsSection3Collapsed] = useState(false);
  const [isSection4Collapsed, setIsSection4Collapsed] = useState(false);
  const [isSection5Collapsed, setIsSection5Collapsed] = useState(false);

  const areAllSectionsCollapsed =
    isSection2Collapsed &&
    isSection3Collapsed &&
    isSection4Collapsed &&
    isSection5Collapsed;

  const toggleAllSections = () => {
    const nextState = !areAllSectionsCollapsed;
    setIsSection2Collapsed(nextState);
    setIsSection3Collapsed(nextState);
    setIsSection4Collapsed(nextState);
    setIsSection5Collapsed(nextState);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCheckoutModalOpen && !isSubmitting) {
        setIsCheckoutModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCheckoutModalOpen, isSubmitting]);

  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    return constructAvatarUrl(raw, user?.username || user?.display_name);
  });

  useEffect(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    if (raw) {
      setProfileAvatar(constructAvatarUrl(raw, user?.username || user?.display_name));
    } else {
      const accountId = user?.account_id || user?.accountId || user?.id;
      if (accountId) {
        api.get(`/api/accounts/profile/${accountId}`)
          .then((res) => {
            const data = res.data?.data || res.data?.profile || res.data || {};
            const fetched = data.avatar_preset_url || data.avatar_url;
            if (fetched) {
              setProfileAvatar(constructAvatarUrl(fetched, user?.username || user?.display_name));
            }
          })
          .catch(() => {});
      }
    }
  }, [user]);

  useEffect(() => {
    if (postingAs !== "self") {
      setPostingAs("self");
    }
    if (selectedTeam) {
      setSelectedTeam("");
    }
  }, [postingAs, setPostingAs, selectedTeam, setSelectedTeam]);

  useEffect(() => {
    let mounted = true;
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then((res) => {
        if (mounted) {
          setWalletBalance(res.data?.wallet?.balance_credits || 0);
        }
      })
      .catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, []);

  const rawMinBudget = parseInt(minBudget.replace(/\D/g, ""), 10) || 0;
  const rawMaxBudget = budgetType === "open" ? undefined : (parseInt(maxBudget.replace(/\D/g, ""), 10) || 0);

  // Construct synthetic Job instance for genuine Card Preview & Algorithm Score Calculation
  const previewJob: Job = useMemo(() => {
    return {
      id: "preview-card",
      title: title.trim() || "Untitled Project Post",
      description: description.trim() || "No project description provided yet.",
      status: "Open",
      category: category || "Video Editing",
      difficulty: (difficulty as any) || "Intermediate",
      priceRange: budgetType === "open" ? `${rawMinBudget}+` : `${rawMinBudget} - ${rawMaxBudget || rawMinBudget}`,
      minBudget: rawMinBudget,
      maxBudget: rawMaxBudget,
      postedBy: user?.username || user?.display_name || user?.name || "You",
      clientAvatar: profileAvatar || "/profile_presets/p1.png",
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      timeAgo: "Just now",
      clientRating: Number(user?.rating) || 5.0,
      ratingCount: Number(user?.rating_count) || 0,
      positionsNeeded: positions || 1,
      hiredCount: 0,
      applicantsCount: 0,
      savesCount: 0,
      timeline: minTimeline && maxTimeline ? `${minTimeline}-${maxTimeline} Days` : "7-14 Days",
      thumbnail: previewUrl || "/placeholder-job.png",
      skills,
      hiring_type: postingAs === "team" ? "team" : "single",
      posted_as: postingAs === "team" ? "Team" : "Self",
      deadline,
      portfolioUseAllowed,
      portfolioDuration: portfolioDuration ? Number(portfolioDuration) : null,
      isExistingProject,
      requireNDA,
      milestones: preScopedMilestones,
      screeningQuestions,
      attachments: briefFiles,
    };
  }, [
    title,
    description,
    category,
    difficulty,
    budgetType,
    rawMinBudget,
    rawMaxBudget,
    user,
    profileAvatar,
    positions,
    minTimeline,
    maxTimeline,
    previewUrl,
    skills,
    postingAs,
    deadline,
    portfolioUseAllowed,
    portfolioDuration,
    isExistingProject,
    requireNDA,
    preScopedMilestones,
    screeningQuestions,
    briefFiles,
  ]);

  const ranking = useMemo(() => computeJobRankingBreakdown(previewJob), [previewJob]);
  const budgetDisplay = useMemo(
    () =>
      getBudgetDisplayInfo({
        minBudget: previewJob.minBudget,
        maxBudget: previewJob.maxBudget,
        isTeam: Boolean(previewJob.hiring_type === "team"),
        positionsNeeded: previewJob.positionsNeeded,
      }),
    [previewJob]
  );

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header with Master Collapse / Expand Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Review & Post</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Review your marketplace card appearance, algorithmic discovery appeal, and confirm parameters before publishing.
          </p>
        </div>
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

      {/* =========================================================================
          SECTION 1: CARD PREVIEW & POST SCORE (Permanent Anchor - Not Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section 1 Permanent Header */}
        <div className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 text-left select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              01. Card Preview & Discovery Score
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              Live Feed Appearance
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold px-2 py-1 transition cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit Post</span>
            </button>
          </div>
        </div>

        {/* Section 1 Content */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left: Real-time Job Card Preview (Exact look on Live Job Board) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Marketplace Card Preview
              </span>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 hidden sm:inline">&bull; Live Feed Appearance</span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold transition focus:outline-none flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit Post
            </button>
          </div>

          {/* Genuine Marketplace Job Card */}
          <div className="group flex flex-col sm:flex-row gap-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-sm transition-all relative overflow-hidden flex-1">
            {/* Thumbnail Column */}
            <div className="relative h-44 sm:h-auto sm:min-h-[160px] w-full sm:w-56 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/5">
              {previewUrl ? (
                <img src={previewUrl} alt="Job Thumbnail" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-900">
                  <Sparkles className="h-8 w-8 mb-2 opacity-40 text-blue-500" />
                  <span className="text-xs font-medium">Default Thumbnail</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Top Left: Proposals Indicator */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                  <Send className="h-3 w-3" />
                  <span>0 Proposals</span>
                </div>
              </div>

              {/* Top Right: Bookmark dummy */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                <div className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/80">
                  <Bookmark className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Bottom Left: Difficulty */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                <span className="px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                  {difficulty || "Beginner"}
                </span>
              </div>
            </div>

            {/* Content Column */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                {/* Badges Line */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                      <span className="relative z-10">Open</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                      {category || "General"}
                    </span>
                    {ranking.isRisingJob && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 shadow-xs">
                        <TrendingUp className="h-2.5 w-2.5" />
                        <span>Rising</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & Tag */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <div className="text-amber-500 dark:text-amber-400 text-base sm:text-lg font-black flex items-center gap-1">
                    <CreditIcon className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>{budgetDisplay.amountText} Credits</span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${budgetDisplay.tagColorClass}`}>
                    {budgetDisplay.tagLabel}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-gray-900 dark:text-white text-base sm:text-lg font-bold mb-1.5 line-clamp-1">
                  {title || <span className="text-gray-400 italic font-normal">Untitled Project Post</span>}
                </h3>

                {/* Description Snippet */}
                <div className="mb-3 text-xs text-gray-600 dark:text-zinc-400 line-clamp-2">
                  <JobRichText content={description || "No description provided."} truncate={2} />
                </div>

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-400 shrink-0 mr-0.5" />
                    {skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800/80 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 text-[10px] font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                    {skills.length > 4 && (
                      <span className="px-2 py-0.5 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 text-[10px] font-medium">
                        +{skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Row: Poster Info & Time */}
              <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                <div className="flex items-center gap-2 truncate">
                  <div className="relative h-6 w-6 shrink-0 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-800 border border-gray-200 dark:border-white/10">
                    <img
                      src={profileAvatar || "/profile_presets/p1.png"}
                      alt="Client Avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = "/profile_presets/p1.png";
                      }}
                    />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate">
                    {user?.username || user?.display_name || "You"}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500 text-[10px] font-bold">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    <span>{Number(user?.rating || 5.0).toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-gray-400 dark:text-zinc-500 shrink-0">
                  <Clock className="h-3 w-3" />
                  <span>Just now</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Job Discovery Algorithm & Listing Appeal Widget */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3 flex flex-col">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Algorithm Discovery Score
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 shadow-sm flex-1 flex flex-col justify-between space-y-3">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2.5">
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                Feed Appeal Rating
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                ranking.totalScore >= 80 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                  : ranking.totalScore >= 60
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}>
                {ranking.totalScore >= 80 ? "High Visibility" : ranking.totalScore >= 60 ? "Solid Brief" : "Moderate Reach"}
              </span>
            </div>

            {/* Score Dial */}
            <div className="flex items-center gap-3.5 my-auto">
              <div className="flex flex-col items-center justify-center h-14 w-14 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 shrink-0">
                <span className="text-xl font-black text-gray-900 dark:text-white leading-none">
                  {Math.round(ranking.totalScore)}
                </span>
                <span className="text-[9px] font-bold text-gray-400 dark:text-zinc-500 mt-0.5">/ 100</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700 dark:text-zinc-300">Listing Strength</span>
                  <span className="text-gray-900 dark:text-white font-bold">{Math.round(ranking.totalScore)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ranking.totalScore >= 80 ? "bg-emerald-500" : ranking.totalScore >= 60 ? "bg-blue-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, ranking.totalScore))}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 leading-tight">
                  Prioritized by Ensemble algorithm for candidate feeds.
                </p>
              </div>
            </div>

            {/* Compact Breakdown Grid */}
            <div className="pt-2.5 border-t border-gray-200 dark:border-white/10 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Brief Completeness</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                    {Math.round(ranking.completenessScore * 100)}%
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                  <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Platform Trust</span>
                  <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                    {ranking.bayesianRating.toFixed(1)} / 5.0
                  </span>
                </div>
              </div>

              {/* Signals */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                {skills.length >= 3 && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                    &#10003; 3+ Skills
                  </span>
                )}
                {previewUrl && (
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                    &#10003; Custom Visual
                  </span>
                )}
                {screeningQuestions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                    &#10003; Screening
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* =========================================================================
          SECTION 2: JOB TITLE, DESCRIPTION, CATEGORY & DIFFICULTY (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection2Collapsed(!isSection2Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              02. Job Core Specifications
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {category} &bull; {difficulty}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(1);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-2 py-1 transition cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection2Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection2Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>
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
              {/* Job Title */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Job Post Title
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                  {title.trim() || "Untitled Project Post"}
                </h3>
              </div>

              {/* Category & Difficulty Sub-Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Job Category
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white mt-0.5 block">
                    {category || "Uncategorized"}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Difficulty Level
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white mt-0.5 block">
                    {difficulty || "Intermediate"}
                  </span>
                </div>
              </div>

              {/* Job Description with JobRichText */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Job Description
                </span>
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed shadow-2xs">
                  <JobRichText content={description || "No description provided."} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 3: BUDGET, SCHEDULE & PRE-SCOPED MILESTONES (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection3Collapsed(!isSection3Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              03. Budget, Schedule & Scope
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {budgetType === "open" ? "Open Bid" : "Budget Range"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(2);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-2 py-1 transition cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection3Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection3Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!isSection3Collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 space-y-5"
            >
              {/* Financial & Timeline Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Budget */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    {budgetType === "open" ? "Starting Minimum Bid" : "Budget Range"}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-amber-500 flex items-center gap-1.5">
                    <CreditIcon className="h-4 w-4" />
                    <span>
                      {budgetType === "open"
                        ? `From ${formatCommaString(minBudget)} Cr (Open)`
                        : `${formatCommaString(minBudget)} ~ ${formatCommaString(maxBudget)} Cr`}
                    </span>
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {budgetType === "open" ? "Open for competitive proposal quotes" : "Fixed project ceiling"}
                  </span>
                </div>

                {/* Timeline Range */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Target Timeline
                  </span>
                  <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>{minTimeline} - {maxTimeline} Days</span>
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    Estimated working turnaround
                  </span>
                </div>

                {/* Deadline */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Final Deadline
                  </span>
                  <span className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="truncate">{deadline || "Flexible Delivery"}</span>
                  </span>
                  <span className="text-[11px] text-zinc-400 block">
                    {deadline ? "Hard delivery deadline" : "No strict hard deadline"}
                  </span>
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Required Skills
                </span>
                {skills && skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-2xs"
                      >
                        <Tag className="h-3 w-3 text-blue-500" />
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                    No specific skills tagged (open to all qualified creators).
                  </p>
                )}
              </div>

              {/* Pre-Scoped Milestones / Delivery Roadmap if ever */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Pre-Scoped Milestones & Delivery Roadmap
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {preScopedMilestones && preScopedMilestones.length > 0
                      ? `${preScopedMilestones.length} Phase${preScopedMilestones.length > 1 ? "s" : ""} Defined`
                      : "Proposal-Driven"}
                  </span>
                </div>

                {preScopedMilestones && preScopedMilestones.length > 0 ? (
                  <div className="space-y-2.5">
                    {preScopedMilestones.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="h-6 w-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h5 className="font-bold text-zinc-900 dark:text-white truncate">
                              {m.title || `Phase ${idx + 1}`}
                            </h5>
                            {m.description && (
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                                {m.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 text-right">
                          {m.hours && (
                            <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                              {m.hours} hrs
                            </span>
                          )}
                          {m.percentage && (
                            <span className="font-bold text-zinc-900 dark:text-white px-2 py-0.5 rounded bg-zinc-200/80 dark:bg-zinc-700/80 text-[11px]">
                              {m.percentage}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>
                      No pre-scoped milestones attached. Applicants will structure their custom milestone roadmap, task checklists, and revision allowances in their proposals.
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 4: WORKFLOW TERMS & PREVIEW (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection4Collapsed(!isSection4Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              04. Workflow Terms & Preview
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {requireNDA ? "NDA Required" : "Standard Terms"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(3);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-2 py-1 transition cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection4Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection4Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Column 1: Workflow Terms Configured / Input (Left) */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                      Workflow Terms Configuration
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                      Step 3 Inputs
                    </span>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3.5 text-xs flex-1 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white block">Project Initiation</span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                          Who initiates and sets up the project workspace upon hiring.
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        {initiatorRole || "Client / Project Lead"}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-700/60 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white block">Existing Workspace Link</span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                          Connection to an active Ensemble team workspace.
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        {isExistingProject ? "Linked Project" : "Standalone Post"}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-700/60 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white block">Confidentiality (NDA)</span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                          Whether creator must execute an NDA prior to accessing assets.
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold shrink-0 ${
                        requireNDA
                          ? "bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/40"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                      }`}>
                        {requireNDA ? "Required" : "Standard Terms"}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-700/60 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white block">Portfolio Showcase</span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 block">
                          Permission for creator to display work on public Ensemble profile.
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shrink-0">
                        {portfolioUseAllowed ? `Allowed (${portfolioDuration || "30"}s)` : "Not Allowed"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Workflow Terms Preview matching user image (Right) */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] uppercase font-bold tracking-wider text-gray-500 dark:text-zinc-400 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" />
                      Workflow & Terms
                    </h4>
                    <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      <Eye className="h-3 w-3" /> Live Candidate View
                    </span>
                  </div>

                  {/* Exact Card matching Job Post Details UI */}
                  <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-4 shadow-2xs flex-1 flex flex-col justify-between">
                    {/* Item 1: Client initiates the project? */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {initiatorRole === "Client" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Client initiates the project?</p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {initiatorRole === "Client"
                            ? "Yes, the client will create the project upon hiring."
                            : "No, the freelancer is expected to create the project."}
                        </p>
                      </div>
                    </div>

                    {/* Item 2: Client linked an existing project? */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isExistingProject && existingProjectId ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Client linked an existing project?</p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {isExistingProject && existingProjectId
                            ? "Yes, a project is already prepared for this job."
                            : "No, a project has not been linked yet."}
                        </p>
                      </div>
                    </div>

                    {/* Item 3: Require Confidentiality (NDA)? */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {requireNDA ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Require Confidentiality (NDA)?</p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {requireNDA
                            ? "Yes, freelancers cannot share details about this project during development."
                            : "No, a strict confidentiality agreement is not required."}
                        </p>
                      </div>
                    </div>

                    {/* Item 4: Allow Portfolio Use? */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {portfolioUseAllowed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400 dark:text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white">Allow Portfolio Use?</p>
                        <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {portfolioUseAllowed
                            ? `Yes, allowed to use output for portfolio (Up to ${portfolioDuration || "30"} secs).`
                            : "No, not allowed to use final output for personal portfolio."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 5: SCREENING QUESTIONS & PROJECT BRIEFS (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection5Collapsed(!isSection5Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              05. Screening Questions & Project Briefs
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {screeningQuestions.length} Question{screeningQuestions.length !== 1 ? "s" : ""} &bull; {briefFiles.length} File{briefFiles.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(1);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-2 py-1 transition cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              <span>{isSection5Collapsed ? "Expand" : "Collapse"}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${!isSection5Collapsed ? "rotate-180" : ""}`} />
            </span>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {!isSection5Collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 space-y-6"
            >
              {/* Job Screening Questions if ever there is */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Job Screening Questions
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {screeningQuestions.length > 0 ? `${screeningQuestions.length} Configured` : "None"}
                  </span>
                </div>

                {screeningQuestions.length > 0 ? (
                  <div className="space-y-2">
                    {screeningQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3 text-xs"
                      >
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0 mt-0.5">
                          Q{idx + 1}
                        </span>
                        <p className="font-semibold text-zinc-900 dark:text-white leading-relaxed">
                          {q}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2.5">
                    <HelpCircle className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>No screening questions configured. All applicants will submit directly.</span>
                  </div>
                )}
              </div>

              {/* Project Brief & Reference Documents if ever there is */}
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Project Brief & Reference Documents
                  </span>
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {briefFiles.length > 0 ? `${briefFiles.length} Attached` : "None"}
                  </span>
                </div>

                {briefFiles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {briefFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Paperclip className="h-4 w-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold text-zinc-900 dark:text-white truncate block">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              {(file.size / 1024).toFixed(1)} KB
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 shrink-0">
                          Attached
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-zinc-50/60 dark:bg-zinc-900/30 border border-dashed border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span>No project briefs or reference documents attached.</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* FULL-WIDTH ACTIONS */}
      <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition text-sm focus:outline-none shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
        <button
          type="button"
          onClick={() => setIsCheckoutModalOpen(true)}
          disabled={isSubmitting}
          className="min-w-[240px] px-8 py-3.5 flex items-center justify-center gap-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-[0.99] transition focus:outline-none cursor-pointer"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* =========================================================================
          DEDICATED CHECKOUT MODAL (PORTALED TO BODY)
         ========================================================================= */}
      {isCheckoutModalOpen && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6"
            onClick={() => {
              if (!isSubmitting) setIsCheckoutModalOpen(false);
            }}
          >
            {/* Floating Upper Right Credits Pill (Prominently visible during Checkout) */}
            <FloatingCreditsPill className="!z-[10001]" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left"
            >
              {/* Checkout Modal Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Checkout Job Listing
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Confirm publication fee deduction to broadcast post to marketplace
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isSubmitting) setIsCheckoutModalOpen(false);
                  }}
                  disabled={isSubmitting}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Checkout Modal Body */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Summary Strip */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold shrink-0">Listing Title:</span>
                    <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[260px] text-right">
                      {title.trim() || "Untitled Project Post"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold shrink-0">Category & Level:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right">
                      {category || "General"} • {difficulty || "Intermediate"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700/80">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Allocated Budget:</span>
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        {budgetType === "open"
                          ? `${rawMinBudget.toLocaleString()}+ Credits (Open)`
                          : `${rawMinBudget.toLocaleString()} - ${rawMaxBudget?.toLocaleString() || rawMinBudget.toLocaleString()} Credits`}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Scope & Capacity:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {positions} Freelancer{positions > 1 ? "s" : ""} Needed • {isExistingProject ? "Workspace Linked" : "Standalone Post"}
                    </span>
                  </div>
                </div>

                {/* Ledger & Wallet Balance Card */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 bg-white dark:bg-zinc-900/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700 dark:text-zinc-300 font-semibold">Your Available Balance</span>
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        {walletBalance !== null ? `${walletBalance.toLocaleString()} Credits` : "Checking..."}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300 font-semibold">
                    <span>Marketplace Publication Fee</span>
                    <span className="font-bold text-red-500 dark:text-red-400">-50 Credits</span>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-bold text-zinc-900 dark:text-white">
                    <span>Balance After Publication</span>
                    <span className="flex items-center gap-1.5">
                      <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        {walletBalance !== null ? `${(walletBalance - 50).toLocaleString()} Credits` : "—"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Insufficient Balance Alert */}
                {walletBalance !== null && walletBalance < 50 && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="font-medium">Insufficient balance (requires 50 Credits)</span>
                    </div>
                    <Link
                      to="/credits/shop"
                      target="_blank"
                      className="text-xs font-bold text-red-700 dark:text-red-300 hover:underline shrink-0"
                    >
                      Buy Credits
                    </Link>
                  </div>
                )}

                {/* Agreement Checkbox */}
                <label className={`flex items-start gap-2.5 text-xs p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  agreedToFee 
                    ? "bg-blue-50/70 dark:bg-blue-950/25 border-blue-200 dark:border-blue-900/50 text-zinc-900 dark:text-zinc-100" 
                    : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}>
                  <input
                    type="checkbox"
                    checked={agreedToFee}
                    onChange={(e) => setAgreedToFee(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                  />
                  <div className="space-y-1">
                    <span className="leading-relaxed select-none block">
                      I agree to deduct <span className="font-bold text-zinc-950 dark:text-white">50 Credits</span> from my wallet to publish and broadcast this post to the live marketplace.
                    </span>
                    {!agreedToFee && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                        Required to unlock payment swipe
                      </span>
                    )}
                  </div>
                </label>
              </div>

              {/* Checkout Modal Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer text-center"
                >
                  Return to Review
                </button>

                <SlideCommit
                  label="Swipe to Pay 50 Credits"
                  doneLabel="Paid 50 Credits"
                  errorLabel="Publication Failed"
                  onConfirm={async () => {
                    await onSubmit();
                    setIsCheckoutModalOpen(false);
                  }}
                  disabled={isSubmitting || !agreedToFee || (walletBalance !== null && walletBalance < 50)}
                  width={260}
                  height={46}
                  trackColor={isDark ? "#27272a" : "#e4e4e7"}
                  handleColor="#2563eb"
                  textColor={isDark ? "#f4f4f5" : "#18181b"}
                  successColor="#10b981"
                />
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default CreateReview;
