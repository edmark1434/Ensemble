import React from "react";
import { Grid3x3, Bookmark, Briefcase } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const JobTabs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/jobs/postings", label: "Postings", icon: <Grid3x3 className="h-4 w-4" /> },
    { path: "/jobs/saved-posts", label: "Saved", icon: <Bookmark className="h-4 w-4" /> },
    { path: "/jobs/my-job-post", label: "My Job Posts", icon: <Briefcase className="h-4 w-4" /> }
  ];

  return (
    <div className="mb-8 flex gap-1 border-b border-white/10">
      {tabs.map((tab) => {
        const isActive = location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all ${
              isActive
                ? "text-blue-400 border-b-2 border-blue-500 bg-blue-500/5"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default JobTabs;