import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import api from "@/lib/axios";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderOpen,
  Briefcase,
  FileText,
  Image as ImageIcon,
  User,
  Activity,
  Image as ImageIcon2,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

// Sub-component Imports
import { Profile_Portfolio } from "./Profile_Portfolio";
import { Profile_Services } from "./Profile_Services";
import { Profile_JobPosts } from "./Profile_JobPosts";
import { Profile_Assets } from "./Profile_Assets";
import { Profile_History } from "./Profile_History";
import { Profile_Reviews, type ReviewFilter } from "./Profile_Reviews";
import { Profile_Introduction } from "./Profile_Introduction";
import { Profile_Gallery } from "./Profile_Gallery";
import { RatingsSection_ProfileDisplay, type PublicProfileDispute } from "../RatingsSection_ProfileDisplay";
import { AccountRecordSection, StandingBadges } from "../AccountStanding";
import { isClosedStatus, RoleChip, StatusPill } from "@/pages/user/disputes/disputeUi";

export type TabType =
  | "introduction"
  | "portfolio"
  | "gallery"
  | "services"
  | "job-posts"
  | "assets"
  | "performance"
  | "disputes";

type PerformanceSubTab = "ratings" | "reviews" | "history" | "records";

/** Legacy profile tab query values map onto the merged Disputes tab. */
export function normalizeProfileTab(tab: string | null | undefined): TabType {
  if (tab === "active-history" || tab === "dispute-history" || tab === "disputes") {
    return "disputes";
  }
  const known: TabType[] = [
    "introduction",
    "portfolio",
    "gallery",
    "services",
    "job-posts",
    "assets",
    "performance",
    "disputes",
  ];
  return known.includes(tab as TabType) ? (tab as TabType) : "introduction";
}

export const parseProfileTab = normalizeProfileTab;

interface DetailsListBodyProps {
  loading?: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  portfolioItems?: any[];
  galleryCount?: number;
  services?: any[];
  isOwner?: boolean;
  onUploadPDF?: (file: File) => Promise<void>;
  onAddExternalLink?: (data: { name: string; url: string; description: string }) => Promise<void>;
  onAddProject?: (data: {
    projectId: string;
    name: string;
    description: string;
    clipStartSeconds: number;
    clipEndSeconds: number;
  }) => Promise<void>;
  onDeletePortfolioItem?: (id: string) => Promise<void>;
  userDetails?: any;
  onUpdateIntroduction?: (intro: string) => Promise<void>;
  accountId?: string;
}

interface TabConfig {
  key: TabType;
  label: string;
  icon: React.ReactNode;
}

// Row 1: Introduction | Portfolio | Gallery | Disputes
const ROW_1_TABS: TabConfig[] = [
  { key: "introduction", label: "Introduction", icon: <User className="h-4 w-4" /> },
  { key: "portfolio", label: "Portfolio", icon: <FolderOpen className="h-4 w-4" /> },
  { key: "gallery", label: "Gallery", icon: <ImageIcon2 className="h-4 w-4" /> },
  { key: "disputes", label: "Disputes", icon: <ShieldAlert className="h-4 w-4" /> },
];

// Row 2: Assets | Services | Job Posts | Performance
const ROW_2_TABS: TabConfig[] = [
  { key: "assets", label: "Assets", icon: <ImageIcon className="h-4 w-4" /> },
  { key: "services", label: "Services", icon: <Briefcase className="h-4 w-4" /> },
  { key: "job-posts", label: "Job Posts", icon: <FileText className="h-4 w-4" /> },
  { key: "performance", label: "Performance", icon: <Activity className="h-4 w-4" /> },
];

