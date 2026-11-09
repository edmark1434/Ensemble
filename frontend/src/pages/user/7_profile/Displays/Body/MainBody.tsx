import React, { useState } from "react";
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
import { RoleChip, StatusPill } from "@/pages/user/disputes/disputeUi";

export type TabType = "introduction" | "portfolio" | "gallery" | "services" | "job-posts" | "assets" | "performance";
type PerformanceSubTab = "ratings" | "reviews" | "history" | "records" | "dispute-history";

interface DetailsListBodyProps {
  loading?: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  portfolioItems?: any[];
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

const tabOptions: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "introduction", label: "Introduction", icon: <User className="h-3.5 w-3.5" /> },
  { key: "portfolio", label: "Portfolio", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  { key: "gallery", label: "Gallery", icon: <ImageIcon2 className="h-3.5 w-3.5" /> },
  { key: "services", label: "Services", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "job-posts", label: "Job Posts", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "assets", label: "Assets", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { key: "performance", label: "Performance", icon: <Activity className="h-3.5 w-3.5" /> },
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

export const DetailsListBodySkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/5 pb-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-dark-elevated rounded-xl" />
      ))}
    </div>
    <div className="border border-gray-200 dark:border-white/10 bg-white/40 dark:bg-dark-base/40 rounded-2xl h-[720px] w-full" />
  </div>
);

export const MainBody: React.FC<DetailsListBodyProps> = ({
  loading,
  activeTab,
  onTabChange,
  portfolioItems = [],
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

  if (loading) return <DetailsListBodySkeleton />;

  const publicDisputes: PublicProfileDispute[] = Array.isArray(userDetails?.disputes)
    ? userDetails.disputes
    : [];

  return (
    <div className="space-y-5 font-['Plus Jakarta Sans',sans-serif]">
      {/* ==================== SMOOTH NAVIGATION BAR ==================== */}
      <div
        data-tour="profile-tabs"
        className="flex flex-wrap gap-1 bg-gray-100/50 dark:bg-dark-base/40 border border-gray-200 dark:border-white/5 p-1 rounded-2xl w-fit"
      >
        {tabOptions.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-colors duration-200 select-none cursor-pointer ${
                isActive ? "text-white" : "text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-blue-600 rounded-xl shadow-md shadow-blue-600/10 border border-blue-500/20 z-0"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                <span>{tab.label}</span>
              </span>
            </button>
          );
        })}
      </div>

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
                  <button
                    onClick={() => setPerformanceTab("dispute-history")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 cursor-pointer ${
                      performanceTab === "dispute-history"
                        ? "border-blue-600 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    }`}
                  >
                    Dispute History
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
                                !userDetails?.standing?.forumTimeout &&
                                !userDetails?.standing?.underDispute && (
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

                  {performanceTab === "dispute-history" && (
                    <div className="pt-2">
                      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-dark-surface p-5 shadow-xs space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-white/10 pb-3">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4 text-gray-500 dark:text-zinc-400" />
                              Dispute History
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                              {isOwner
                                ? "Your public and contract dispute records on the platform."
                                : "Public dispute cases associated with this account."}
                            </p>
                          </div>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => navigate("/contracts/disputes")}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-zinc-200 transition cursor-pointer"
                            >
                              <span>Open Dispute Center</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {publicDisputes.length === 0 ? (
                          <div className="py-10 text-center space-y-1.5">
                            <ShieldCheck className="h-8 w-8 text-emerald-500/80 mx-auto" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              No Disputes on Record
                            </p>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">
                              There are no public dispute cases linked to this profile.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5">
                            {publicDisputes.map((dispute) => (
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
                                  <span className="font-semibold text-gray-800 dark:text-zinc-200">
                                    View discussion →
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
