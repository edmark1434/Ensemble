import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "@/lib/axios";
import {
  Check,
  Clock,
  User,
  Users,
  CheckCircle2,
  Play,
  Volume2,
  Image as ImageIcon,
  Video,
  FileText,
  ExternalLink,
  Paperclip,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Maximize2,
  Minimize2,
  Briefcase,
  Layers,
  Tag,
  Rocket,
  Edit2,
  ShieldCheck,
  Calendar,
  Eye,
  Plus,
  Bookmark,
  TrendingUp,
  ShoppingCart,
  Star,
  Sparkles,
  HelpCircle,
  Copy,
  Lock,
  Wrench,
  Download,
  PackagePlus,
  Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditIcon } from "@/components/ui/credit-icon";
import { SlideCommit } from "@/components/ui/SlideCommit";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";
import useGlobalState from "@/lib/global_state";
import { constructAvatarUrl } from "@/lib/accountAvatars";
import { bannerPresetUrl } from "@/lib/profileBanners";
import { getImageUrl } from "@/lib/utils";
import type { Gig, GigTier, GigAddOn, Questionnaire } from "../../gig_datasets";
import type { ServiceMilestone } from "./3_gig_milestones";
import { JobRichText } from "../../../6_job_market/job_components/JobRichText";
import { computeGigRankingBreakdown } from "../../gig_ranking";

interface TeamInfo {
  id: string;
  name?: string;
  display_name?: string;
  team_name?: string;
  handle?: string;
  description?: string;
  bio?: string;
  avatar_path?: string;
  avatar_url?: string;
  avatar?: string;
  banner_preset?: string;
  banner_url?: string;
  banner_path?: string;
  members_count?: number;
  members?: any[];
}

type ReviewFileType = "image" | "video" | "audio" | "pdf" | "other";

