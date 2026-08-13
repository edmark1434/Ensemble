import React, { useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";

const JobMyPostPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Closed">("All");
  const { filteredJobs, loading, viewType, toggleSaveJob, handleReportJob } =
    useOutletContext<JobMainContext>();
  const { id } = useParams();

  const myJobs = filteredJobs.filter((job) => {
    if (statusFilter !== "All" && job.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-2 px-1">
        {(["All", "Open", "Closed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
              statusFilter === status
                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/30"
                : "bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-zinc-400 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-zinc-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <JobList
        jobs={myJobs}
        loading={loading}
        viewType={viewType}
        activeJobId={id}
        onToggleSave={toggleSaveJob}
        onReportJob={handleReportJob}
        baseRoute="/jobs/my-job-post"
      />
    </div>
  );
};

export default JobMyPostPage;