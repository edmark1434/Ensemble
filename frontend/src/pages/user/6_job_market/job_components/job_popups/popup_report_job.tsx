import React from "react";
import ReportDialog from "@/components/report/ReportDialog";

interface PopupReportJobProps {
  isOpen: boolean;
  jobTitle?: string;
  onClose: () => void;
  onSubmitReport: (reason: string, details: string) => void | Promise<void>;
}

const REPORT_REASONS = [
  "Inappropriate content",
  "Misleading or scam offer",
  "Duplicate or spam post",
  "Incorrect price / details",
  "Other reason",
];

const PopupReportJob: React.FC<PopupReportJobProps> = ({ isOpen, jobTitle, onClose, onSubmitReport }) => (
  <ReportDialog
    isOpen={isOpen}
    title="Report job post"
    subjectName={jobTitle}
    reasons={REPORT_REASONS}
    subjectWord="job post"
    reviewer="jobs and gigs moderators"
    onClose={onClose}
    onSubmit={onSubmitReport}
  />
);

export default PopupReportJob;
