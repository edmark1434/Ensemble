import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import { Check, User, Users, ChevronDown, HelpCircle } from "lucide-react";
import { JobRichText } from "../JobRichText";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";

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

interface CreateReviewProps {
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
}

interface CustomSelectProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  error?: string;
  onSelect: (val: string) => void;
}

const CustomDropdown: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  placeholder,
  error,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] font-bold text-gray-700 dark:text-zinc-300 uppercase tracking-wider block mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between rounded-xl border bg-white dark:bg-dark-surface px-3.5 py-2.5 text-xs text-left transition-all ${
            error
              ? "border-red-500/50 focus:border-red-500"
              : isOpen
              ? "border-blue-500 ring-2 ring-blue-500/10"
              : "border-gray-200 dark:border-white/10 hover:border-white/20"
          }`}
        >
          <span className={value ? "text-gray-900 dark:text-white font-medium" : "text-gray-600 dark:text-zinc-400"}>
            {value || placeholder}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-blue-400" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setIsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 4, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-1.5 shadow-2xl space-y-0.5 custom-scrollbar"
              >
                {options.map((opt) => {
                  const isSelected = value === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onSelect(opt);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? "bg-blue-500/15 text-blue-400"
                          : "text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-blue-400" />}
                    </button>
                  );
                })}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
};

export const CreateReview: React.FC<CreateReviewProps> = ({
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
  errors,
  setErrors,
  formatCommaString,
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting,
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

  const clearError = (key: string) => {
    setErrors((prev) => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  const handlePublishClick = () => {
    onSubmit();
  };

  return (
    <div className="space-y-5 text-left">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-0.5">Review & Post</h2>
        <p className="text-xs text-gray-600 dark:text-zinc-300">Confirm parameters and select your posting identity before deploying.</p>
      </div>

      <div className="space-y-3.5 text-xs">
        {/* Core Specifications Box */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">01. Core Information</span>
            <button type="button" onClick={() => onEditStep(1)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
          </div>

          <div className="flex items-start gap-3.5">
            {previewUrl && (
              <div className="h-20 w-20 shrink-0 aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 bg-zinc-900">
                <img src={previewUrl} alt="Thumbnail Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 space-y-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{title || <span className="text-red-400 italic">No Title Given</span>}</h4>
              <div className="line-clamp-3">
                <JobRichText content={description} />
              </div>
              <div className="flex gap-4 pt-1 text-gray-500 dark:text-zinc-500 text-[10px]">
                <span>Category: <strong className="text-gray-600 dark:text-zinc-300">{category}</strong></span>
                <span>Competency Target: <strong className="text-gray-600 dark:text-zinc-300">{difficulty}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Budget & Scope Parameters */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-3">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">02. Budget & Requirements</span>
            <button type="button" onClick={() => onEditStep(2)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
          </div>

          {/* ROW 1: Dedicated Budget Pool Range */}
          <div className="flex flex-col gap-2">
            <div className="p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
              <span className="text-gray-600 dark:text-zinc-300 text-[11px] font-semibold">Budget Pool Range</span>
              <span className="text-sm font-extrabold text-yellow-500 flex items-center gap-1.5">
                <CreditIcon className="h-4 w-4 shrink-0 text-yellow-500" />
                {formatCommaString(minBudget)} ~ {formatCommaString(maxBudget)}
              </span>
            </div>

            {positions > 1 && (
              <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
                <span className="text-gray-600 dark:text-zinc-300 text-[11px] font-semibold">Divided Budget (Per Person)</span>
                <span className="text-sm font-extrabold text-blue-500 flex items-center gap-1.5">
                  <CreditIcon className="h-4 w-4 shrink-0 text-blue-500" />
                  {formatCommaString((parseInt(minBudget.replace(/,/g, '')) / positions).toFixed(0))} ~ {formatCommaString((parseInt(maxBudget.replace(/,/g, '')) / positions).toFixed(0))}
                </span>
              </div>
            )}
          </div>

          {/* ROW 2: Timeline Envelope & Positions Open */}
          <div className="grid grid-cols-3 gap-4 pt-3 pb-1">
            <div>
              <span className="text-gray-500 dark:text-zinc-400 mb-1 text-[10px] flex items-center gap-1">
                Project Timeline
                <div className="group relative flex items-center">
                  <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                    The minimum and maximum days expected to complete the project.
                  </div>
                </div>
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{minTimeline} - {maxTimeline} Days</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 mb-1 text-[10px] flex items-center gap-1">
                Project Deadline
                <div className="group relative flex items-center">
                  <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-48 rounded-md bg-white dark:bg-zinc-800 border border-gray-200 dark:border-white/10 px-2 py-1.5 text-center text-[10px] font-normal normal-case text-gray-700 dark:text-gray-300 opacity-0 transition-opacity group-hover:block group-hover:opacity-100 z-10 pointer-events-none shadow-lg">
                    The strict final delivery date you actually need it by.
                  </div>
                </div>
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{deadline}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Positions Open</span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">{positions} Slots</span>
            </div>
          </div>

          {/* Mandatory Skills */}
          <div className="pt-3 border-t border-gray-200 dark:border-white/10">
            <span className="text-gray-500 dark:text-zinc-400 block mb-2 text-[10px]">Required Skills:</span>
            <div className="flex flex-wrap gap-1.5">
              {skills.map(s => (
                <span key={s} className="px-2 py-1 rounded-md bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-zinc-300 text-[10px] font-semibold">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* SECTION 3: Terms & Workflow */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-4 mb-4">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">03. Workflow & Terms</span>
            <button type="button" onClick={() => onEditStep(3)} className="text-[10px] text-blue-500 hover:underline font-bold transition focus:outline-none">Edit</button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-gray-500 dark:text-zinc-400 block mb-1 text-[10px]">Confidentiality (NDA)</span>
              <span className={`text-sm font-bold ${requireNDA ? "text-blue-500" : "text-gray-900 dark:text-white"}`}>
                {requireNDA ? 'Required' : 'Not Required'}
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
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {initiatorRole}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 4: Posting Identity */}
        <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white/[0.01] space-y-3">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-2">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-[10px]">
              04. Posting Identity
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-200/50 dark:border-blue-500/20">
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
              <div className="w-11 h-11 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
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
      </div>

        {/* Navigation Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-white/10 flex flex-col gap-4">
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
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white dark:bg-zinc-900 dark:border-white/20 transition cursor-pointer disabled:opacity-50"
                />
                <span className="text-xs text-gray-600 dark:text-zinc-400 select-none group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  I agree to the <span className="font-semibold text-gray-900 dark:text-white">50 Credits</span> deduction to post this job.
                </span>
              </label>
            )}
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 font-bold hover:text-gray-900 dark:text-white transition text-xs focus:outline-none">Go Back</button>
            <button
              type="button"
              onClick={handlePublishClick}
              disabled={isSubmitting || walletBalance === null || walletBalance < 50 || !agreedToFee}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition focus:outline-none ${
                isSubmitting || walletBalance === null || walletBalance < 50 || !agreedToFee 
                  ? 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-zinc-600 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Payment & Post'} <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
};
export default CreateReview;

