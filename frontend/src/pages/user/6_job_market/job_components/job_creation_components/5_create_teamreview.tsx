import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, Users, ChevronDown, HelpCircle, CheckSquare, Layers, Check, Clock } from "lucide-react";
import { JobRichText } from "../JobRichText";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import type { MilestoneFormItem } from "./4_create_teammilestones";
import api from "@/lib/axios";

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

const constructAvatarUrl = (path: string | undefined): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  const presetMatch = path.match(/p\d+\.png$/i);
  if (presetMatch) {
    return `/profile_presets/${presetMatch[0]}`;
  }
  const cloudfrontUrl = import.meta.env.VITE_CLOUDFRONT_URL;
  if (!cloudfrontUrl) return path.startsWith("/") ? path : `/${path}`;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${cloudfrontUrl}/${cleanPath}`;
};

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
  errors,
  setErrors,
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
    return constructAvatarUrl(raw);
  });

  useEffect(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    if (raw) {
      setProfileAvatar(constructAvatarUrl(raw));
    } else {
      const accountId = user?.account_id || user?.accountId || user?.id;
      if (accountId) {
        api.get(`/api/accounts/profile/${accountId}`)
          .then((res) => {
            const data = res.data?.data || res.data?.profile || res.data || {};
            const fetched = data.avatar_preset_url || data.avatar_url;
            if (fetched) {
              setProfileAvatar(constructAvatarUrl(fetched));
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
      .then(res => {
        if (mounted) {
          setWalletBalance(res.data?.wallet?.balance_credits || 0);
        }
      })
      .catch(err => console.error(err));
    return () => { mounted = false; };
  }, []);

  const clearError = (field: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

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

  const milestoneAllocations = React.useMemo(() => {
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
  const totalSlots = milestones.reduce((sum, m) => sum + Math.max(1, m.slots_count || 1), 0);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Final Inspection & Publishing</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">
          Review your project scope, team milestones allocation, and authoring identity before publishing.
        </p>
      </div>

      <div className="space-y-4">
        {/* SECTION 1: Core Information */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-purple-500 uppercase tracking-wider text-[10px]">01. Core Identity</span>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-[10px] text-purple-500 hover:underline font-bold transition focus:outline-none"
            >
              Edit
            </button>
          </div>

          <div className="flex gap-4 items-start">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Thumbnail"
                className="w-20 h-20 rounded-xl object-cover border border-gray-200 dark:border-white/10 shrink-0"
              />
            )}
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{title || "Untitled Job"}</h3>
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 text-[10px] font-medium">
                  {category}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 text-[10px] font-medium">
                  {difficulty}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-400 text-[10px] font-medium">
                  Team Project ({totalSlots} Openings)
                </span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Description</span>
            <div className="p-3 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/50 dark:border-white/5 text-xs text-gray-700 dark:text-zinc-300">
              <JobRichText content={description} />
            </div>
          </div>
        </div>

        {/* SECTION 2: Budget & Metrics */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-purple-500 uppercase tracking-wider text-[10px]">02. Budget & Skills</span>
            <button
              type="button"
              onClick={() => onEditStep(2)}
              className="text-[10px] text-purple-500 hover:underline font-bold transition focus:outline-none"
            >
              Edit
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">
                Fixed Project Budget
              </span>
              <span className="text-sm font-extrabold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                {(rawMaxBudget || rawMinBudget).toLocaleString()} Credits
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Project Timeline</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-purple-500 shrink-0" />
                {timelineDays} {timelineDays === 1 ? "Day" : "Days"} ({totalTimelineHours} hrs)
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Deadline</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{deadline}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-white/10">
            <span className="text-gray-500 dark:text-zinc-400 block mb-1.5 text-[10px]">Required Skills</span>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 text-[10px] font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: Terms & Workflow */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-4">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-purple-500 uppercase tracking-wider text-[10px]">03. Workflow & Terms</span>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="text-[10px] text-purple-500 hover:underline font-bold transition focus:outline-none"
            >
              Edit
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Confidentiality (NDA)</span>
              <span className={`text-sm font-bold ${requireNDA ? "text-purple-500" : "text-gray-900 dark:text-white"}`}>
                {requireNDA ? "Required" : "Not Required"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Portfolio Use</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {portfolioUseAllowed ? `Allowed (${portfolioDuration}s)` : "Not Allowed"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Existing Project</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {isExistingProject ? `Yes` : "No"}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Initiator</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{initiatorRole}</span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Team Milestones & Roles Allocation */}
        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.02] space-y-4">
          <div className="flex justify-between items-center border-b border-purple-500/20 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-500" />
              <span className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-[10px]">
                04. Milestones & Roles Allocation ({milestones.length} Milestones · {totalAllocatedHours} hrs)
              </span>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(4)}
              className="text-[10px] text-purple-500 hover:underline font-bold transition focus:outline-none"
            >
              Edit
            </button>
          </div>

          <div className="space-y-3">
            {milestones.map((m, idx) => {
              const mPercent = Number(m.budget_percentage) || 0;
              const isFixedBudget = rawMinBudget === rawMaxBudget || rawMinBudget === 0 || rawMaxBudget === 0;
              const mAmount = milestoneAllocations[idx] !== undefined ? milestoneAllocations[idx] : Math.round((totalBudgetAmount * mPercent) / 100);
              const mMin = mAmount;
              const mMax = mAmount;
              const slots = Math.max(1, m.slots_count || 1);
              const perSlotAmount = Math.round(mAmount / slots);
              const perSlotMin = perSlotAmount;
              const perSlotMax = perSlotAmount;
              const mHours = m.duration_hours !== undefined && m.duration_hours > 0
                ? m.duration_hours
                : Math.max(1, Math.round((totalTimelineHours * mPercent) / 100));
              const daysEquiv = (mHours / 24).toFixed(1).replace(/\.0$/, "");

              return (
                <div
                  key={m.id || idx}
                  className="p-3.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/[0.02] space-y-2.5"
                >
                  {/* Top: Milestone Index & Title */}
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white">{m.title}</h4>
                  </div>

                  {/* Dedicated Row: Slots | Hours | Credits */}
                  <div className="flex items-center justify-between gap-2 flex-wrap py-1.5 px-3 rounded-lg bg-gray-50/70 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-[10px] font-bold border border-gray-200 dark:border-white/10">
                        <Users className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                        {slots} Open Slot{slots > 1 ? "s" : ""}
                      </span>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-[10px] font-bold border border-gray-200 dark:border-white/10">
                        <Clock className="h-3 w-3 text-gray-500 dark:text-zinc-400" />
                        {mHours} hrs (~{daysEquiv} {Number(daysEquiv) === 1 ? "day" : "days"})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-zinc-300 text-[10px] font-bold border border-gray-200 dark:border-white/10">
                        <CreditIcon className="h-3 w-3 text-gray-500 dark:text-zinc-400 shrink-0" />
                        {isFixedBudget
                          ? `${mPercent}% (${mAmount.toLocaleString()} Credits)`
                          : `${mPercent}% (${mMin.toLocaleString()} - ${mMax.toLocaleString()} Credits)`}
                        {slots > 1 && (
                          <span className="font-normal opacity-80">
                            {isFixedBudget
                              ? `· ${perSlotAmount.toLocaleString()} / person`
                              : `· ${perSlotMin.toLocaleString()} - ${perSlotMax.toLocaleString()} / person`}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-xs text-gray-600 dark:text-zinc-300">{m.description}</p>
                  )}

                  {m.tasks && m.tasks.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-white/5 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-400 block">
                        Tasks Checklist ({m.tasks.length})
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {m.tasks.map((task, tIdx) => (
                          <div
                            key={tIdx}
                            className="px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/5 text-xs text-gray-800 dark:text-zinc-200 flex items-center gap-2"
                          >
                            <CheckSquare className="h-3.5 w-3.5 text-gray-400 dark:text-zinc-500 shrink-0" />
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
        </div>

        {/* SECTION 5: Posting Identity */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-purple-500 uppercase tracking-wider text-[10px]">
              05. Posting Identity
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-200/50 dark:border-purple-500/20">
              <Check className="h-3 w-3" /> Individual Client
            </span>
          </div>

          <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-white/[0.02]">
            {profileAvatar ? (
              <img
                src={profileAvatar}
                alt={user?.name || user?.username || "Client"}
                onError={() => setProfileAvatar(undefined)}
                className="w-11 h-11 rounded-full object-cover border border-gray-200 dark:border-white/10 shadow-xs shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : user?.username ? user.username.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                  {user?.name || user?.username || "Client Profile"}
                </p>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-zinc-400 text-[9px] font-semibold border border-gray-200 dark:border-white/10">
                  Client
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                Posting directly from your individual client profile {user?.email ? `(${user.email})` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Checkout Summary Box (Matching Job Post flow) */}
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02]">
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight flex items-center justify-between">
              Checkout Summary
              {walletBalance === null && <span className="text-[10px] font-normal text-gray-400 animate-pulse">Loading balance...</span>}
            </h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 max-w-sm">
              To maintain a high-quality marketplace, a small fee is required to publish postings.
            </p>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-zinc-400">Current Balance</span>
              {walletBalance === null ? (
                <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              ) : (
                <span className="font-semibold text-gray-900 dark:text-white">{walletBalance.toLocaleString()} Credits</span>
              )}
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-zinc-400">Platform Fee</span>
              <span className="font-semibold text-red-500">-50 Credits</span>
            </div>
            <div className="pt-2.5 mt-1 border-t border-gray-200 dark:border-white/10 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-900 dark:text-white">Balance After</span>
              {walletBalance === null ? (
                <div className="h-5 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse"></div>
              ) : (
                <span className="font-bold text-gray-900 dark:text-white">{(walletBalance - 50).toLocaleString()} Credits</span>
              )}
            </div>
          </div>

          {walletBalance !== null && walletBalance < 50 ? (
            <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold flex justify-between items-center">
              <span>Insufficient balance (requires 50 Credits)</span>
              <Link to="/credits" className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition">Buy Credits</Link>
            </div>
          ) : (
            <label className="flex items-start gap-2.5 cursor-pointer group mt-2">
              <input 
                type="checkbox" 
                checked={agreedToFee} 
                onChange={(e) => setAgreedToFee(e.target.checked)}
                disabled={walletBalance === null}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 bg-white dark:bg-zinc-900 dark:border-white/20 transition cursor-pointer disabled:opacity-50"
              />
              <span className="text-xs text-gray-600 dark:text-zinc-400 select-none group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                I agree to the <span className="font-semibold text-gray-900 dark:text-white">50 Credits</span> deduction to post this job.
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200/60 dark:border-white/5">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-xs font-semibold text-gray-700 dark:text-zinc-300 transition"
        >
          Back to Milestones
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={!agreedToFee || isSubmitting || walletBalance === null || walletBalance < 50}
          className={`flex items-center justify-center gap-2 px-7 py-3 rounded-xl font-bold text-xs text-white transition shadow-sm ${
            !agreedToFee || isSubmitting || walletBalance === null || walletBalance < 50
              ? "bg-gray-300 dark:bg-zinc-800 text-gray-500 dark:text-zinc-500 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 hover:scale-105"
          }`}
        >
          {isSubmitting ? "Publishing Team Post..." : "Confirm Payment & Post"}{" "}
          <Check className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default CreateTeamReview;
