import React from "react";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { continueIfAccountVerified } from "@/lib/accountVerification";

interface JobSearchbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const JobSearchbar: React.FC<JobSearchbarProps> = ({ searchQuery, setSearchQuery }) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center w-full">
      <button
        onClick={() => continueIfAccountVerified(() => navigate("/jobs/create"))}
        className="shrink-0 flex items-center gap-2 rounded-full bg-black dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-black transition hover:scale-105"
      >
        <Plus className="h-4 w-4" /> <span>Post a Job</span>
      </button>
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-500" />
        <input
          type="text"
          placeholder="Search by job title, client name, or keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 pl-11 pr-4 py-3 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-500"
        />
      </div>
    </div>
  );
};

export default JobSearchbar;