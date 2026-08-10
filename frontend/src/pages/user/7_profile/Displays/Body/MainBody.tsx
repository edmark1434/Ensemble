import React from "react";
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
import { MeritSection_ProfileDisplay } from "../MeritSection_ProfileDisplay";
import { User, Activity } from "lucide-react";

export type TabType = "introduction" | "performance" | "portfolio" | "services" | "job-posts" | "assets";

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
}

const tabOptions: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "introduction", label: "Introduction", icon: <User className="h-3.5 w-3.5" /> },
  { key: "performance", label: "Performance", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "portfolio", label: "Portfolio", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  { key: "services", label: "Services", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "job-posts", label: "Job Posts", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "assets", label: "Assets", icon: <ImageIcon className="h-3.5 w-3.5" /> },
];

export const DetailsListBodySkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-white/5 pb-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded-xl" />)}
    </div>
    <div className="border border-gray-200 dark:border-white/10 bg-white/40 dark:bg-[#0b0e17]/40 rounded-2xl h-[500px] w-full" />
  </div>
);

// FIXED: Renamed export from DetailsListBody_ProfileDisplay to MainBody
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
}) => {
  if (loading) return <DetailsListBodySkeleton />;

  return (
    <div className="space-y-5 font-['Plus Jakarta Sans',sans-serif]">

      {/* ==================== SMOOTH NAVIGATION BAR ==================== */}
      <div className="flex flex-wrap gap-1 bg-gray-100/50 dark:bg-[#0b0e17]/40 border border-gray-200 dark:border-white/5 p-1 rounded-2xl w-fit">
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
      <div className="bg-white/80 dark:bg-[#0b0e17]/60 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl min-h-[500px] flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
            {activeTab === "introduction" && <Profile_Introduction introduction={userDetails?.introduction} isOwner={isOwner} onSave={onUpdateIntroduction} />}
            {activeTab === "performance" && (
              <div className="flex flex-col space-y-6">
                <MeritSection_ProfileDisplay
                  loading={loading}
                  meritScore={userDetails?.merit_score}
                  avgRating={4.8}
                  totalReviews={portfolioItems.length}
                  clientRating={4.9}
                  freelancerRating={4.8}
                  assetRating={4.7}
                  successfulJobsCount={6}
                />
                <Profile_History />
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
            {activeTab === "services" && <Profile_Services services={services} />}
            {activeTab === "job-posts" && <Profile_JobPosts />}
            {activeTab === "assets" && <Profile_Assets />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
