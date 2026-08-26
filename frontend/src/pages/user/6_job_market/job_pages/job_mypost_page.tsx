import React, { useState } from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";
import { Plus } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { continueIfAccountVerified } from "@/lib/accountVerification";

const JobMyPostPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Closed">("All");
  const { filteredJobs, loading, viewType, toggleSaveJob, handleReportJob } =
    useOutletContext<JobMainContext>();
  const { id } = useParams();
  const navigate = useNavigate();

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

      {(!loading && myJobs.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center mt-4">
          <div className="mb-6 h-32 w-32 grayscale opacity-80">
            <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No Job Postings Found
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-md">
            You haven't posted any jobs yet. Post a job to start receiving proposals from talented freelancers!
          </p>
          <button
            onClick={() => continueIfAccountVerified(() => navigate("/jobs/create"))}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Post a Job
          </button>
        </div>
      ) : (
        <JobList
          jobs={myJobs}
          loading={loading}
          viewType={viewType}
          activeJobId={id}
          onToggleSave={toggleSaveJob}
          onReportJob={handleReportJob}
          baseRoute="/jobs/my-job-post"
        />
      )}
    </div>
  );
};

export default JobMyPostPage;