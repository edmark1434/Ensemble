import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import api from "@/lib/axios.ts";
import {
  Check,
  Percent,
  RefreshCcw,
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
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Maximize2,
  Minimize2,
  Briefcase,
  Crown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Job } from "../../../job_components/job_lists";
import type { Milestone } from "./3_proposal_milestones";
import { CreditIcon } from "@/components/ui/credit-icon";
import { SlideCommit } from "@/components/ui/SlideCommit";
import FloatingCreditsPill from "@/components/ui/FloatingCreditsPill";
import useGlobalState from "@/lib/global_state";
import { constructAvatarUrl, getFallbackAvatarUrl } from "@/lib/accountAvatars";
import { resolveBannerPreset, bannerPresetUrl } from "@/lib/profileBanners";
import { getImageUrl } from "@/lib/utils";

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
  member_count?: number;
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

const getPhaseTheme = (index: number) => {
  const themes = [
    { num: 1, circleBg: "bg-blue-600 text-white" },
    { num: 2, circleBg: "bg-purple-600 text-white" },
    { num: 3, circleBg: "bg-emerald-600 text-white" },
    { num: 4, circleBg: "bg-amber-600 text-white" },
  ];
  return themes[index % themes.length];
};

interface ProposalReviewProps {
  job: Job | null;
  bidAmount: string;
  additionalWorkRate: number;
  coverLetter: string;
  tosContent: string;
  milestones: Milestone[];
  actingTeamId?: string;
  includedMemberIds?: string[];
  workSampleFiles?: File[];
  screeningAnswers?: { question: string; answer: string }[];
  onEditStep: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const ProposalReviewStep: React.FC<ProposalReviewProps> = ({
  job,
  bidAmount,
  additionalWorkRate,
  coverLetter,
  tosContent,
  milestones,
  actingTeamId,
  includedMemberIds = [],
  workSampleFiles = [],
  screeningAnswers = [],
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting
}) => {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const user = useGlobalState((state) => state.user);
  const theme = useGlobalState((state) => state.theme);
  const isDark = theme === "dark" || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));

  const [profileAvatar, setProfileAvatar] = useState<string | undefined>(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    return constructAvatarUrl(raw, user?.display_name || user?.username);
  });
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Collapsible section states (Sections 2-5 collapsible, Section 1 permanently open)
  const [isSection2Collapsed, setIsSection2Collapsed] = useState(false); // Cover Letter & Screening Q&A
  const [isSection3Collapsed, setIsSection3Collapsed] = useState(false); // TOS & Job Specifications
  const [isSection4Collapsed, setIsSection4Collapsed] = useState(false); // Work Samples
  const [isSection5Collapsed, setIsSection5Collapsed] = useState(false); // Milestones

  // Dedicated Checkout Modal state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // Sub-accordions for milestone card tasks
  const [expandedMilestoneTasks, setExpandedMilestoneTasks] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    milestones.forEach((_, idx) => {
      initial[idx] = true;
    });
    return initial;
  });

  const toggleMilestoneTasks = (idx: number) => {
    setExpandedMilestoneTasks((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

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

  // Object URL previews state & cleanup for work sample files
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

  // Close preview modal on Escape key
  useEffect(() => {
    if (!previewModalItem) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewModalItem(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewModalItem]);

  // Close checkout modal on Escape key
  useEffect(() => {
    if (!isCheckoutModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) setIsCheckoutModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCheckoutModalOpen, isSubmitting]);

  useEffect(() => {
    const raw = user?.avatar_preset_url || user?.avatar_url || user?.profile_photo || user?.avatar;
    if (raw) {
      setProfileAvatar(constructAvatarUrl(raw, user?.display_name || user?.username));
    } else {
      const accountId = user?.account_id || user?.accountId || user?.id;
      if (accountId) {
        api.get(`/api/accounts/profile/${accountId}`)
          .then((res) => {
            const data = res.data?.data || res.data?.profile || res.data || {};
            const fetched = data.avatar_preset_url || data.avatar_url;
            if (fetched) {
              setProfileAvatar(constructAvatarUrl(fetched, user?.display_name || user?.username));
            }
          })
          .catch(() => {});
      }
    }
  }, [user]);

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

  useEffect(() => {
    let isSubscribed = true;
    const isValidUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

    if (isValidUuid(actingTeamId)) {
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
  }, [actingTeamId]);

  const currentUserAccountId = String(user?.account_id || user?.accountId || user?.id || "");
  const includedTeamRoster = useMemo(() => {
    if (!actingTeamId || teamMembers.length === 0) return [];
    const filtered =
      includedMemberIds.length > 0
        ? teamMembers.filter(
            (m: any) =>
              m.role === "Owner" ||
              String(m.account_id) === currentUserAccountId ||
              includedMemberIds.includes(String(m.account_id))
          )
        : teamMembers;
    return [...filtered].sort((a: any, b: any) => {
      const aRank = a.role === "Owner" ? 0 : String(a.account_id) === currentUserAccountId ? 1 : 2;
      const bRank = b.role === "Owner" ? 0 : String(b.account_id) === currentUserAccountId ? 1 : 2;
      return aRank - bRank;
    });
  }, [actingTeamId, teamMembers, includedMemberIds, currentUserAccountId]);

  const totalBid = parseInt(bidAmount || "0", 10);
  const count = milestones.length || 1;
  const netTotalEarnings = Math.floor(totalBid * 0.9);
  const platformFee = Math.ceil(totalBid * 0.1);

  const averageMilestonePayout = Math.floor(totalBid / count);
  const overageRateBonus = Math.floor(averageMilestonePayout * (additionalWorkRate / 100));
  const totalHours = milestones.reduce((sum, m) => sum + (Number(m.hours) || 0), 0);

  const teamName = teamInfo?.display_name || teamInfo?.name || teamInfo?.team_name || "Team / Studio";
  const teamHandle = (teamInfo as any)?.handle || "team";
  const userName = user?.display_name || user?.name || user?.username || "You";
  const userHandle = user?.handle || user?.username || "freelancer";
  const displayHandle = actingTeamId ? teamHandle : userHandle;

  // User banner URL resolution
  const userBannerPreset = (user as any)?.banner_preset || null;
  const userBannerUrl = useMemo(() => {
    const preset = resolveBannerPreset(userBannerPreset, userHandle || userName);
    return bannerPresetUrl(preset) || "/profile_banner_presets/Ensemble%20Blue.png";
  }, [userBannerPreset, userHandle, userName]);

  // Team banner URL resolution
  const teamBannerUrl = useMemo(() => {
    if (!actingTeamId) return null;
    if (teamInfo?.avatar_path || (teamInfo as any)?.avatar_url) {
      return getImageUrl(teamInfo.avatar_path || (teamInfo as any).avatar_url);
    }
    if (teamInfo?.banner_url || teamInfo?.banner_path) {
      return getImageUrl(teamInfo.banner_url || teamInfo.banner_path);
    }
    if (teamInfo?.banner_preset) {
      return bannerPresetUrl(teamInfo.banner_preset) || "/profile_banner_presets/Ensemble%20Purple.png";
    }
    const defaultTeamPreset = resolveBannerPreset(null, teamHandle || teamName || "team");
    return bannerPresetUrl(defaultTeamPreset) || "/profile_banner_presets/Ensemble%20Purple.png";
  }, [actingTeamId, teamInfo, teamHandle, teamName]);

  // Job benchmark budget parsing
  const rawMin = parseInt(job?.minBudget ? String(job.minBudget) : "0", 10) || 0;
  const rawMax = parseInt(job?.maxBudget ? String(job.maxBudget) : "0", 10) || 0;
  const isOpenBid = rawMax === 0 || job?.budgetType === "open" || !job?.maxBudget;

  // Clean, single-line sanitized job description for the preview snippet
  const cleanJobDescription = useMemo(() => {
    if (!job?.description) return "No project description provided.";
    return job.description
      .replace(/[#*_`~\[\]]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }, [job?.description]);

  return (
    <div className="space-y-6 text-left font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header with Master Collapse / Expand Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Review Proposal Application</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Review your proposal terms, identity, milestones, and confirm escrow filing before submitting.
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
          SECTION 1: DIVIDED BY 2 (LEFT: PROPOSING IDENTITY CARD | RIGHT: TARGET JOB & PROPOSED BID)
          Permanently visible anchor section
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Gray Section Header (Permanent - No Collapse Button) */}
        <div className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 text-left select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Proposal Representation & Target Listing
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {actingTeamId ? "Team / Studio" : "Solo Freelancer"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-2 py-1 transition cursor-pointer"
            >
              <span>Edit</span>
            </button>
          </div>
        </div>

        {/* Section 1 Content - Always Visible */}
        <div className="border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* LEFT: I am posting as who (Same card on Job & Identity with banner) */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between overflow-hidden shadow-2xs text-left">
                  {/* Banner Strip */}
                  <div className="relative h-24 sm:h-28 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {actingTeamId ? (
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
                    {/* Representation badge top right */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-900/80 dark:bg-black/70 text-white backdrop-blur-xs border border-white/10 shadow-xs">
                        {actingTeamId ? "Team Proposing" : "Solo Proposing"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content with Overlapping Avatar */}
                  <div className="p-5 pt-0 space-y-3.5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Overlapping Avatar */}
                      <div className="relative z-10 -mt-7 mb-2.5 flex items-end justify-between">
                        <div className="h-14 w-14 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-4 ring-white dark:ring-zinc-900 shadow-sm shrink-0">
                          {profileAvatar ? (
                            <img
                              src={profileAvatar}
                              alt={userName}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = getFallbackAvatarUrl(userName);
                              }}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center font-bold text-zinc-500">
                              {userName[0]}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Name & Handle */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                            {actingTeamId ? teamName : userName}
                          </h3>
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 shrink-0">
                            {actingTeamId ? "Team" : "Solo"}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 block truncate">
                          @{displayHandle}
                        </span>
                      </div>

                      {/* Bio / Description */}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                        {actingTeamId
                          ? teamInfo?.description || teamInfo?.bio || "Representing registered creative team on this project workspace."
                          : (user as any)?.bio || "Proposing under your individual profile, verified track record, and creative portfolio."}
                      </p>

                      {/* Included Team Members Roster */}
                      {actingTeamId && includedTeamRoster.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              Included Team Members ({includedTeamRoster.length}/{teamMembers.length || includedTeamRoster.length} Total)
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                              Proposed by <strong className="text-zinc-800 dark:text-zinc-200">{userName}</strong>
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {includedTeamRoster.map((m: any, idx: number) => {
                              const isOwnerLeader = m.role === "Owner";
                              const isProposer = String(m.account_id) === currentUserAccountId;
                              const mName = m.display_name || m.name || m.username || "Member";
                              const mAvatar = constructAvatarUrl(
                                m.avatar_path || m.avatar_url || m.avatar,
                                mName
                              );
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
                                      {/* Tooltip: light mode shows white bg tooltip, dark mode dark */}
                                      <div
                                        role="tooltip"
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover/leader:opacity-100 transition-opacity duration-150 z-50 bg-white text-zinc-900 border border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700"
                                      >
                                        Team Leader
                                        {/* Arrow pointing down */}
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
                        {actingTeamId ? "Shared Team Project" : "Solo Freelancer Workspace"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Target Job Post, Description, Budget Benchmark, Proposed Bid & Work Rate */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 flex flex-col justify-between space-y-4 shadow-2xs text-left">
                  <div className="space-y-3">
                    {/* Target Job Title & Client */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                        Target Job Posting
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mt-0.5 line-clamp-1">
                        {job?.title || "Job Listing"}
                      </h3>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        Posted by <strong className="text-zinc-700 dark:text-zinc-300">{job?.postedBy || "Client"}</strong> • Timeline: <strong className="text-zinc-700 dark:text-zinc-300">{job?.timeline || "Standard Duration"}</strong>
                      </p>
                    </div>

                    {/* Job Description Snippet */}
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                        {cleanJobDescription}
                      </p>
                    </div>

                    {/* Benchmark Budget vs Proposed Bid Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {/* Client Benchmark Budget */}
                      <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 block">
                          Client Budget
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                          {isOpenBid
                            ? `From ${rawMin > 0 ? rawMin.toLocaleString() : "100"} Cr (Open Bid)`
                            : `${rawMin.toLocaleString()} ~ ${rawMax.toLocaleString()} Cr`}
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
                          Net: {netTotalEarnings.toLocaleString()} Cr (-10% fee)
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
                        +{additionalWorkRate}% per additional pass
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
        {/* Gray Section Header (No Icon) */}
        <div
          onClick={() => setIsSection2Collapsed(!isSection2Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Cover Letter Pitch & Screening Questions
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {screeningAnswers.length > 0 ? `${screeningAnswers.length} Q&A` : "Direct Pitch"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(2);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold px-2 py-1 transition"
            >
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
              {/* Cover Letter Pitch Box */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Cover Letter Pitch
                </span>
                <div className="p-4 sm:p-5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {coverLetter || "No cover letter provided."}
                </div>
              </div>

              {/* Client Screening Q&A */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">
                  Answers to Client's Screening Questions
                </span>
                {screeningAnswers && screeningAnswers.length > 0 ? (
                  <div className="space-y-3">
                    {screeningAnswers.map((item, idx) => (
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
                    No screening questions were required for this job posting.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 3: DIVIDED BY 2 (LEFT: TERMS OF SERVICE | RIGHT: CLIENT JOB SPECS)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Gray Section Header (No Icon) */}
        <div
          onClick={() => setIsSection3Collapsed(!isSection3Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Terms of Service & Client Specifications
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              Standard Service Agreement
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(3);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold px-2 py-1 transition"
            >
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
              className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* LEFT: My Terms of Service */}
                <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex flex-col justify-between space-y-3 shadow-2xs text-left">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                        My Terms of Service
                      </span>
                      <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        Contractual Agreement
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 max-h-56 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                      {tosContent || "Standard platform delivery and revision terms apply."}
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Preset: Standard Agreement</span>
                    <span>Includes {additionalWorkRate}% Revision Clause</span>
                  </div>
                </div>

                {/* RIGHT: Client's Job Specifications */}
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

                    {/* Skills required */}
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                        Required Skills & Expertise
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {job?.skills && job.skills.length > 0 ? (
                          job.skills.map((skill, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                            >
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">General video production skills</span>
                        )}
                      </div>
                    </div>

                    {/* Timeline & Experience specs */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] uppercase text-zinc-400 block font-semibold">Experience Level</span>
                        <span className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 block">
                          {job?.experienceLevel || "Intermediate"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[10px] uppercase text-zinc-400 block font-semibold">Target Timeline</span>
                        <span className="font-bold text-zinc-900 dark:text-white text-xs mt-0.5 block">
                          {job?.timeline || "Standard"}
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
          SECTION 4: WORK SAMPLES
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Gray Section Header (No Icon) */}
        <div
          onClick={() => setIsSection4Collapsed(!isSection4Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Attached Work Samples
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {workSampleFiles.length} File{workSampleFiles.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(3);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold px-2 py-1 transition"
            >
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
              {workSampleFiles && workSampleFiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {workSampleFiles.map((file, idx) => {
                    const url = previewUrls.get(file);
                    const fType = getReviewFileType(file);
                    const ext = file.name.split(".").pop()?.toLowerCase() || "";
                    const size = formatReviewFileSize(file.size);

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 flex items-center gap-3 shadow-2xs text-left"
                      >
                        {fType === "image" && (
                          <div
                            onClick={() => url && setPreviewModalItem({ file, url, type: "image", name: file.name, size })}
                            className="h-11 w-11 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 cursor-pointer relative group border border-zinc-200 dark:border-zinc-700"
                          >
                            {url ? (
                              <img src={url} alt={file.name} className="h-full w-full object-cover" />
                            ) : (
                              <ImageIcon className="h-4 w-4 m-auto text-zinc-400" />
                            )}
                          </div>
                        )}

                        {fType === "video" && (
                          <div
                            onClick={() => url && setPreviewModalItem({ file, url, type: "video", name: file.name, size })}
                            className="h-11 w-11 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 cursor-pointer text-white"
                          >
                            <Play className="h-3.5 w-3.5 fill-white" />
                          </div>
                        )}

                        {fType === "audio" && (
                          <div
                            onClick={() => url && setPreviewModalItem({ file, url, type: "audio", name: file.name, size })}
                            className="h-11 w-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <Volume2 className="h-4 w-4" />
                          </div>
                        )}

                        {fType === "pdf" && (
                          <div
                            onClick={() => url && setPreviewModalItem({ file, url, type: "pdf", name: file.name, size })}
                            className="h-11 w-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0 cursor-pointer"
                          >
                            <FileText className="h-4 w-4" />
                          </div>
                        )}

                        {fType === "other" && (
                          <div className="h-11 w-11 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                            <Paperclip className="h-4 w-4" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate" title={file.name}>
                            {file.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9.5px] text-zinc-400 mt-0.5 font-medium">
                            <span className="uppercase">{ext}</span>
                            <span>•</span>
                            <span>{size}</span>
                          </div>
                        </div>

                        {url && (
                          <button
                            type="button"
                            onClick={() => setPreviewModalItem({ file, url, type: fType, name: file.name, size })}
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
                  No work sample files attached.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SECTION 5: MILESTONES (DISPLAYED EXACTLY LIKE IMAGE 1)
         ========================================================================= */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden shadow-2xs">
        {/* Gray Section Header (No Icon) */}
        <div
          onClick={() => setIsSection5Collapsed(!isSection5Collapsed)}
          className="w-full flex items-center justify-between p-4 sm:p-4.5 bg-zinc-50/80 dark:bg-zinc-800/40 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer text-left select-none"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Milestone Roadmap & Production Schedule ({milestones.length} Phases)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-200/80 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300">
              {totalHours} hrs Total • 100% Balanced
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditStep(4);
              }}
              className="hidden sm:inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold px-2 py-1 transition"
            >
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
              className="overflow-hidden border-t border-zinc-200 dark:border-zinc-800/80 p-5 sm:p-6 space-y-4"
            >
              {/* Stack of Milestone Cards formatted like Image 1 */}
              <div className="space-y-3.5">
                {milestones.map((m, idx) => {
                  const pct = Number(m.percentage) || Math.round(100 / count);
                  const milestonePayout = Math.floor(totalBid * (pct / 100));
                  const taskList = Array.isArray(m.tasks) ? m.tasks.filter(Boolean) : [];
                  const theme = getPhaseTheme(idx);
                  const isTasksExpanded = Boolean(expandedMilestoneTasks[idx]);

                  return (
                    <div
                      key={m.id || idx}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-5 shadow-2xs space-y-3 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700 text-left"
                    >
                      {/* Top Header Row of Milestone Card (Matching Image 1) */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Circular phase number badge: (1), (2), (3), (4) */}
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${theme.circleBg}`}
                          >
                            {idx + 1}
                          </div>

                          {/* Phase Title */}
                          <h4 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white truncate">
                            {m.name || `Phase ${idx + 1}`}
                          </h4>
                        </div>

                        {/* Right side: Credits Badge & Chevron */}
                        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
                          {/* Credits Pill (matching Image 1) */}
                          <div className="px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 shadow-2xs">
                            <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                            <span>{milestonePayout.toLocaleString()} Credits</span>
                          </div>

                          {/* Toggle Task Checklist Dropdown */}
                          <button
                            type="button"
                            onClick={() => toggleMilestoneTasks(idx)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            title={isTasksExpanded ? "Collapse tasks" : "Expand tasks"}
                          >
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isTasksExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Secondary Tags Row (Matching Image 1: Duration, Budget Share, Revisions) */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-zinc-600 dark:text-zinc-300">
                        {/* Duration tag */}
                        <div className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 flex items-center gap-1.5 font-medium">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          <span>
                            Duration: {m.hours} hrs ({Math.max(1, (m.hours / 24).toFixed(1))}d)
                          </span>
                        </div>

                        {/* % Budget Share tag */}
                        <div className="px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/70 flex items-center gap-1.5 font-medium">
                          <Percent className="h-3 w-3 text-zinc-400" />
                          <span>% Budget Share: {pct}%</span>
                        </div>

                        {/* Revisions Included tag */}
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
                            className="overflow-hidden pt-2 border-t border-zinc-100 dark:border-zinc-800/80"
                          >
                            {m.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 leading-relaxed">
                                {m.description}
                              </p>
                            )}
                            {taskList.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {taskList.map((task, tIdx) => (
                                  <div
                                    key={tIdx}
                                    className="p-2 rounded-lg bg-zinc-50/60 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                                    <span className="truncate">{task}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400 italic">No task items listed for this phase.</span>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Milestones Summary Footer Bar */}
              <div className="p-4 rounded-xl bg-zinc-50/90 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    Total {milestones.length} Production Phases
                  </span>
                  <span className="text-zinc-400 mx-2">•</span>
                  <span className="text-zinc-500 dark:text-zinc-400">{totalHours} Total Hours (100% Phased)</span>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto font-bold text-zinc-900 dark:text-white">
                  <span>Gross: {totalBid.toLocaleString()} Credits</span>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <span className="text-emerald-600 dark:text-emerald-400">Net Take-Home: {netTotalEarnings.toLocaleString()} Credits</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Footer */}
      <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Milestones</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCheckoutModalOpen(true)}
          className="flex items-center gap-2 px-7 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer"
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
                    Checkout Proposal
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    Confirm filing fee deduction to submit proposal
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
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold shrink-0">Target Listing:</span>
                    <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[260px] text-right">
                      {job?.title || "Target Job Listing"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold shrink-0">Proposing Identity:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 text-right">
                      {actingTeamId ? `${teamName} (Team)` : `${userName} (Solo)`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700/80">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Proposed Bid:</span>
                    <span className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>{totalBid.toLocaleString()} Credits</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-300 font-semibold">Net Take-Home (90%):</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {netTotalEarnings.toLocaleString()} Credits
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
                    <span>Proposal Filing Fee</span>
                    <span className="font-bold text-red-500 dark:text-red-400">-10 Credits</span>
                  </div>

                  <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-bold text-zinc-900 dark:text-white">
                    <span>Balance After Submission</span>
                    <span className="flex items-center gap-1.5">
                      <CreditIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>
                        {walletBalance !== null ? `${(walletBalance - 10).toLocaleString()} Credits` : "—"}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Insufficient Balance Alert */}
                {walletBalance !== null && walletBalance < 10 && (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span className="font-medium">Insufficient balance (requires 10 Credits)</span>
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
                      I agree to deduct <span className="font-bold text-zinc-950 dark:text-white">10 Credits</span> from my wallet to formally submit this proposal to the client.
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
                  label="Swipe to Pay 10 Credits"
                  doneLabel="Paid 10 Credits"
                  errorLabel="Submission Failed"
                  onConfirm={async () => {
                    await onSubmit();
                    setIsCheckoutModalOpen(false);
                  }}
                  disabled={isSubmitting || !agreedToFee || (walletBalance !== null && walletBalance < 10)}
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
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6"
            onClick={() => setPreviewModalItem(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 pr-4">
                  {previewModalItem.type === "image" && <ImageIcon className="h-4 w-4 text-blue-400" />}
                  {previewModalItem.type === "video" && <Video className="h-4 w-4 text-purple-400" />}
                  {previewModalItem.type === "audio" && <Volume2 className="h-4 w-4 text-emerald-400" />}
                  {previewModalItem.type === "pdf" && <FileText className="h-4 w-4 text-rose-400" />}
                  <span className="text-xs font-bold text-white truncate" title={previewModalItem.name}>
                    {previewModalItem.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                    ({previewModalItem.size})
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={previewModalItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                    title="Open in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewModalItem(null)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body Canvas */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[300px]">
                {previewModalItem.type === "image" && (
                  <img
                    src={previewModalItem.url}
                    alt={previewModalItem.name}
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                  />
                )}

                {previewModalItem.type === "video" && (
                  <video
                    src={previewModalItem.url}
                    controls
                    autoPlay
                    className="max-h-[75vh] w-full max-w-3xl rounded-lg shadow-lg bg-black"
                  />
                )}

                {previewModalItem.type === "audio" && (
                  <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex flex-col items-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Volume2 className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white truncate max-w-xs">{previewModalItem.name}</h4>
                      <p className="text-xs text-zinc-400">{previewModalItem.size}</p>
                    </div>
                    <audio src={previewModalItem.url} controls className="w-full mt-2" autoPlay />
                  </div>
                )}

                {previewModalItem.type === "pdf" && (
                  <iframe
                    src={previewModalItem.url}
                    title={previewModalItem.name}
                    className="w-full h-[70vh] rounded-lg border border-zinc-800 bg-white"
                  />
                )}

                {previewModalItem.type === "other" && (
                  <div className="text-center p-8 space-y-3">
                    <Paperclip className="h-12 w-12 text-zinc-500 mx-auto" />
                    <p className="text-xs text-zinc-300">File preview not directly supported in browser.</p>
                    <a
                      href={previewModalItem.url}
                      download={previewModalItem.name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                    >
                      Download File
                    </a>
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

export default ProposalReviewStep;
