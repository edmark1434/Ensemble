import React from "react";
import { useOutletContext, useParams, useNavigate } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";
import { Search } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const JobSavesPage: React.FC = () => {
  const { filteredJobs, loading, viewType, toggleSaveJob, handleReportJob } =
    useOutletContext<JobMainContext>();
  const { id } = useParams();
  const navigate = useNavigate();

  const savedJobs = filteredJobs;

  if (!loading && savedJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="mb-6 h-32 w-32 grayscale opacity-80">
          <DotLottieReact src="/icons/lottie/no-result.lottie" autoplay loop />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          No Job Post Saves Yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-8 max-w-md">
          You haven't saved any job postings. Browse the market and save jobs you're interested in!
        </p>
        <button
          onClick={() => navigate("/jobs/postings")}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Search className="h-4 w-4" />
          View Posts
        </button>
      </div>
    );
  }

  return (
    <JobList
      jobs={savedJobs}
      loading={loading}
      viewType={viewType}
      activeJobId={id}
      onToggleSave={toggleSaveJob}
      onReportJob={handleReportJob}
      baseRoute="/jobs/saved-posts"
    />
  );
};

export default JobSavesPage;