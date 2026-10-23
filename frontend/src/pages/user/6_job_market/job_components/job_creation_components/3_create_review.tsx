import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import { 
  Check, 
  User, 
  Users, 
  ArrowLeft, 
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
  AlertCircle 
} from "lucide-react";
import { JobRichText } from "../JobRichText";
import { CreditIcon } from "@/components/ui/credit-icon";
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
  const user = useGlobalState((state) => state.user);

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
    <div className="space-y-8 text-left">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Review & Post</h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Review your marketplace card appearance, algorithmic discovery appeal, and confirm parameters before publishing.
        </p>
      </div>

      {/* SECTION 1: LIVE MARKETPLACE CARD PREVIEW & ALGORITHM DISCOVERY SCORE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Real-time Job Card Preview (Exact look on Live Job Board) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
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
          <div className="group flex flex-col sm:flex-row gap-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-sm transition-all relative overflow-hidden">
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
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Algorithm Discovery Score
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-4 shadow-sm">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
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
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center h-16 w-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 shrink-0">
                <span className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                  {Math.round(ranking.totalScore)}
                </span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 mt-0.5">/ 100</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700 dark:text-zinc-300">Listing Strength</span>
                  <span className="text-gray-900 dark:text-white">{Math.round(ranking.totalScore)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      ranking.totalScore >= 80 ? "bg-emerald-500" : ranking.totalScore >= 60 ? "bg-blue-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, ranking.totalScore))}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 leading-tight">
                  Calculated by Ensemble's ranking engine to prioritize top proposals.
                </p>
              </div>
            </div>

            {/* Factor Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-gray-200 dark:border-white/10 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Brief Completeness</span>
                <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                  {Math.round(ranking.completenessScore * 100)}%
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Baseline Trust</span>
                <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                  {ranking.bayesianRating.toFixed(1)} / 5.0
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Seat Opportunity</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  100% (Uncongested)
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Spotlight Priority</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">
                  14-Day Priority
                </span>
              </div>
            </div>

            {/* Positive Optimization Signals */}
            <div className="pt-2 border-t border-gray-200 dark:border-white/10 flex flex-wrap gap-1.5 text-[10px]">
              {skills.length >= 3 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  &#10003; 3+ Skills Tagged
                </span>
              )}
              {previewUrl && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                  &#10003; Custom Visual
                </span>
              )}
              {screeningQuestions.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                  &#10003; Screening Enabled
                </span>
              )}
              {briefFiles.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">
                  &#10003; Briefs Attached
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: SPECIFICATIONS SUMMARY & WORKFLOW */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
            Project Specifications & Workflow Terms
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Box 1: Core Information */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                  01. Core Brief
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep(1)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold transition focus:outline-none"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Category</span>
                  <span className="font-bold text-gray-900 dark:text-white">{category}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Competency Target</span>
                  <span className="font-bold text-gray-900 dark:text-white">{difficulty}</span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Screening Questions</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {screeningQuestions.length > 0 ? `${screeningQuestions.length} Configured` : "None"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Brief Reference Files</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {briefFiles.length > 0 ? `${briefFiles.length} Attached` : "None"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Budget & Delivery */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                  02. Budget & Delivery
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep(2)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold transition focus:outline-none"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">
                    {budgetType === "open" ? "Starting Minimum Bid" : "Budget Range"}
                  </span>
                  <span className="font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-1 mt-0.5">
                    <CreditIcon className="h-3.5 w-3.5 text-yellow-500" />
                    {budgetType === "open"
                      ? `From ${formatCommaString(minBudget)} Credits`
                      : `${formatCommaString(minBudget)} ~ ${formatCommaString(maxBudget)} Credits`}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Timeline Range</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {minTimeline} - {maxTimeline} Days
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Final Deadline</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {deadline || "Unset"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Contract Scope</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    1 Workspace Contract
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Terms & Workflow */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2.5">
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-[11px]">
                  03. Terms & Rights
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep(3)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold transition focus:outline-none"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Confidentiality (NDA)</span>
                  <span className={`font-bold ${requireNDA ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                    {requireNDA ? "Required Before Starting" : "Standard Platform Terms"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Portfolio Showcase</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {portfolioUseAllowed ? `Allowed (${portfolioDuration || "Unlimited"}s)` : "Not Allowed (Exclusive)"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Existing Project Link</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {isExistingProject ? "Linked to Workspace" : "Standalone Post"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Initiator Role</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {initiatorRole || "Client / Project Lead"}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: MARKETPLACE PUBLICATION & FEE */}
      <div className="p-5 md:p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Marketplace Publication & Fee
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              A standard publication fee is deducted from your balance to activate this listing on the live discovery feed.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-500/20 self-start sm:self-auto shrink-0">
            <Check className="h-3.5 w-3.5" /> Job Listing
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-zinc-400">Current Wallet Balance</span>
            {walletBalance === null ? (
              <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            ) : (
              <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                <CreditIcon className="h-3.5 w-3.5 text-yellow-500" />
                {walletBalance.toLocaleString()} Credits
              </span>
            )}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-zinc-400">Platform Posting Fee</span>
            <span className="font-bold text-red-500">-50 Credits</span>
          </div>
          <div className="pt-2 mt-1 border-t border-gray-200 dark:border-white/10 flex justify-between items-center text-sm">
            <span className="font-bold text-gray-900 dark:text-white">Balance After Publication</span>
            {walletBalance === null ? (
              <div className="h-5 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            ) : (
              <span className="font-extrabold text-gray-900 dark:text-white flex items-center gap-1">
                <CreditIcon className="h-4 w-4 text-yellow-500" />
                {(walletBalance - 50).toLocaleString()} Credits
              </span>
            )}
          </div>
        </div>

        {walletBalance !== null && walletBalance < 50 ? (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Insufficient balance (requires 50 Credits to publish)</span>
            </div>
            <Link to="/credits" className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-bold text-xs">
              Buy Credits
            </Link>
          </div>
        ) : (
          <label className="flex items-start gap-3 cursor-pointer group pt-1">
            <input 
              type="checkbox" 
              checked={agreedToFee} 
              onChange={(e) => setAgreedToFee(e.target.checked)}
              disabled={walletBalance === null}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-zinc-900 dark:border-white/20 transition cursor-pointer disabled:opacity-50"
            />
            <span className="text-xs text-gray-600 dark:text-zinc-400 select-none group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              I agree to the <span className="font-bold text-gray-900 dark:text-white">50 Credits</span> publication fee to broadcast this post to the marketplace.
            </span>
          </label>
        )}
      </div>

      {/* FULL-WIDTH ACTIONS */}
      <div className="pt-6 border-t border-gray-200 dark:border-white/10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3 rounded-xl border border-gray-300 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-bold hover:bg-gray-100 dark:hover:bg-white/5 transition text-sm focus:outline-none shadow-sm flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || walletBalance === null || walletBalance < 50 || !agreedToFee}
          className={`min-w-[240px] px-8 py-3.5 flex items-center justify-center gap-2.5 rounded-xl text-sm font-bold transition focus:outline-none ${
            isSubmitting || walletBalance === null || walletBalance < 50 || !agreedToFee 
              ? "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-zinc-600 cursor-not-allowed shadow-none" 
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 active:scale-[0.99]"
          }`}
        >
          {isSubmitting ? "Publishing..." : "Confirm Payment & Post"} <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CreateReview;
