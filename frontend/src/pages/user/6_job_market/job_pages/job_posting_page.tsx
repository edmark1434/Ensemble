import React from "react";
import { useOutletContext, useParams, useLocation, useNavigate } from "react-router-dom";
import JobList from "../job_components/job_lists";
import type { JobMainContext } from "../job_main";
import JobPostTypeModal from "../job_components/job_popups/job_post_type_modal";

const JobPostingPage: React.FC = () => {
  const { filteredJobs, loading, viewType, toggleSaveJob, handleReportJob } =
    useOutletContext<JobMainContext>();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isChooseModalOpen = location.pathname === "/jobs/postings/choose";

  const handleCloseChooseModal = () => {
    navigate("/jobs/postings");
  };

  const handleSelectType = (type: "single" | "team") => {
    if (type === "team") {
      navigate("/jobs/create/team");
    } else {
      navigate("/jobs/create");
    }
  };

  return (
    <>
      <JobList
        jobs={filteredJobs}
        loading={loading}
        viewType={viewType}
        activeJobId={isChooseModalOpen ? undefined : id}
        onToggleSave={toggleSaveJob}
        onReportJob={handleReportJob}
        baseRoute="/jobs/postings"
      />

      <JobPostTypeModal
        isOpen={isChooseModalOpen}
        onClose={handleCloseChooseModal}
        onSelectType={handleSelectType}
      />
    </>
  );
};

export default JobPostingPage;