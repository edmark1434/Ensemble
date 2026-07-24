import React from "react";
import { useOutletContext, useParams } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type {JobMainContext} from "../job_main";

const JobMyPostPage: React.FC = () => {
  const { jobsList, toggleSaveJob } = useOutletContext<JobMainContext>();
  const { id } = useParams();

  // Filter down strictly to user's posts
  const myJobs = jobsList.filter((job) => job.isOwnPost);

  return (
    <JobList
      jobs={myJobs}
      activeJobId={id}
      onToggleSave={toggleSaveJob}
      baseRoute="/jobs/my-job-post"
    />
  );
};

export default JobMyPostPage;