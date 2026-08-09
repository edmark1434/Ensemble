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

export type TabType = "portfolio" | "services" | "job-posts" | "projects" | "assets" | "history";

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
}

const tabOptions: { key: TabType; label: string; icon: React.ReactNode }[] = [
  { key: "portfolio", label: "Portfolio", icon: <FolderOpen className="h-3.5 w-3.5" /> },
  { key: "services", label: "Services", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "job-posts", label: "Job Posts", icon: <FileText className="h-3.5 w-3.5" /> },
  { key: "projects", label: "Projects", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { key: "assets", label: "Assets", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  { key: "history", label: "History", icon: <Clock className="h-3.5 w-3.5" /> },
];

export const DetailsListBodySkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="flex flex-wrap gap-2 border-b border-white/5 pb-3">
      {[...Array(6)].map((_, i) => <div key={i} className="h-8 w-24 bg-white/10 rounded-xl" />)}
    </div>
    <div className="border border-white/10 bg-[#0b0e17]/40 rounded-2xl h-[500px] w-full" />
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
}) => {
  if (loading) return <DetailsListBodySkeleton />;

  return (
    <div className="space-y-5 font-['Plus Jakarta Sans',sans-serif]">

      {/* ==================== SMOOTH NAVIGATION BAR ==================== */}
      <div className="flex flex-wrap gap-1 bg-[#0b0e17]/40 border border-white/5 p-1 rounded-2xl w-fit">
        {tabOptions.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold tracking-wide transition-colors duration-200 select-none cursor-pointer ${
                isActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
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
      <div className="bg-[#0b0e17]/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl min-h-[500px] flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-1 flex flex-col"
          >
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
            {activeTab === "projects" && <Profile_Projects />}
            {activeTab === "assets" && <Profile_Assets />}
            {activeTab === "history" && <Profile_History />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