function disputeStatusLabel(status?: string) {
  return String(status || "open")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function disputeWhen(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function ProfileDisputeList({
  title,
  disputes,
  isOwner,
  emptyTitle,
  emptyDetail,
  description,
  onOpenCenter,
}: {
  title: string;
  disputes: PublicProfileDispute[];
  isOwner: boolean;
  emptyTitle: string;
  emptyDetail: string;
  description: string;
  onOpenCenter: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">{description}</p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={onOpenCenter}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-white/5 transition"
          >
            <span>Open Resolution Center</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!disputes.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-white/10 p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-gray-300 dark:text-zinc-600 mb-2" />
          <p className="text-sm font-semibold text-gray-700 dark:text-zinc-300">{emptyTitle}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">{emptyDetail}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {disputes.map((dispute) => (
            <Link
              key={dispute.id}
              to={`/disputes/${dispute.id}`}
              className="block rounded-xl border border-gray-200 px-4 py-3 transition hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {dispute.title || dispute.number || "Dispute"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                    {dispute.number || "Dispute"} · {disputeStatusLabel(dispute.type || "General")}
                  </p>
                </div>
                <StatusPill status={dispute.status} />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-zinc-400">
                <span className="flex items-center gap-2">
                  <RoleChip role={dispute.role === "filed" ? "disputer" : "disputee"} />
                  Updated {disputeWhen(dispute.updatedAt)}
                </span>
                <span className="font-semibold text-gray-800 dark:text-zinc-200">View discussion →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export const DetailsListBodySkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="bg-gray-100/70 dark:bg-dark-base/60 border border-gray-200/80 dark:border-white/10 p-2 rounded-2xl w-full flex flex-col gap-2">
      <div className="h-8 w-full bg-gray-200 dark:bg-dark-elevated rounded-xl" />
      <div className="h-8 w-full bg-gray-200 dark:bg-dark-elevated rounded-xl" />
    </div>
    <div className="border border-gray-200 dark:border-white/10 bg-white/40 dark:bg-dark-base/40 rounded-2xl h-[720px] w-full" />
  </div>
);

export const MainBody: React.FC<DetailsListBodyProps> = ({
  loading,
  activeTab,
  onTabChange,
  portfolioItems = [],
  galleryCount,
  services = [],
  isOwner = false,
  onUploadPDF,
  onAddExternalLink,
  onAddProject,
  onDeletePortfolioItem,
  userDetails,
  onUpdateIntroduction,
  accountId,
}) => {
  const navigate = useNavigate();
  const [performanceTab, setPerformanceTab] = useState<PerformanceSubTab>("ratings");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("All");

  // Container ref and narrow mode state for responsive icon-only collapse (< 640px)
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<{
    label: string;
    count?: number;
    rect: DOMRect;
  } | null>(null);

  // ResizeObserver to detect narrow navigation container (< 640px)
  useEffect(() => {
    const el = navContainerRef.current;
    if (!el) return;

    const checkWidth = () => {
      setIsNarrow(el.clientWidth < 640);
    };

    checkWidth();
    const ro = new ResizeObserver(() => checkWidth());
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  // Dismiss tooltip on window scroll or resize
  useEffect(() => {
    if (!hoveredTab) return;
    const handleClear = () => setHoveredTab(null);
    window.addEventListener("scroll", handleClear, { passive: true });
    window.addEventListener("resize", handleClear);
    return () => {
      window.removeEventListener("scroll", handleClear);
      window.removeEventListener("resize", handleClear);
    };
  }, [hoveredTab]);

  // Accurate live counters
  const [openServicesCount, setOpenServicesCount] = useState<number | null>(null);
  const [openJobsCount, setOpenJobsCount] = useState<number | null>(null);
  const [assetsCount, setAssetsCount] = useState<number | null>(null);
  const [internalGalleryCount, setInternalGalleryCount] = useState<number | null>(null);

  // Fetch accurate live counts for Open Services, Open Jobs, Uploaded Assets, and Galleries
  useEffect(() => {
    if (!accountId) return;
    let isMounted = true;

    // Gallery count (if not passed as prop)
    if (typeof galleryCount !== "number") {
      api.get(`/api/accounts/${accountId}/galleries`)
        .then((res) => {
          if (isMounted) {
            const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
            setInternalGalleryCount(list.length);
          }
        })
        .catch(() => {});
    }

    // Open Services count (count only Open status for this user)
    api.get("/api/gigs")
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          const openCount = list.filter((g: any) => {
            const creatorId =
              g.freelancerAccountId ??
              g.freelancer_account_id ??
              g.account_id ??
              g.accountId ??
              g.client_account_id ??
              g.user_id ??
              g.userId;
            const isMatch = creatorId && String(creatorId).toLowerCase() === String(accountId).toLowerCase();
            const isOpen = String(g.status || "open").toLowerCase() === "open";
            return isMatch && isOpen;
          }).length;
          setOpenServicesCount(openCount);
        }
      })
      .catch(() => {});

    // Open Job Posts count (count only Open status for this client)
    api.get("/api/jobs")
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data?.jobs) ? res.data.jobs : Array.isArray(res.data) ? res.data : [];
          const openCount = list.filter((j: any) => {
            const clientId = j.client_account_id ?? j.clientAccountId ?? j.account_id ?? j.accountId;
            const isMatch = clientId && String(clientId).toLowerCase() === String(accountId).toLowerCase();
            const isOpen = String(j.status || "open").toLowerCase() === "open";
            return isMatch && isOpen;
          }).length;
          setOpenJobsCount(openCount);
        }
      })
      .catch(() => {});

    // Uploaded Assets count (must use creatorAccountId so platform assets are not counted)
    const assetParams = isOwner
      ? { view: "mine", pageSize: 100 }
      : { creatorAccountId: accountId, pageSize: 100 };
    api.get("/api/assets", { params: assetParams })
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res.data?.assets) ? res.data.assets : Array.isArray(res.data) ? res.data : [];
          setAssetsCount(list.length);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [accountId, galleryCount, isOwner]);

  if (loading) return <DetailsListBodySkeleton />;

  const publicDisputes: PublicProfileDispute[] = Array.isArray(userDetails?.disputes)
    ? userDetails.disputes
    : [];
  const disputesSorted = [...publicDisputes].sort((a, b) => {
    const aClosed = isClosedStatus(a.status) ? 1 : 0;
    const bClosed = isClosedStatus(b.status) ? 1 : 0;
    if (aClosed !== bClosed) return aClosed - bClosed;
    const aTime = new Date(a.updatedAt || 0).getTime();
    const bTime = new Date(b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
  const openDisputeCenter = () => navigate("/contracts/disputes");

  const getTabCount = (key: TabType): number | undefined => {
    switch (key) {
      case "portfolio":
        // Count only Number of Materials on a portfolio
        return Array.isArray(portfolioItems) && portfolioItems.length > 0 ? portfolioItems.length : undefined;
      case "gallery": {
        // Count the number of gallery uploads present
        const count = typeof galleryCount === "number" ? galleryCount : internalGalleryCount;
        return typeof count === "number" && count > 0 ? count : undefined;
      }
      case "services": {
        // Count the number of Open Services
        if (typeof openServicesCount === "number") return openServicesCount > 0 ? openServicesCount : undefined;
        const c = userDetails?.total_services ?? userDetails?.totalServices;
        return typeof c === "number" && c > 0 ? c : undefined;
      }
      case "job-posts": {
        // Count the number of Open Job posts
        if (typeof openJobsCount === "number") return openJobsCount > 0 ? openJobsCount : undefined;
        const c = userDetails?.total_jobs ?? userDetails?.totalJobs;
        return typeof c === "number" && c > 0 ? c : undefined;
      }
      case "assets": {
        // Count the Number of Assets uploaded (never fall back to stale mock/foreign count if fetched)
        if (typeof assetsCount === "number") return assetsCount > 0 ? assetsCount : undefined;
        return undefined;
      }
      case "disputes":
        return Array.isArray(disputesSorted) && disputesSorted.length > 0 ? disputesSorted.length : undefined;
      default:
        return undefined;
    }
  };

  const renderTab = (tab: TabConfig) => {
    const isActive = activeTab === tab.key;
    const count = getTabCount(tab.key);
    return (
      <button
        key={tab.key}
        data-tab-key={tab.key}
        onClick={() => onTabChange(tab.key)}
        onMouseEnter={(e) => {
          if (!isNarrow) return;
          setHoveredTab({
            label: tab.label,
            count,
            rect: e.currentTarget.getBoundingClientRect(),
          });
        }}
        onMouseLeave={() => setHoveredTab(null)}
        className={`group relative flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2 sm:px-3 py-2 text-xs font-bold tracking-wide transition-all duration-200 select-none cursor-pointer min-w-0 ${
          isActive
            ? "text-white"
            : "text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-white/[0.06]"
        }`}
      >
        {isActive && (
          <motion.div
            layoutId="activeTabPill"
            className="absolute inset-0 bg-blue-600 rounded-xl shadow-sm shadow-blue-600/20 z-0"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}

        <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 min-w-0">
          <span className="shrink-0">{tab.icon}</span>
          {!isNarrow && <span className="truncate">{tab.label}</span>}
          {typeof count === "number" && count > 0 && (
            <span
              className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-black shrink-0 transition-colors ${
                isActive
                  ? "bg-white/25 text-white"
                  : "bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-zinc-300 group-hover:bg-gray-300/80 dark:group-hover:bg-white/20"
              }`}
            >
              {count}
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-5 font-['Plus Jakarta Sans',sans-serif] min-w-0">
      {/* ==================== 2-ROW NAVIGATION BAR ==================== */}
      <div
        ref={navContainerRef}
        data-tour="profile-tabs"
        className="flex flex-col gap-1 w-full bg-gray-100/70 dark:bg-dark-base/60 backdrop-blur-sm border border-gray-200/80 dark:border-white/10 p-1.5 rounded-2xl shadow-xs"
      >
        {/* Row 1: Introduction | Portfolio | Gallery | Disputes */}
        <div className="flex items-center w-full gap-0.5 sm:gap-1">
          {renderTab(ROW_1_TABS[0])}
          <div className="h-4 w-px bg-gray-300/80 dark:bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />
          {renderTab(ROW_1_TABS[1])}
          <div className="h-4 w-px bg-gray-300/80 dark:bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />
          {renderTab(ROW_1_TABS[2])}
          <div className="h-4 w-px bg-gray-300/80 dark:bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />
          {renderTab(ROW_1_TABS[3])}
        </div>

        {/* Subtle separator between Row 1 and Row 2 */}
        <div className="h-px w-full bg-gray-200/60 dark:bg-white/[0.08] my-0.5" aria-hidden="true" />

        {/* Row 2: Assets | Services | Job Posts | Performance */}
        <div className="flex items-center w-full gap-0.5 sm:gap-1">
          {renderTab(ROW_2_TABS[0])}
          <div className="h-4 w-px bg-gray-300/80 dark:bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />
          {renderTab(ROW_2_TABS[1])}
          <div className="h-4 w-px bg-gray-300/80 dark:bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />
          {renderTab(ROW_2_TABS[2])}
          <div className="h-4 w-px bg-gray-300/80 dark:bg-white/15 mx-0.5 shrink-0" aria-hidden="true" />
          {renderTab(ROW_2_TABS[3])}
        </div>
      </div>

      {/* Portal Tooltip: Displays only in narrow icon-only mode */}
      {hoveredTab &&
        isNarrow &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              top: hoveredTab.rect.top - 8,
              left: hoveredTab.rect.left + hoveredTab.rect.width / 2,
            }}
            className="fixed -translate-x-1/2 -translate-y-full z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-150 transition-transform"
          >
            <div className="relative px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl border border-gray-200/90 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md text-gray-800 dark:text-zinc-100 flex items-center gap-1.5">
              <span>{hoveredTab.label}</span>
              {typeof hoveredTab.count === "number" && hoveredTab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
                  {hoveredTab.count}
                </span>
              )}
              {/* Downward Caret */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-white/95 dark:border-t-zinc-900/95" />
            </div>
          </div>,
          document.body
        )}

      {/* ==================== CONTENT PANEL LAYER CONTROLLER ==================== */}
      <div className="bg-white/80 dark:bg-dark-base/60 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl min-h-[720px] flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            {activeTab === "introduction" && (
              <div data-tour="profile-introduction" className="flex-1 flex flex-col">
                <Profile_Introduction
                  introduction={userDetails?.introduction}
                  isOwner={isOwner}
                  isLoading={loading}
                  onSave={onUpdateIntroduction}
                  accountId={accountId || ""}
                  onViewMoreGallery={() => onTabChange("gallery")}
                  userName={userDetails?.name || userDetails?.username || ""}
                />
              </div>
            )}

            {activeTab === "performance" && (
              <div className="flex flex-col h-full space-y-4">
                {/* Subtabs for Performance */}
                <div className="flex flex-wrap border-b border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setPerformanceTab("ratings")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                      performanceTab === "ratings"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    Ratings
                  </button>
                  <button
                    onClick={() => setPerformanceTab("reviews")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                      performanceTab === "reviews"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    Reviews
                  </button>
                  <button
                    onClick={() => setPerformanceTab("history")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                      performanceTab === "history"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    History
                  </button>
                  <button
                    onClick={() => setPerformanceTab("records")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                      performanceTab === "records"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    Records
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                  {performanceTab === "ratings" && (
                    <div className="pt-2">
                      <RatingsSection_ProfileDisplay
                        loading={loading}
                        meritScore={
                          Number.isFinite(Number(userDetails?.standing?.merit))
                            ? Number(userDetails.standing.merit)
                            : 100
                        }
                        avgRating={
                          userDetails?.avg_rating ? Number(parseFloat(userDetails.avg_rating).toFixed(1)) : 0.0
                        }
                        totalReviews={userDetails?.total_reviews ? Number(userDetails.total_reviews) : 0}
                        clientRating={
                          userDetails?.client_rating ? Number(parseFloat(userDetails.client_rating).toFixed(1)) : 0.0
                        }
                        freelancerRating={
                          userDetails?.freelancer_rating
                            ? Number(parseFloat(userDetails.freelancer_rating).toFixed(1))
                            : 0.0
                        }
                        assetRating={
                          userDetails?.asset_rating ? Number(parseFloat(userDetails.asset_rating).toFixed(1)) : 0.0
                        }
                        successfulJobsCount={
                          userDetails?.successful_jobs_count ? Number(userDetails.successful_jobs_count) : 0
                        }
                        teamRating={
                          userDetails?.team_rating ? Number(parseFloat(userDetails.team_rating).toFixed(1)) : 0.0
                        }
                        teamReviewCount={userDetails?.team_review_count ? Number(userDetails.team_review_count) : 0}
                        freelancerServiceRating={
                          userDetails?.freelancer_service_rating
                            ? Number(parseFloat(userDetails.freelancer_service_rating).toFixed(1))
                            : 0.0
                        }
                        freelancerServiceCount={
                          userDetails?.freelancer_service_count ? Number(userDetails.freelancer_service_count) : 0
                        }
                        freelancerJobRating={
                          userDetails?.freelancer_job_rating
                            ? Number(parseFloat(userDetails.freelancer_job_rating).toFixed(1))
                            : 0.0
                        }
                        freelancerJobCount={
                          userDetails?.freelancer_job_count ? Number(userDetails.freelancer_job_count) : 0
                        }
                        clientServiceRating={
                          userDetails?.client_service_rating
                            ? Number(parseFloat(userDetails.client_service_rating).toFixed(1))
                            : 0.0
                        }
                        clientServiceCount={
                          userDetails?.client_service_count ? Number(userDetails.client_service_count) : 0
                        }
                        clientJobRating={
                          userDetails?.client_job_rating
                            ? Number(parseFloat(userDetails.client_job_rating).toFixed(1))
                            : 0.0
                        }
                        clientJobCount={userDetails?.client_job_count ? Number(userDetails.client_job_count) : 0}
                        viewMode="ratings"
                        isOwner={isOwner}
                        disputes={publicDisputes}
                        onNavigateToReviews={(filter) => {
                          setReviewFilter(filter);
                          setPerformanceTab("reviews");
                        }}
                      />
                    </div>
                  )}

                  {performanceTab === "reviews" && (
                    <div className="pt-2">
                      <Profile_Reviews isOwner={isOwner} accountId={accountId} initialFilter={reviewFilter} />
                    </div>
                  )}

                  {performanceTab === "history" && (
                    <div className="pt-2">
                      <Profile_History isOwner={isOwner} accountId={accountId} />
                    </div>
                  )}

                  {performanceTab === "records" && (
                    <div className="pt-2">
                      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs">
                        {isOwner ? (
                          <AccountRecordSection />
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                Account Standing & Record
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                                Public account standing and active platform notices.
                              </p>
                            </div>
                            <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                              <StandingBadges standing={userDetails?.standing} />
                              {(!userDetails?.standing?.status ||
                                String(userDetails.standing.status).toLowerCase() === "active") &&
                                !userDetails?.standing?.forumTimeout && (
                                  <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-zinc-300">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <span>Active standing. No public restrictions, suspensions, or bans on record.</span>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "disputes" && (
              <ProfileDisputeList
                title="Disputes"
                disputes={disputesSorted}
                isOwner={isOwner}
                description={
                  isOwner
                    ? "Public dispute cases linked to your profile (open and closed)."
                    : "Public dispute cases linked to this profile (open and closed)."
                }
                emptyTitle="No public disputes"
                emptyDetail="There are no public dispute cases on this profile."
                onOpenCenter={openDisputeCenter}
              />
            )}

            {activeTab === "portfolio" && (
              <div data-tour="profile-portfolio" className="flex-1 flex flex-col">
                <Profile_Portfolio
                  portfolioItems={portfolioItems}
                  isOwner={isOwner}
                  isLoading={loading}
                  onUploadPDF={onUploadPDF}
                  onAddExternalLink={onAddExternalLink}
                  onAddProject={onAddProject}
                  onDeleteItem={onDeletePortfolioItem}
                />
              </div>
            )}

            {activeTab === "gallery" && (
              <Profile_Gallery accountId={accountId || ""} isOwner={isOwner} />
            )}

            {activeTab === "services" && (
              <Profile_Services accountId={accountId} isOwner={isOwner} />
            )}

            {activeTab === "job-posts" && (
              <Profile_JobPosts userDetails={userDetails} accountId={accountId} isOwner={isOwner} />
            )}

            {activeTab === "assets" && (
              <Profile_Assets accountId={accountId} isOwner={isOwner} isLoading={loading} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
