import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";

const JobPostingPage: React.FC = () => {
  const { filteredJobs, loading, viewType, toggleSaveJob, handleReportJob } =
    useOutletContext<JobMainContext>();
  const { id } = useParams();

  return (
    <JobList
      jobs={filteredJobs}
      loading={loading}
      viewType={viewType}
      activeJobId={id}
      onToggleSave={toggleSaveJob}
      onReportJob={handleReportJob}
      baseRoute="/jobs/postings"
    />
  );
};

export default JobPostingPage;