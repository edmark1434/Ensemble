import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";

const JobMyPostPage: React.FC = () => {
  const { jobsList, loading, viewType, toggleSaveJob } = useOutletContext<JobMainContext>();
  const { id } = useParams();

  // Show all user's posts (including Closed posts)
  const myJobs = jobsList.filter((job) => job.isOwnPost);

  return (
    <JobList
      jobs={myJobs}
      loading={loading}
      viewType={viewType}
      activeJobId={id}
      onToggleSave={toggleSaveJob}
      baseRoute="/jobs/my-job-post"
    />
  );
};

export default JobMyPostPage;