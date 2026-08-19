import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Briefcase, FileText, TrendingUp, Image as ImageIcon, Clock } from "lucide-react";

// Sub-component Imports
import { Profile_Portfolio } from "./Profile_Portfolio";
import { Profile_Services } from "./Profile_Services";
import { Profile_JobPosts } from "./Profile_JobPosts";
import { Profile_Projects } from "./Profile_Projects";
import { Profile_Assets } from "./Profile_Assets";
import { Profile_History } from "./Profile_History";
import { Profile_Introduction } from "./Profile_Introduction";
import { Profile_Gallery } from "./Profile_Gallery";
import { MeritSection_ProfileDisplay } from "../MeritSection_ProfileDisplay";
import { User, Activity, Image as ImageIcon2 } from "lucide-react";

export type TabType = "introduction" | "portfolio" | "gallery" | "services" | "job-posts" | "assets" | "performance";

interface DetailsListBodyProps {
  loading?: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  portfolioItems?: any[];
  services?: any[];
  isOwner?: boolean;
  onUploadPDF?: (file: File) => Promise<void>;
  onAddExternalLink?: (data: { name: string; url: string; description: string }) => Promise<void>;
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

export const DetailsListBodySkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/5 pb-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-dark-elevated rounded-xl" />)}
    </div>
    <div className="border border-gray-200 dark:border-white/10 bg-white/40 dark:bg-dark-base/40 rounded-2xl h-[500px] w-full" />
  </div>
);

export const MainBody: React.FC<DetailsListBodyProps> = ({
  loading,
  activeTab,
  onTabChange,
  portfolioItems = [],
  services = [],
  isOwner = false,
  onUploadPDF,
  onAddExternalLink,
  onDeletePortfolioItem,
  userDetails,
  onUpdateIntroduction,
  accountId,
}) => {
  const [performanceTab, setPerformanceTab] = useState<"merit" | "ratings" | "history">("merit");

  if (loading) return <DetailsListBodySkeleton />;

  return (
    <div className="space-y-5 font-['Plus Jakarta Sans',sans-serif]">

      {/* ==================== SMOOTH NAVIGATION BAR ==================== */}
      <div className="flex flex-wrap gap-1 bg-gray-100/50 dark:bg-dark-base/40 border border-gray-200 dark:border-white/5 p-1 rounded-2xl w-fit">
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
              {/* Sliding Background Pill */}
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
      <div className="bg-white/80 dark:bg-dark-base/60 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl min-h-[500px] flex flex-col relative overflow-hidden">
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
              <Profile_Introduction
                introduction={userDetails?.introduction}
                isOwner={isOwner}
                onSave={onUpdateIntroduction}
                accountId={accountId || ""}
                onViewMoreGallery={() => onTabChange("gallery")}
              />
            )}
            {activeTab === "performance" && (
              <div className="flex flex-col h-full space-y-4">
                {/* Subtabs for Performance */}
                <div className="flex border-b border-gray-200 dark:border-white/10">
                  <button
                    onClick={() => setPerformanceTab("merit")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${performanceTab === "merit" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                  >
                    Merit Score
                  </button>
                  <button
                    onClick={() => setPerformanceTab("ratings")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${performanceTab === "ratings" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                  >
                    Ratings
                  </button>
                  <button
                    onClick={() => setPerformanceTab("history")}
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${performanceTab === "history" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                  >
                    History
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
                  {performanceTab === "merit" && (
                    <div className="pt-2">
                      <MeritSection_ProfileDisplay
                        loading={loading}
                        meritScore={userDetails?.merit_score}
                        avgRating={4.8}
                        totalReviews={portfolioItems.length}
                        clientRating={4.9}
                        freelancerRating={4.8}
                        assetRating={4.7}
                        successfulJobsCount={6}
                        viewMode="merit"
                      />
                    </div>
                  )}
                  {performanceTab === "ratings" && (
                    <div className="pt-2">
                      <MeritSection_ProfileDisplay
                        loading={loading}
                        meritScore={userDetails?.merit_score}
                        avgRating={4.8}
                        totalReviews={portfolioItems.length}
                        clientRating={4.9}
                        freelancerRating={4.8}
                        assetRating={4.7}
                        successfulJobsCount={6}
                        viewMode="ratings"
                      />
                    </div>
                  )}
                  {performanceTab === "history" && (
                    <div className="pt-2">
                      <Profile_History />
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === "portfolio" && (
              <Profile_Portfolio
                portfolioItems={portfolioItems}
                isOwner={isOwner}
                onUploadPDF={onUploadPDF}
                onAddExternalLink={onAddExternalLink}
                onDeleteItem={onDeletePortfolioItem}
              />
            )}
            {activeTab === "gallery" && (
              <Profile_Gallery accountId={accountId || ""} isOwner={isOwner} />
            )}
            {activeTab === "services" && (
              <Profile_Services accountId={accountId} isOwner={isOwner} />
            )}
            {activeTab === "job-posts" && (
              <Profile_JobPosts userDetails={userDetails} accountId={accountId} />
            )}
            {activeTab === "assets" && <Profile_Assets />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};