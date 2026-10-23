import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
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
  Layers, 
  CheckSquare, 
  FileText, 
  Check, 
  AlertCircle 
} from "lucide-react";
import { JobRichText } from "../JobRichText";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import type { MilestoneFormItem } from "./4_create_teammilestones";
import api from "@/lib/axios";
import { computeJobRankingBreakdown } from "../../job_ranking";
import { getBudgetDisplayInfo } from "@/lib/formatBudget";
import type { Job } from "../job_lists";
import { constructAvatarUrl } from "@/lib/accountAvatars";

interface CreateTeamReviewProps {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  previewUrl: string | null;
  minBudget: string;
  maxBudget: string;
  minTimeline: string;
  maxTimeline: string;
  deadline: string;
  milestones: MilestoneFormItem[];
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
}

export const CreateTeamReview: React.FC<CreateTeamReviewProps> = ({
  title,
  description,
  category,
  difficulty,
  previewUrl,
  minBudget,
  maxBudget,
  minTimeline,
  maxTimeline,
  deadline,
  milestones,
  postingAs,
  setPostingAs,
  selectedTeam,
  setSelectedTeam,
  portfolioUseAllowed,
  portfolioDuration,
  isExistingProject,
  initiatorRole,
  requireNDA,
  skills,
  errors: _errors,
  setErrors: _setErrors,
  formatCommaString,
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting = false,
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

  const rawMinBudget = parseInt(minBudget.replace(/\D/g, "")) || 0;
  const rawMaxBudget = parseInt(maxBudget.replace(/\D/g, "")) || 0;
  const totalBudgetAmount = rawMaxBudget || rawMinBudget;

  const timelineDays = parseInt(maxTimeline || "0") || parseInt(minTimeline || "0") || 3;
  const totalTimelineHours = timelineDays * 24;

  const totalAllocatedHours = milestones.reduce((sum, m) => {
    const hrs = m.duration_hours !== undefined && m.duration_hours > 0
      ? m.duration_hours
      : Math.max(1, Math.round((totalTimelineHours * (Number(m.budget_percentage) || 0)) / 100));
    return sum + hrs;
  }, 0);

  const totalSlots = milestones.reduce((sum, m) => sum + Math.max(1, m.slots_count || 1), 0);

  const milestoneAllocations = useMemo(() => {
    let allocated = 0;
    return milestones.map((m, idx) => {
      const pct = Number(m.budget_percentage) || 0;
      let credits = 0;
      if (idx === milestones.length - 1) {
        credits = Math.max(0, totalBudgetAmount - allocated);
      } else {
        credits = Math.round((totalBudgetAmount * pct) / 100);
        allocated += credits;
      }
      return credits;
    });
  }, [milestones, totalBudgetAmount]);

  // Construct synthetic Job instance for genuine Card Preview & Team Algorithm Scoring
  const previewJob: Job = useMemo(() => {
    return {
      id: "preview-team-card",
      title: title.trim() || "Untitled Team Project",
      description: description.trim() || "No project description provided yet.",
      status: "Open",
      category: category || "Video Editing",
      difficulty: (difficulty as any) || "Intermediate",
      priceRange: `${totalBudgetAmount}`,
      minBudget: totalBudgetAmount,
      maxBudget: totalBudgetAmount,
      postedBy: user?.username || user?.display_name || user?.name || "You",
      clientAvatar: profileAvatar || "/profile_presets/p1.png",
      postedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      timeAgo: "Just now",
      clientRating: Number(user?.rating) || 5.0,
      ratingCount: Number(user?.rating_count) || 0,
      positionsNeeded: totalSlots || 2,
      hiredCount: 0,
      applicantsCount: 0,
      savesCount: 0,
      timeline: minTimeline && maxTimeline ? `${minTimeline}-${maxTimeline} Days` : "7-14 Days",
      thumbnail: previewUrl || "/placeholder-job.png",
      skills,
      hiring_type: "team",
      posted_as: "Team",
      is_team: true,
      deadline,
      portfolioUseAllowed,
      portfolioDuration: portfolioDuration ? Number(portfolioDuration) : null,
      isExistingProject,
      requireNDA,
      milestones,
    };
  }, [
    title,
    description,
    category,
    difficulty,
    totalBudgetAmount,
    user,
    profileAvatar,
    totalSlots,
    minTimeline,
    maxTimeline,
    previewUrl,
    skills,
    deadline,
    portfolioUseAllowed,
    portfolioDuration,
    isExistingProject,
    requireNDA,
    milestones,
  ]);

  const ranking = useMemo(() => computeJobRankingBreakdown(previewJob), [previewJob]);
  const budgetDisplay = useMemo(
    () =>
      getBudgetDisplayInfo({
        minBudget: previewJob.minBudget,
        maxBudget: previewJob.maxBudget,
        isTeam: true,
        hiringType: "team",
        positionsNeeded: totalSlots,
        milestonesCount: milestones.length,
      }),
    [previewJob, totalSlots, milestones.length]
  );

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Review & Post</h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1">
          Review your team marketplace card appearance, discovery ranking score, milestone roadmap, and confirm parameters before publishing.
        </p>
      </div>

      {/* SECTION 1: LIVE MARKETPLACE TEAM CARD PREVIEW & ALGORITHM DISCOVERY SCORE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Real-time Team Job Card Preview */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                Marketplace Team Card Preview
              </span>
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 hidden sm:inline">&bull; Team Pool Feed View</span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-medium transition focus:outline-none flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" /> Edit Post
            </button>
          </div>

          {/* Genuine Marketplace Team Job Card */}
          <div className="group flex flex-col sm:flex-row gap-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-sm transition-all relative overflow-hidden">
            {/* Thumbnail Column */}
            <div className="relative h-44 sm:h-auto sm:min-h-[160px] w-full sm:w-56 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/5">
              {previewUrl ? (
                <img src={previewUrl} alt="Job Thumbnail" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-900">
                  <Sparkles className="h-8 w-8 mb-2 opacity-40 text-gray-400 dark:text-zinc-500" />
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

              {/* Bottom Left: Hiring Type (Team) & Difficulty */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                  <Users className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                  <span>Team</span>
                </span>
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
                    <span className="relative overflow-hidden px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                      <span className="relative z-10">Open</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-white/10 text-gray-800 dark:text-zinc-300">
                      {category || "General"}
                    </span>
                    {ranking.isRisingJob && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10">
                        <TrendingUp className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
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
                  {title || <span className="text-gray-400 italic font-normal">Untitled Team Project</span>}
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

        {/* Right: Team Algorithm Discovery Score Widget */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
              Team Algorithm Score
            </span>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] p-5 space-y-4 shadow-sm">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
              <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                Team Pool Appeal
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-zinc-200 border border-gray-200 dark:border-white/10">
                {ranking.totalScore >= 80 ? "High Discovery" : ranking.totalScore >= 60 ? "Structured Roadmap" : "Moderate Appeal"}
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
                  <span className="text-gray-700 dark:text-zinc-300">Roadmap Strength</span>
                  <span className="text-gray-900 dark:text-white">{Math.round(ranking.totalScore)}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gray-900 dark:bg-zinc-200 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(10, ranking.totalScore))}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1.5 leading-tight">
                  Evaluated on milestone depth, role task distribution, and platform priority.
                </p>
              </div>
            </div>

            {/* Factor Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-gray-200 dark:border-white/10 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Milestone Depth</span>
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
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Team Capacity</span>
                <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                  {totalSlots} Openings
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Spotlight Priority</span>
                <span className="font-bold text-gray-900 dark:text-white mt-0.5 block">
                  14-Day Priority
                </span>
              </div>
            </div>

            {/* Positive Optimization Signals - Unified Neutral Studio Chips */}
            <div className="pt-2 border-t border-gray-200 dark:border-white/10 flex flex-wrap gap-1.5 text-[10px]">
              {milestones.length >= 2 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-medium">
                  <Check className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                  <span>{milestones.length} Milestones</span>
                </span>
              )}
              {milestones.every(m => m.tasks && m.tasks.length > 0) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-medium">
                  <Check className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                  <span>Checklists Configured</span>
                </span>
              )}
              {skills.length >= 3 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-medium">
                  <Check className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                  <span>3+ Skills Tagged</span>
                </span>
              )}
              {previewUrl && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 font-medium">
                  <Check className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                  <span>Custom Visual</span>
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: SPECIFICATIONS SUMMARY & WORKFLOW */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300">
            Project Specifications & Workflow Terms
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Box 1: Core Information */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2.5">
                <span className="font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                  01. Core Brief
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep(1)}
                  className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-medium transition focus:outline-none"
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
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Collaboration Type</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Team Project ({totalSlots} Positions)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 2: Budget & Delivery */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2.5">
                <span className="font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                  02. Budget & Delivery
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep(2)}
                  className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-medium transition focus:outline-none"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Fixed Milestone Pool</span>
                  <span className="font-bold text-amber-500 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                    <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    {totalBudgetAmount.toLocaleString()} Credits
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Project Timeline</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {timelineDays} {timelineDays === 1 ? "Day" : "Days"} ({totalTimelineHours} hrs)
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Final Deadline</span>
                  <span className="font-bold text-gray-900 dark:text-white">{deadline || "Unset"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Box 3: Terms & Workflow */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02] flex flex-col justify-between space-y-4">
            <div>
              <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2.5">
                <span className="font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider text-[11px]">
                  03. Terms & Rights
                </span>
                <button
                  type="button"
                  onClick={() => onEditStep(3)}
                  className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-medium transition focus:outline-none"
                >
                  Edit
                </button>
              </div>

              <div className="space-y-2 mt-3 text-xs">
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Confidentiality (NDA)</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {requireNDA ? "Required Before Starting" : "Standard Platform Terms"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Portfolio Showcase</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {portfolioUseAllowed ? `Allowed (${portfolioDuration || "Unlimited"}s)` : "Not Allowed (Exclusive)"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400 block">Existing Project Link</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {isExistingProject ? "Linked to Workspace" : "Standalone Post"}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: MILESTONE ROADMAP (TABLE VIEW) */}
      <div className="p-5 md:p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.01] space-y-4">
        <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              04. Milestones Roadmap ({milestones.length} Phases · {totalAllocatedHours} hrs)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white font-medium transition focus:outline-none flex items-center gap-1"
          >
            <Edit2 className="h-3 w-3" /> Edit Milestones
          </button>
        </div>

        {/* Clean Structured Milestones Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface/60 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50/80 dark:bg-white/[0.03] text-gray-500 dark:text-zinc-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                <th className="py-3 px-3.5 min-w-[260px]">Milestone Scope & Deliverables</th>
                <th className="py-3 px-3.5 text-center min-w-[100px]">Slots</th>
                <th className="py-3 px-3.5 text-center min-w-[110px]">Duration</th>
                <th className="py-3 px-3.5 text-right min-w-[140px]">Budget Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-gray-800 dark:text-zinc-200">
              {milestones.map((m, idx) => {
                const mPercent = Number(m.budget_percentage) || 0;
                const mAmount = milestoneAllocations[idx] !== undefined ? milestoneAllocations[idx] : Math.round((totalBudgetAmount * mPercent) / 100);
                const slots = Math.max(1, m.slots_count || 1);
                const perSlotAmount = Math.round(mAmount / slots);
                const mHours = m.duration_hours !== undefined && m.duration_hours > 0
                  ? m.duration_hours
                  : Math.max(1, Math.round((totalTimelineHours * mPercent) / 100));
                const daysEquiv = (mHours / 24).toFixed(1).replace(/\.0$/, "");

                return (
                  <tr key={m.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.015] transition-colors">
                    {/* Index */}
                    <td className="py-3.5 px-3.5 text-center align-top">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-lg bg-gray-100 dark:bg-white/10 font-bold text-gray-700 dark:text-zinc-300 text-xs">
                        {idx + 1}
                      </span>
                    </td>

                    {/* Scope & Deliverables */}
                    <td className="py-3.5 px-3.5 align-top">
                      <div className="font-bold text-gray-900 dark:text-white text-sm">
                        {m.title || "Untitled Milestone"}
                      </div>
                      {m.description && (
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {m.description}
                        </p>
                      )}

                      {/* Tasks Checklist */}
                      {m.tasks && m.tasks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {m.tasks.map((task, tIdx) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/5 text-[11px] text-gray-700 dark:text-zinc-300 font-medium"
                            >
                              <CheckSquare className="h-3 w-3 text-gray-400 dark:text-zinc-500 shrink-0" />
                              <span className="truncate max-w-[220px]">{task}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Slots */}
                    <td className="py-3.5 px-3.5 align-top text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-xs font-semibold border border-gray-200 dark:border-white/10">
                        <Users className="h-3 w-3 text-gray-500 dark:text-zinc-400 shrink-0" />
                        <span>{slots} {slots === 1 ? "Slot" : "Slots"}</span>
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-3.5 align-top text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-xs font-semibold border border-gray-200 dark:border-white/10">
                        <Clock className="h-3 w-3 text-gray-500 dark:text-zinc-400 shrink-0" />
                        <span>{mHours} hrs <span className="text-gray-400 dark:text-zinc-500 font-normal">(~{daysEquiv}d)</span></span>
                      </span>
                    </td>

                    {/* Budget Share */}
                    <td className="py-3.5 px-3.5 align-top text-right">
                      <div className="flex flex-col items-end">
                        <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                          <CreditIcon className="h-3 w-3 text-amber-500 shrink-0" />
                          <span>{mAmount.toLocaleString()} Cr</span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-semibold">({mPercent}%)</span>
                        </div>
                        {slots > 1 && (
                          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium mt-0.5">
                            {perSlotAmount.toLocaleString()} Cr / seat
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] text-xs font-bold text-gray-900 dark:text-white">
              <tr>
                <td colSpan={2} className="py-3 px-3.5">
                  Total Milestone Allocation ({milestones.length} Phases)
                </td>
                <td className="py-3 px-3.5 text-center text-gray-700 dark:text-zinc-300 font-semibold">
                  {totalSlots} Positions
                </td>
                <td className="py-3 px-3.5 text-center text-gray-700 dark:text-zinc-300 font-semibold">
                  {totalAllocatedHours} hrs
                </td>
                <td className="py-3 px-3.5 text-right font-extrabold">
                  <div className="flex items-center justify-end gap-1 text-amber-500 dark:text-amber-400">
                    <CreditIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>{totalBudgetAmount.toLocaleString()} Credits</span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium">(100%)</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 4: MARKETPLACE PUBLICATION & FEE */}
      <div className="p-5 md:p-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-white/10 pb-3">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
              Marketplace Publication & Fee
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
              A standard publication fee is deducted from your balance to activate this team listing on the live discovery feed.
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-zinc-300 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full border border-gray-200 dark:border-white/10 self-start sm:self-auto shrink-0">
            <Check className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-400" /> Team Collaboration
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-zinc-400">Current Wallet Balance</span>
            {walletBalance === null ? (
              <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            ) : (
              <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
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
                <CreditIcon className="h-4 w-4 text-amber-500" />
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
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-zinc-900 focus:ring-zinc-500 dark:border-white/20 dark:bg-zinc-900 transition cursor-pointer disabled:opacity-50"
            />
            <span className="text-xs text-gray-600 dark:text-zinc-400 select-none group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              I agree to the <span className="font-bold text-gray-900 dark:text-white">50 Credits</span> publication fee to broadcast this team post to the marketplace.
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
              : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/35 active:scale-[0.99] cursor-pointer"
          }`}
        >
          {isSubmitting ? "Publishing Team Post..." : "Confirm Payment & Post"} <Check className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CreateTeamReview;
