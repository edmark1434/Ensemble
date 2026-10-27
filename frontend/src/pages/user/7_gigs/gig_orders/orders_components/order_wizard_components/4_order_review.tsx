import React, { useState } from "react";
import {
  ChevronDown,
  Edit2,
  Check,
  Shield,
  Film,
  Clock,
  RotateCcw,
  PackagePlus,
  CreditCard,
  User,
  Mail,
  ArrowLeft,
  ArrowRight,
  FileText,
  PlayCircle,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import type { Gig, GigTier, GigRequirement } from "@/pages/user/7_gigs/gig_datasets";
import { CreditIcon } from "@/components/ui/credit-icon";
import useGlobalState from "@/lib/global_state";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";
import { getImageUrl } from "@/lib/utils";

interface OrderReviewProps {
  gig: Gig;
  tierIndex: number;
  selectedAddonIds: string[];
  projectBrief: string;
  initiatorRole: "Client" | "Freelancer";
  isExistingProject: boolean;
  existingProjectTitle?: string;
  requireNda: "Yes" | "No";
  allowPortfolio: "Yes" | "No";
  portfolioDuration: number;
  questionnaires: GigRequirement[];
  questionAnswers: Record<string, any>;
  agreedToFreelancerTerms: boolean;
  setAgreedToFreelancerTerms: (val: boolean) => void;
  agreedToPlatformTerms: boolean;
  setAgreedToPlatformTerms: (val: boolean) => void;
  onEditStep: (stepId: number) => void;
  onProceedToCheckout: () => void;
  onBack: () => void;
  editOrderId?: string | null;
}

export const OrderReview: React.FC<OrderReviewProps> = ({
  gig,
  tierIndex,
  selectedAddonIds,
  projectBrief,
  initiatorRole,
  isExistingProject,
  existingProjectTitle,
  requireNda,
  allowPortfolio,
  portfolioDuration,
  questionnaires,
  questionAnswers,
  agreedToFreelancerTerms,
  setAgreedToFreelancerTerms,
  agreedToPlatformTerms,
  setAgreedToPlatformTerms,
  onEditStep,
  onProceedToCheckout,
  onBack,
  editOrderId,
}) => {
  const user = useGlobalState((state) => state.user);

  // Accordion toggle states
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(true);

  // Client card details
  const userName = user?.display_name || user?.name || user?.username || "Client";
  const userHandle = user?.handle || user?.username || "client";
  const userEmail = user?.email || "";

  const userAvatarUrl = React.useMemo(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || (user as any)?.profile_photo || user?.avatar;
    if (raw) return constructAvatarUrl(raw);
    return constructAvatarUrl(undefined, userName);
  }, [user, userName]);

  const userBannerUrl = React.useMemo(() => {
    if (user?.profile_banner_url) {
      return getImageUrl(user.profile_banner_url);
    }
    const preset = resolveBannerPreset((user as any)?.banner_preset, userHandle || userName);
    return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Blue.png";
  }, [user, userHandle, userName]);

  const activeTier: GigTier | undefined = gig.tiers?.[tierIndex] || gig.tiers?.[0];
  const addOns = gig.addOns || [];

  const selectedAddonsList = React.useMemo(() => {
    return addOns.filter((a) => a.id && selectedAddonIds.includes(String(a.id)));
  }, [addOns, selectedAddonIds]);

  const basePrice = activeTier?.price || 0;
  const baseDelivery = activeTier?.daysOfDelivery || 0;
  const addonsTotalPrice = selectedAddonsList.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  const addonsTotalDays = selectedAddonsList.reduce((sum, a) => sum + (Number(a.deliveryDays) || 0), 0);

  const totalPrice = basePrice + addonsTotalPrice;
  const totalDeliveryDays = baseDelivery + addonsTotalDays;

  // Filter custom questions (excluding duplicated NDA/Portfolio questions)
  const customQuestions = questionnaires.filter((q) => {
    const text = (q.question || "").toLowerCase();
    const isNda = text.includes("confidentiality") || text.includes("nda");
    const isPortfolio = text.includes("portfolio") || text.includes("showcase");
    return !isNda && !isPortfolio;
  });

  const canProceed = agreedToFreelancerTerms && agreedToPlatformTerms;

  return (
    <div className="space-y-6">
      {/* SECTION 1: ORDER CARD (NON-COLLAPSIBLE) */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              1
            </span>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Order Summary &amp; Package Card
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-600 dark:text-zinc-300 transition"
          >
            <Edit2 className="h-3 w-3" />
            <span>Edit</span>
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Client & Service Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
            {/* Client Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-2xs flex flex-col justify-between">
              {/* Banner Area */}
              <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-zinc-800">
                <img
                  src={userBannerUrl}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/profile_banner_presets/Ensemble%20Blue.png";
                  }}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-900/80 dark:bg-black/70 text-white backdrop-blur-xs border border-white/10 shadow-xs flex items-center gap-1.5">
                    <User className="h-3 w-3 text-blue-400" />
                    <span>Ordering Client</span>
                  </span>
                </div>
              </div>

              {/* Client Profile Info with Overlapping Avatar */}
              <div className="p-4 sm:p-5 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="relative z-10 -mt-7 mb-2 flex items-end justify-between">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm shrink-0">
                      <img
                        src={userAvatarUrl}
                        alt={userName}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = constructAvatarUrl(undefined, userName);
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                      {userName}
                    </h4>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 block truncate">
                      @{userHandle}
                    </span>
                  </div>
                  {userEmail && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <Mail className="h-3 w-3 text-zinc-400 shrink-0" />
                      <span className="truncate max-w-[220px]">{userEmail}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span>Account Role:</span>
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {initiatorRole === "Client" ? "Client / Commissioner" : "Collaborator"}
                  </span>
                </div>
              </div>
            </div>

            {/* Service Offering Card */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 overflow-hidden shadow-2xs flex flex-col justify-between">
              {/* Thumbnail Hero Strip */}
              <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-zinc-800">
                <img
                  src={gig.thumbnail}
                  alt={gig.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-900/80 dark:bg-black/70 text-white backdrop-blur-xs border border-white/10 shadow-xs flex items-center gap-1.5">
                    <Film className="h-3 w-3 text-emerald-400" />
                    <span>{gig.category || "Service Offering"}</span>
                  </span>
                </div>
              </div>

              {/* Service Info with Overlapping Thumbnail Icon */}
              <div className="p-4 sm:p-5 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="relative z-10 -mt-7 mb-2 flex items-end justify-between">
                    <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm shrink-0 border border-zinc-200 dark:border-zinc-700">
                      <img
                        src={gig.thumbnail}
                        alt={gig.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1" title={gig.title}>
                      {gig.title}
                    </h4>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 truncate">
                      By <strong className="text-zinc-700 dark:text-zinc-300">{gig.freelancer?.displayName || "Freelancer"}</strong>
                    </p>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                    {gig.description
                      ? gig.description.replace(/[#*_`~\[\]]/g, "").replace(/\s+/g, " ").trim()
                      : "Professional creative deliverables and custom workflows tailored to your requirements."}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
                  <span>Selected Tier:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {activeTier?.tierName || "Base Package"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Selected Tier & Inclusions Card */}
          <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-lg bg-blue-600 text-white shadow-xs">
                  {activeTier?.tierName || "Selected Package"}
                </span>
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                  {activeTier?.title}
                </h4>
              </div>
              <div className="flex items-center gap-1.5 font-black text-lg text-amber-500 shrink-0">
                <CreditIcon className="h-5 w-5" />
                <span>{activeTier?.price?.toLocaleString()} Credits</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {activeTier?.description || "Deliverables according to package specifications."}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 pt-2.5 border-t border-zinc-200 dark:border-zinc-800">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span>{activeTier?.daysOfDelivery} Days Timeline</span>
              </span>
              <span className="flex items-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                <span>{activeTier?.revisions} Revisions Included</span>
              </span>
            </div>
          </div>

          {/* Selected Add-ons */}
          {selectedAddonsList.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                  <PackagePlus className="h-3.5 w-3.5 text-blue-500" />
                  <span>Selected Add-ons &amp; Extras ({selectedAddonsList.length})</span>
                </span>
                <span className="text-xs text-zinc-400">
                  +{addonsTotalPrice.toLocaleString()} Cr total
                </span>
              </div>
              <div className="space-y-2">
                {selectedAddonsList.map((addon, aIdx) => (
                  <div
                    key={addon.id || aIdx}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        {addon.title}
                      </span>
                      {addon.deliveryDays ? (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          +{addon.deliveryDays} Day{addon.deliveryDays > 1 ? "s" : ""} Delivery Timeline
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">No additional timeline</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 shrink-0">
                      <CreditIcon className="h-3.5 w-3.5" />
                      <span>+{addon.price?.toLocaleString()} Cr</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Financial Ledger & Delivery Breakdown */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Financial Ledger &amp; Delivery Breakdown
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Delivery: <strong className="text-zinc-800 dark:text-zinc-200">{totalDeliveryDays} Days Total</strong>
              </span>
            </div>

            {/* Itemized breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                <span className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-zinc-900 dark:text-white">{activeTier?.tierName || "Base Package"}:</span>
                  <span className="text-zinc-500 dark:text-zinc-400 truncate">{activeTier?.title}</span>
                </span>
                <span className="font-bold flex items-center gap-1 text-zinc-900 dark:text-white shrink-0">
                  <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                  {basePrice.toLocaleString()} Cr
                </span>
              </div>

              {selectedAddonsList.map((addon, aIdx) => (
                <div key={addon.id || aIdx} className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="flex items-center gap-2 truncate">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">+ Add-on:</span>
                    <span className="text-zinc-500 dark:text-zinc-400 truncate">{addon.title}</span>
                  </span>
                  <span className="font-bold flex items-center gap-1 text-amber-600 dark:text-amber-400 shrink-0">
                    +{Number(addon.price).toLocaleString()} Cr
                  </span>
                </div>
              ))}
            </div>

            {/* Grand Total Strip */}
            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                <span>
                  Total Estimated Delivery: <strong className="text-zinc-800 dark:text-zinc-200">{totalDeliveryDays} Calendar Days</strong>
                </span>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="text-xs uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400">
                  Grand Total Escrow:
                </span>
                <div className="flex items-center gap-1.5 text-xl font-black text-amber-500">
                  <CreditIcon className="h-5 w-5" />
                  <span>{totalPrice.toLocaleString()} Credits</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: ORDER DETAILS (COLLAPSIBLE) */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-sm">
        <div
          onClick={() => setIsDetailsOpen(!isDetailsOpen)}
          className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              2
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Project Brief &amp; Workspace Setup
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Detailed instructions and project collaboration specifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(2);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-600 dark:text-zinc-300 transition"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <div
              className={`p-1 text-gray-400 transition-transform duration-200 ${
                isDetailsOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        {isDetailsOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-gray-100 dark:border-white/5 space-y-4">
            {/* Project Brief */}
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider block mb-1.5">
                Client Project Brief
              </span>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-xs sm:text-sm text-gray-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {projectBrief}
              </div>
            </div>

            {/* Workspace Setup Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/40">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Workspace Initiator
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block">
                  {initiatorRole === "Client" ? "Me (Client will invite editor)" : "The Freelancer"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/40">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Linked Ensemble Project
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block">
                  {isExistingProject && existingProjectTitle
                    ? existingProjectTitle
                    : "Standalone Order (No linked project)"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: ANSWERED QUESTIONS (COLLAPSIBLE) */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface overflow-hidden shadow-sm">
        <div
          onClick={() => setIsQuestionsOpen(!isQuestionsOpen)}
          className="p-5 sm:p-6 flex items-center justify-between cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
              3
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Answered Questions &amp; Legal Terms
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Confidentiality (NDA), portfolio showcase rights, and creator requirements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(3);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-semibold text-gray-600 dark:text-zinc-300 transition"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
            <div
              className={`p-1 text-gray-400 transition-transform duration-200 ${
                isQuestionsOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        {isQuestionsOpen && (
          <div className="p-5 sm:p-6 pt-0 border-t border-gray-100 dark:border-white/5 space-y-4">
            {/* Workflow Answers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/40">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5 text-blue-500" />
                  <span>Confidentiality (NDA)</span>
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block">
                  {requireNda === "Yes"
                    ? "✓ NDA Required (Strict Confidentiality)"
                    : "Standard Platform Confidentiality"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/40">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                  <Film className="h-3.5 w-3.5 text-blue-500" />
                  <span>Portfolio Showcase Rights</span>
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-white mt-1 block">
                  {allowPortfolio === "Yes"
                    ? `✓ Allowed (Up to ${portfolioDuration}s showcase)`
                    : "✗ Strictly Private (No Showcase)"}
                </span>
              </div>
            </div>

            {/* Custom Freelancer Questions */}
            {customQuestions.length > 0 && (
              <div className="space-y-3 pt-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 tracking-wider block">
                  Creator Questionnaire Responses
                </span>
                <div className="space-y-2.5">
                  {customQuestions.map((q, idx) => {
                    const ans = questionAnswers[idx];
                    const isFileUpload =
                      q.type === "file-upload" || q.type === "file" || q.type === "attachment";

                    return (
                      <div
                        key={q.id || idx}
                        className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-zinc-900/40 space-y-1.5"
                      >
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                          {q.question}
                        </h4>
                        {isFileUpload ? (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {ans ? (
                              String(ans)
                                .split(",")
                                .map((key, kIdx) => {
                                  const filename = key.split("/").pop() || "Uploaded Document";
                                  return (
                                    <div
                                      key={kIdx}
                                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-dark-base border border-gray-200 dark:border-white/10 text-[11px] text-gray-700 dark:text-zinc-300"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                                      <span className="truncate max-w-[150px]">{filename}</span>
                                    </div>
                                  );
                                })
                            ) : (
                              <span className="text-xs text-gray-400 italic">None provided</span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-700 dark:text-zinc-300">
                            {Array.isArray(ans) ? ans.join(", ") : String(ans || "No response provided")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AGREEMENTS CHECKBOXES */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gray-50 dark:bg-zinc-900/40 border border-gray-200 dark:border-white/10 space-y-3.5">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            checked={agreedToFreelancerTerms}
            onChange={(e) => setAgreedToFreelancerTerms(e.target.checked)}
          />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-200 transition-colors">
            I certify that I have read and agree to the{" "}
            <strong className="text-gray-900 dark:text-white font-semibold">
              Freelancer's Terms of Service &amp; Scope
            </strong>{" "}
            for this order.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            checked={agreedToPlatformTerms}
            onChange={(e) => setAgreedToPlatformTerms(e.target.checked)}
          />
          <span className="text-xs sm:text-sm text-gray-600 dark:text-zinc-400 group-hover:text-gray-900 dark:group-hover:text-zinc-200 transition-colors">
            I agree to the{" "}
            <strong className="text-gray-900 dark:text-white font-semibold">
              Ensemble Platform Terms &amp; Conditions
            </strong>{" "}
            and acknowledge that payment is secured in double-blind escrow until deliverables are approved.
          </span>
        </label>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-zinc-300 font-semibold text-xs transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Questions</span>
        </button>

        <button
          type="button"
          onClick={onProceedToCheckout}
          disabled={!canProceed}
          className="flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 cursor-pointer"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default OrderReview;
