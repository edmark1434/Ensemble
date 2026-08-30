import React from "react";
import { Grid3x3, Bookmark, Briefcase } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import useGlobalState from "@/lib/global_state";

const JobTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isGuestMode = useGlobalState((state) => state.isGuestMode);

  const allTabs = [
    { path: "/jobs/postings", label: "Postings", icon: <Grid3x3 className="h-4 w-4" /> },
    { path: "/jobs/saved-posts", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
    { path: "/jobs/my-job-post", label: "My Job Posts", icon: <Briefcase className="h-4 w-4" /> }
  ];

  const tabs = isGuestMode ? allTabs.filter(tab => tab.label === "Postings") : allTabs;

  return (
    <div className="flex gap-1 relative">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`relative flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors duration-200 ${
              isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-white/5 rounded-t-lg"
            }`}
          >
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon} {tab.label}
            </span>

            {isActive && (
              <>
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-blue-500/5 rounded-t-lg"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              </>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default JobTabs;