const getReviewFileType = (file: File): ReviewFileType => {
  const mime = (file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) {
    return "audio";
  }
  if (mime === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  return "other";
};

const formatReviewFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

interface CreateReviewProps {
  title: string;
  description: string;
  category: string;
  thumbnailUrl: string | null;
  slots: number;
  termsOfService: string;
  skills: string[];
  firstDraftDelivery?: string;
  workSampleFiles?: File[];
  tiers: GigTier[];
  addOns?: GigAddOn[];
  milestones: ServiceMilestone[];
  additionalWorkRate: number;
  questionnaires: Questionnaire[];
  askNDA: boolean;
  askPortfolio: boolean;
  portfolioDuration?: string;
  postingAs: "self" | "team";
  actingTeamId: string;
  includedMemberIds: string[];
  onBack: () => void;
  onSubmit: () => Promise<void> | void;
  onEditStep: (step: number) => void;
  isSubmitting?: boolean;
}

const EMPTY_FILES: File[] = [];

export const CreateReview: React.FC<CreateReviewProps> = ({
  title,
  description,
  category,
  thumbnailUrl,
  slots,
  termsOfService,
  skills,
  firstDraftDelivery = "3 Days",
  workSampleFiles = EMPTY_FILES,
  tiers,
  addOns = [],
  milestones,
  additionalWorkRate,
  questionnaires,
  askNDA,
  askPortfolio,
  portfolioDuration,
  postingAs,
  actingTeamId,
  includedMemberIds,
  onBack,
  onSubmit,
  onEditStep,
  isSubmitting = false,
}) => {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [copiedTos, setCopiedTos] = useState(false);

  const user = useGlobalState((state) => state.user);
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  // Collapsible sections 02, 03, 04, 05 (Section 01 is permanent anchor - not collapsible)
  const [isSection2Collapsed, setIsSection2Collapsed] = useState(false); // Service Details
  const [isSection3Collapsed, setIsSection3Collapsed] = useState(false); // Order Policies & Deliverables
  const [isSection4Collapsed, setIsSection4Collapsed] = useState(false); // Milestones
  const [isSection5Collapsed, setIsSection5Collapsed] = useState(false); // Pricing & Tiers

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

  // Close checkout modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCheckoutModalOpen && !isSubmitting) {
        setIsCheckoutModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCheckoutModalOpen, isSubmitting]);

  // Team details fetching
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  useEffect(() => {
    let isSubscribed = true;
    const isValidUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    if (postingAs === "team" && isValidUuid(actingTeamId)) {
      api.get(`/api/teams/${actingTeamId}`)
        .then((res) => {
          if (isSubscribed) {
            const t = res.data?.data || res.data?.team || res.data;
            if (t) setTeamInfo(t);
          }
        })
        .catch((err) => console.error("Failed to load acting team for review:", err));

      api.get(`/api/teams/${actingTeamId}/members`)
        .then((res) => {
          if (!isSubscribed) return;
          const raw = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.data)
            ? res.data.data
            : [];
          const active = raw.filter(
            (m: any) => !m.status || String(m.status).toLowerCase() === "active"
          );
          setTeamMembers(active);
        })
        .catch(() => {});
    } else {
      setTeamInfo(null);
      setTeamMembers([]);
    }
    return () => {
      isSubscribed = false;
    };
  }, [postingAs, actingTeamId]);

  // Object URL previews for work samples
  const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map());
  const [previewModalItem, setPreviewModalItem] = useState<{
    file: File;
    url: string;
    type: ReviewFileType;
    name: string;
    size: string;
  } | null>(null);

  useEffect(() => {
    setPreviewUrls((prevMap) => {
      const nextMap = new Map<File, string>();
      workSampleFiles.forEach((file) => {
        if (prevMap.has(file)) {
          nextMap.set(file, prevMap.get(file)!);
        } else {
          nextMap.set(file, URL.createObjectURL(file));
        }
      });
      prevMap.forEach((url, file) => {
        if (!workSampleFiles.includes(file)) {
          URL.revokeObjectURL(url);
        }
      });
      return nextMap;
    });
  }, [workSampleFiles]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Escape listener for preview modal
  useEffect(() => {
    if (!previewModalItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewModalItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModalItem]);

  // Fetch wallet balance
  useEffect(() => {
    let mounted = true;
    api.get("/api/accounts/wallet", { params: { type: "account_wallets" } })
      .then((res) => {
        if (mounted) {
          setWalletBalance(res.data?.wallet?.balance_credits ?? 0);
        }
      })
      .catch((err) => {
        if (err?.response?.status !== 401) {
          console.error("Failed to load wallet balance:", err);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const profileAvatar = useMemo(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    return constructAvatarUrl(raw, user?.display_name || user?.username);
  }, [user]);

  const teamAvatar = useMemo(() => {
    if (!teamInfo) return "";
    const raw = teamInfo.avatar_url || teamInfo.avatar_path || teamInfo.avatar;
    return constructAvatarUrl(raw, teamInfo.team_name || teamInfo.name);
  }, [teamInfo]);

  const teamBanner = useMemo(() => {
    if (!teamInfo) return "";
    if (teamInfo.banner_preset) return bannerPresetUrl(teamInfo.banner_preset);
    const raw = teamInfo.banner_url || teamInfo.banner_path;
    return raw ? getImageUrl(raw) : "";
  }, [teamInfo]);

  const teamName = teamInfo?.team_name || teamInfo?.name || "Team / Studio";
  const teamHandle = teamInfo?.handle ? `@${teamInfo.handle.replace(/^@/, "")}` : "@team";
  const userName = user?.display_name || user?.username || "You";

  const includedMembersList = useMemo(() => {
    if (postingAs !== "team") return [];
    if (!includedMemberIds || includedMemberIds.length === 0) return teamMembers;
    return teamMembers.filter((m) =>
      includedMemberIds.includes(String(m.account_id || m.id || m.user_id))
    );
  }, [postingAs, teamMembers, includedMemberIds]);

  const startingPrice = useMemo(() => {
    if (!tiers || tiers.length === 0) return 0;
    return Math.min(...tiers.map((t) => t.price || 0));
  }, [tiers]);

  // Construct synthetic Gig instance for genuine Card Preview & Algorithm Score Calculation
  const previewGig: Gig = useMemo(() => {
    return {
      id: "preview-service-card",
      title: title.trim() || "Untitled Service Offering",
      description: description.trim() || "No service description provided yet.",
      category: category || "Video Editing",
      clientRating: Number(user?.rating) || 5.0,
      ratingCount: Number(user?.rating_count) || 0,
      ordersCount: 0,
      pendingOrdersCount: 0,
      thumbnail: thumbnailUrl || "/placeholder-gig.png",
      gallery: workSampleFiles.map((f) => f.name),
      status: "Open",
      postedBy: postingAs === "team" ? teamName : userName,
      clientAvatar: postingAs === "team" && teamAvatar ? teamAvatar : (profileAvatar || "/profile_presets/p1.png"),
      createdAt: new Date().toISOString(),
      postedAt: new Date().toISOString(),
      timeAgo: "Just now",
      priceRange: `${startingPrice.toLocaleString()} Credits`,
      tiers: tiers.map((t, idx) => ({
        id: (t as any).id || (t as any).tierId || t.title || String(idx),
        name: t.title || t.tierName || (idx === 0 ? "Basic" : idx === 1 ? "Standard" : "Premium"),
        price: t.price,
        timeline: `${t.daysOfDelivery} Days`,
        revisions: String(t.revisions),
        features: (t as any).features || [],
      })),
      milestones: milestones.map((m, idx) => ({
        id: String(m.id || idx),
        title: m.name || `Phase ${idx + 1}`,
        description: m.description,
        deliverables: m.tasks || [],
        timelinePercentage: m.percentage ?? 0,
      })),
      skills,
      termsOfService,
      slots: slots || 3,
      isSaved: false,
      isOwnGig: true,
      canManageGig: true,
    } as any;
  }, [
    title,
    description,
    category,
    thumbnailUrl,
    workSampleFiles,
    user,
    postingAs,
    teamName,
    userName,
    teamAvatar,
    profileAvatar,
    startingPrice,
    tiers,
    milestones,
    skills,
    termsOfService,
    slots,
  ]);

  const ranking = useMemo(() => computeGigRankingBreakdown(previewGig), [previewGig]);

  const handleCopyTos = () => {
    if (!termsOfService) return;
    navigator.clipboard.writeText(termsOfService).then(() => {
      setCopiedTos(true);
      setTimeout(() => setCopiedTos(false), 2000);
    });
  };

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header with Master Collapse / Expand Control (NO 'Final Step' pill per request) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-white/10">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Review Service Offering
          </h2>
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
          SECTION 01: CARD PREVIEW & DISCOVERY SCORE (Permanent Anchor - Not Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section 01 Permanent Header */}
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
              onClick={() => onEditStep(2)}
              className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold px-2 py-1 transition cursor-pointer"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Section 01 Content */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Real-time Service Card Preview (Exact look on Live Services Market) */}
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
                  onClick={() => onEditStep(2)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold transition focus:outline-none flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" /> Edit
                </button>
              </div>

              {/* Genuine Marketplace Gig Card */}
              <div className="group flex flex-col sm:flex-row gap-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-sm transition-all relative overflow-hidden flex-1">
                {/* Thumbnail Column */}
                <div className="relative h-44 sm:h-auto sm:min-h-[160px] w-full sm:w-56 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/5">
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="Service Thumbnail" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-900">
                      <Sparkles className="h-8 w-8 mb-2 opacity-40 text-blue-500" />
                      <span className="text-xs font-medium">Default Thumbnail</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                  {/* Top Left: Orders & Service Rating Badges */}
                  <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1.5 z-10">
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                      <ShoppingCart className="h-3 w-3" />
                      <span>0 Orders</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold border border-white/10">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-yellow-400">
                        {ranking.isNewListing ? "New" : "5.0 (0)"}
                      </span>
                    </div>
                  </div>

                  {/* Top Right: Bookmark dummy */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    <div className="p-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white/80">
                      <Bookmark className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Bottom Left: Tiers Count Tag */}
                  {tiers && tiers.length > 0 && (
                    <div className="absolute bottom-2 left-2 z-10">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/95 dark:bg-black/80 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/15 backdrop-blur-md text-[9px] font-semibold shadow-xs">
                        <Layers className="h-2.5 w-2.5 text-gray-500 dark:text-zinc-400" />
                        <span>{tiers.length} {tiers.length === 1 ? "Tier" : "Tiers"}</span>
                      </span>
                    </div>
                  )}
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
                        {ranking.isRisingCreator && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100/90 text-emerald-800 border border-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-200 dark:border-emerald-400 shadow-xs">
                            <TrendingUp className="h-2.5 w-2.5" />
                            <span>Rising</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Starting Price & Tag */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <div className="text-amber-500 dark:text-amber-400 text-base sm:text-lg font-black flex items-center gap-1">
                        <CreditIcon className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0" />
                        <span>{startingPrice.toLocaleString()} Credits</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Starting at
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-gray-900 dark:text-white text-base sm:text-lg font-bold mb-1.5 line-clamp-1">
                      {title || <span className="text-gray-400 italic font-normal">Untitled Service Offering</span>}
                    </h3>

                    {/* Description Snippet */}
                    <div className="mb-3 text-xs text-gray-600 dark:text-zinc-400 line-clamp-2">
                      <JobRichText content={description || "No service description provided."} truncate={2} />
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-3">
                        <Wrench className="h-3 w-3 text-gray-400 dark:text-zinc-400 shrink-0 mr-0.5" />
                        {skills.slice(0, 4).map((skill, sIdx) => (
                          <span
                            key={`${skill}-${sIdx}`}
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

                  {/* Bottom Row: Creator Info & Time */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-zinc-400 font-medium">
                    <div className="flex items-center gap-2 truncate">
                      <div className="relative h-6 w-6 shrink-0 rounded-full overflow-hidden bg-gray-200 dark:bg-zinc-800 border border-gray-200 dark:border-white/10">
                        <img
                          src={postingAs === "team" && teamAvatar ? teamAvatar : (profileAvatar || "/profile_presets/p1.png")}
                          alt="Creator Avatar"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = "/profile_presets/p1.png";
                          }}
                        />
                      </div>
                      <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate">
                        {postingAs === "team" ? teamName : userName}
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

            {/* Right: Service Discovery Algorithm & Listing Appeal Widget */}
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
                    {ranking.totalScore >= 80 ? "High Visibility" : ranking.totalScore >= 60 ? "Solid Listing" : "Moderate Reach"}
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
                      Prioritized by Ensemble algorithm for client feed recommendations.
                    </p>
                  </div>
                </div>

                {/* Compact Breakdown Grid */}
                <div className="pt-2.5 border-t border-gray-200 dark:border-white/10 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/5">
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400 block font-medium">Listing Completeness</span>
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
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      &#10003; {tiers.length} Tiers
                    </span>
                    {thumbnailUrl && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
                        &#10003; Custom Visual
                      </span>
                    )}
                    {milestones.length >= 2 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                        &#10003; {milestones.length} Milestones
                      </span>
                    )}
                    {skills.length >= 3 && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 font-semibold">
                        &#10003; 3+ Skills
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
          SECTION 02: SERVICE DETAILS (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection2Collapsed(!isSection2Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              02. Service Details
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {category} &bull; {slots} Concurrent Slots
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
              {/* Proposing Representation Banner */}
              <div className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block mb-2">
                  Provider Representation
                </span>
                {postingAs === "team" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={teamAvatar || constructAvatarUrl(null, teamName)}
                          alt={teamName}
                          className="h-10 w-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{teamName}</span>
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold border border-purple-500/20">
                              Team Offering
                            </span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{teamHandle}</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        {includedMembersList.length} Included Member{includedMembersList.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {includedMembersList.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700/60">
                        {includedMembersList.map((m: any, mIdx: number) => {
                          const name = m.display_name || m.name || m.username || "Member";
                          const avatar = constructAvatarUrl(m.avatar_url || m.avatar_path || m.avatar, name);
                          return (
                            <div
                              key={m.id || m.account_id || m.user_id || mIdx}
                              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                            >
                              <img src={avatar} alt={name} className="h-4 w-4 rounded-full object-cover" />
                              <span>{name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={profileAvatar || "/profile_presets/p1.png"}
                        alt={userName}
                        className="h-10 w-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-900 dark:text-white">{userName}</span>
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-500/20">
                            Individual Freelancer
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {user?.username ? `@${user.username.replace(/^@/, "")}` : "@you"}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Direct Solo Listing
                    </span>
                  </div>
                )}
              </div>

              {/* Service Title */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Service Title
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                  {title.trim() || "Untitled Service Offering"}
                </h3>
              </div>

              {/* Category, Slots & Turnaround Sub-Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Category
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white mt-0.5 block truncate">
                    {category || "Video Editing"}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Simultaneous Slots
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white mt-0.5 block">
                    {slots} Active Orders Limit
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Initial Draft Delivery
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white mt-0.5 block">
                    {firstDraftDelivery}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Service Description
                </span>
                <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800/80 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed max-h-72 overflow-y-auto">
                  <JobRichText content={description || "No service description provided."} />
                </div>
              </div>

              {/* Applied Skills */}
              {skills && skills.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Applied Skills & Software ({skills.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, sIdx) => (
                      <span
                        key={`${skill}-${sIdx}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 shadow-2xs"
                      >
                        <Wrench className="h-3 w-3 text-zinc-400" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 03: ORDER POLICIES & DELIVERABLES (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection3Collapsed(!isSection3Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              03. Order Policies & Deliverables
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              Terms &bull; Capacity &bull; Workflow
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
              {/* Terms of Service Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Terms of Service & Contract Clauses
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyTos}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    {copiedTos ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedTos ? "Copied" : "Copy Terms"}</span>
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800/80 whitespace-pre-wrap select-all shadow-2xs">
                  {termsOfService || "Standard Ensemble Platform Terms of Service apply."}
                </div>
              </div>

              {/* Order Capacity & Additional Work Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Order Capacity
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                    {slots} Active Order Slots
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    New clients are automatically queued if concurrent orders reach this threshold.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                    Additional Work Rate
                  </span>
                  <span className="text-sm font-bold text-zinc-900 dark:text-white block">
                    +{additionalWorkRate}% per Extra Pass
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Applied to phase subtotal for revisions beyond package limits.
                  </p>
                </div>
              </div>

              {/* Workflow Rules: NDA & Portfolio Rights */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Workflow Rules & Privacy
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
                    <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        {askNDA ? "Strict NDA Protected" : "Standard Confidentiality"}
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        {askNDA
                          ? "Provider agrees to sign and comply with client NDA, keeping all raw footage confidential."
                          : "Standard platform confidentiality terms apply to all shared assets."}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
                    <Briefcase className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                        {askPortfolio
                          ? portfolioDuration
                            ? `Portfolio Rights (after ${portfolioDuration}d)`
                            : "Portfolio Rights Permitted"
                          : "Private Work / No Showcase"}
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        {askPortfolio
                          ? `Provider reserves right to showcase final edit in portfolio${portfolioDuration ? ` after a ${portfolioDuration}-day commercial blackout window` : ""}.`
                          : "Deliverables remain strictly private and will not be displayed on creator profile."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Questionnaires & Intake Requirements */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                  Client Intake Questions ({questionnaires.length})
                </span>
                {questionnaires.length > 0 ? (
                  <div className="space-y-2">
                    {questionnaires.map((q, idx) => (
                      <div
                        key={q.id || `q-${idx}`}
                        className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3 text-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-zinc-900 dark:text-white block">
                            {q.question}
                          </span>
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize mt-0.5 block">
                            Format: {q.type.replace(/_/g, " ")} {q.required ? "• Mandatory" : "• Optional"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                    No mandatory intake requirements configured. Standard order brief will be used.
                  </p>
                )}
              </div>

              {/* Attached Work Samples */}
              {workSampleFiles && workSampleFiles.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">
                    Attached Work Samples ({workSampleFiles.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {workSampleFiles.map((file, idx) => {
                      const type = getReviewFileType(file);
                      const url = previewUrls.get(file) || "";
                      const ext = file.name.split(".").pop()?.toUpperCase() || type.toUpperCase();
                      return (
                        <div
                          key={`${file.name}-${file.size}-${idx}`}
                          onClick={() => {
                            if (url) {
                              setPreviewModalItem({
                                file,
                                url,
                                type,
                                name: file.name,
                                size: formatReviewFileSize(file.size),
                              });
                            }
                          }}
                          className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-all flex flex-col items-center justify-center select-none shadow-2xs hover:shadow-md"
                        >
                          {type === "image" && url ? (
                            <img src={url} alt={file.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          ) : type === "video" ? (
                            <div className="relative w-full h-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                              {url ? (
                                <video
                                  src={url}
                                  preload="metadata"
                                  className="h-full w-full object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                                />
                              ) : (
                                <Video className="h-6 w-6 text-zinc-400" />
                              )}
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none group-hover:bg-black/40 transition-colors">
                                <span className="w-8 h-8 rounded-full bg-white/90 text-zinc-900 flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                                  <Play className="h-4 w-4 fill-current ml-0.5" />
                                </span>
                              </div>
                            </div>
                          ) : type === "audio" ? (
                            <div className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-300 p-2">
                              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1">
                                <Volume2 className="h-5 w-5" />
                              </div>
                              <span className="text-[10px] font-semibold truncate max-w-full">Audio</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-600 dark:text-zinc-300 p-2">
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                                <FileText className="h-5 w-5" />
                              </div>
                              <span className="text-[10px] font-semibold truncate max-w-full">{ext}</span>
                            </div>
                          )}

                          {/* Extension Tag */}
                          <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-[9px] font-mono font-bold uppercase text-white shadow-xs">
                            {ext}
                          </span>

                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white pointer-events-none">
                            <Eye className="h-4 w-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 04: MILESTONES (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection4Collapsed(!isSection4Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              04. Milestones Roadmap & Phases
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {milestones.length} Roadmap Phase{milestones.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(4);
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
              className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 space-y-4"
            >
              <div className="space-y-3">
                {milestones.map((m, idx) => (
                  <div
                    key={m.id || `ms-${idx}`}
                    className="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                            {m.name || `Phase ${idx + 1}`}
                          </h4>
                          {m.hours && (
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                              • {m.hours} Hours
                            </span>
                          )}
                          {m.revisions !== undefined && (
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                              • {m.revisions} Revisions
                            </span>
                          )}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-500/20 shrink-0">
                          {m.percentage ?? 0}% Time Share
                        </span>
                      </div>

                      {m.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {m.description}
                        </p>
                      )}

                      {m.tasks && m.tasks.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {m.tasks.map((task, tIdx) => (
                            <span
                              key={`task-${tIdx}-${task.slice(0, 10)}`}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span>{task}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 05: PRICING & TIERS (Collapsible)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Section Header */}
        <div
          onClick={() => setIsSection5Collapsed(!isSection5Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              05. Pricing & Tiers
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {tiers.length} Tier{tiers.length === 1 ? "" : "s"} &bull; Starting at {startingPrice.toLocaleString()} Credits
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(5);
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
              {/* Tiers Grid */}
              <div
                className={`grid gap-4 ${
                  tiers.length === 1
                    ? "grid-cols-1 max-w-md mx-auto"
                    : tiers.length === 2
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-3"
                }`}
              >
                {tiers.map((tier, tIdx) => {
                  const tierTitle = tier.title || tier.tierName || (tIdx === 0 ? "Basic" : tIdx === 1 ? "Standard" : "Premium");
                  return (
                    <div
                      key={tier.id || tier.tierId || `tier-${tIdx}`}
                      className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Tier Title & Price */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                              {tierTitle}
                            </h4>
                            {tier.tierName && tier.tierName !== tierTitle && (
                              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block truncate">
                                {tier.tierName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-base font-black text-amber-500 dark:text-amber-400 shrink-0">
                            <CreditIcon className="h-4 w-4" />
                            <span>{tier.price.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Timeline & Revisions Stats */}
                        <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60">
                            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block tracking-wider">
                              Timeline
                            </span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 block">
                              {tier.daysOfDelivery} {tier.daysOfDelivery === 1 ? "Day" : "Days"}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60">
                            <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block tracking-wider">
                              Revisions
                            </span>
                            <span className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 block">
                              {tier.revisions} {tier.revisions === 1 ? "Revision" : "Revisions"}
                            </span>
                          </div>
                        </div>

                        {/* Description */}
                        {tier.description && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
                            {tier.description}
                          </p>
                        )}

                        {/* Features */}
                        {(tier as any).features && (tier as any).features.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                              Included in Package
                            </span>
                            {(tier as any).features.map((feat: string, fIdx: number) => (
                              <div key={fIdx} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                                <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Service Add-ons & Extras */}
              {addOns && addOns.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Configured Service Add-ons ({addOns.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {addOns.map((addon, aIdx) => (
                      <div
                        key={addon.id || `addon-${aIdx}`}
                        className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="font-semibold text-zinc-900 dark:text-white truncate">
                          {addon.title}
                        </span>
                        <div className="flex items-center gap-1 font-bold text-amber-500 dark:text-amber-400 shrink-0">
                          <CreditIcon className="h-3.5 w-3.5" />
                          <span>+{addon.price} Cr</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          PAGE BOTTOM NAVIGATION: GO BACK OR PROCEED TO CHECKOUT
         ========================================================================= */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Tiers
        </button>

        <button
          type="button"
          onClick={() => setIsCheckoutModalOpen(true)}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-2.5"
        >
          <Rocket className="h-4 w-4" />
          <span>Proceed to Checkout</span>
          <span className="px-2 py-0.5 rounded-md bg-blue-700/80 text-[10px] font-extrabold text-blue-100">
            50 Credits
          </span>
        </button>
      </div>

      {/* =========================================================================
          CHECKOUT GIG LISTING MODAL (Swipe Commit Modal matching Jobs Review)
         ========================================================================= */}
      {isCheckoutModalOpen && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6"
            onClick={() => {
              if (!isSubmitting) setIsCheckoutModalOpen(false);
            }}
          >
            {/* Floating Upper Right Credits Pill */}
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
                    Checkout Gig Listing
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Confirm publication fee deduction to broadcast service to marketplace
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
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold shrink-0">Service Title:</span>
                    <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[260px] text-right">
                      {title.trim() || "Untitled Service Offering"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold shrink-0">Category & Packages:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right">
                      {category || "Video Editing"} • {tiers.length} Tier{tiers.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700/80">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Starting Price:</span>
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>{startingPrice.toLocaleString()} Credits</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Queue Capacity:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {slots} Simultaneous Active Orders Limit
                    </span>
                  </div>
                </div>

                {/* 100% Listing Discovery Notice */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Fair Discovery Algorithm Protection</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                    Your service post will be immediately indexed and promoted with full Bayesian newcomer boosts, ensuring equal day-1 visibility in buyer search and category feeds.
                  </p>
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
                      Top Up Credits
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
                      I agree to deduct <span className="font-bold text-zinc-950 dark:text-white">50 Credits</span> from my wallet to publish and broadcast this service offering to the live marketplace.
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
                    setIsCheckoutModalOpen(false);
                    await onSubmit();
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

      {/* Lightbox Preview Modal for Attached Files */}
      {previewModalItem && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white truncate max-w-md">
                    {previewModalItem.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">
                    ({previewModalItem.size})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalItem(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-6 flex items-center justify-center overflow-auto max-h-[70vh]">
                {previewModalItem.type === "image" && (
                  <img
                    src={previewModalItem.url}
                    alt={previewModalItem.name}
                    className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md"
                  />
                )}
                {previewModalItem.type === "video" && (
                  <video
                    src={previewModalItem.url}
                    controls
                    autoPlay
                    className="max-h-[60vh] max-w-full rounded-lg shadow-md"
                  />
                )}
                {previewModalItem.type === "audio" && (
                  <div className="w-full max-w-md p-6 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex flex-col items-center gap-4">
                    <Volume2 className="h-12 w-12 text-blue-500" />
                    <audio src={previewModalItem.url} controls className="w-full" />
                  </div>
                )}
                {previewModalItem.type === "pdf" && (
                  <iframe
                    src={previewModalItem.url}
                    title={previewModalItem.name}
                    className="w-full h-[60vh] rounded-lg border border-zinc-200 dark:border-zinc-800"
                  />
                )}
                {previewModalItem.type === "other" && (
                  <div className="text-center py-12 space-y-3">
                    <FileText className="h-12 w-12 mx-auto text-zinc-400" />
                    <p className="text-xs text-zinc-500">Preview not supported for this file format.</p>
                  </div>
                )}
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
