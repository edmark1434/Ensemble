import React, { useState } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";
import { Search } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const JobAppliedPage: React.FC = () => {
  const { filteredJobs, loading, viewType, toggleSaveJob, handleReportJob } =
    useOutletContext<JobMainContext>();
  const { id } = useParams();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Closed">("All");

  const appliedJobs = filteredJobs.filter((job) => {
    if (statusFilter !== "All" && job.status !== statusFilter) return false;
    return true;
  });

  if (!loading && filteredJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-6 h-32 w-32 grayscale opacity-80">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Applied Job Posts Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-md">
          You haven't sent any proposals to open job posts yet. Browse the market and submit your proposals!
        </p>
        <button
          onClick={() => navigate("/jobs/postings")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 cursor-pointer shadow-sm"
        >
          <Search className="h-4 w-4" />
          Browse Postings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Status Sub-filters: All, Open, Closed */}
      <div className="flex items-center gap-2 px-1">
        {(["All", "Open", "Closed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border cursor-pointer ${
              statusFilter === status
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-zinc-200"
            }`}
          >
            {status}
          </button>
        ))}
        <span className="text-xs text-zinc-400 ml-auto font-medium">
          {appliedJobs.length} {appliedJobs.length === 1 ? "application" : "applications"}
        </span>
      </div>

      <JobList
        jobs={appliedJobs}
        loading={loading}
        viewType={viewType}
        activeJobId={id}
        onToggleSave={toggleSaveJob}
        onReportJob={handleReportJob}
        baseRoute="/jobs/applied"
      />
    </div>
  );
};

export default JobAppliedPage;
