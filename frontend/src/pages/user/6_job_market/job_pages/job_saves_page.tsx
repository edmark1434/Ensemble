import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";

const JobSavesPage: React.FC = () => {
  const { jobsList, loading, viewType, toggleSaveJob } = useOutletContext<JobMainContext>();
  const { id } = useParams();

  const savedJobs = jobsList.filter((job) => job.isSaved);

  return (
    <JobList
      jobs={savedJobs}
      loading={loading}
      viewType={viewType}
      activeJobId={id}
      onToggleSave={toggleSaveJob}
      baseRoute="/jobs/saved-posts"
    />
  );
};

export default JobSavesPage;