import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type {JobMainContext} from "../job_main";

const JobSavesPage: React.FC = () => {
  const { jobsList, toggleSaveJob } = useOutletContext<JobMainContext>();
  const { id } = useParams();

  // Filter down strictly to saved posts
  const savedJobs = jobsList.filter((job) => job.isSaved);

  return (
    <JobList
      jobs={savedJobs}
      activeJobId={id}
      onToggleSave={toggleSaveJob}
      baseRoute="/jobs/saved-posts"
    />
  );
};

export default JobSavesPage;