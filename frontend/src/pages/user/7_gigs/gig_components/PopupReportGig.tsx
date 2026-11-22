import React from "react";
import ReportDialog from "@/components/report/ReportDialog";

interface PopupReportGigProps {
  isOpen: boolean;
  gigTitle?: string;
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

const PopupReportGig: React.FC<PopupReportGigProps> = ({ isOpen, gigTitle, onClose, onSubmitReport }) => (
  <ReportDialog
    isOpen={isOpen}
    title="Report service"
    subjectName={gigTitle}
    reasons={REPORT_REASONS}
    subjectWord="service"
    reviewer="jobs and gigs moderators"
    onClose={onClose}
    onSubmit={onSubmitReport}
  />
);

export default PopupReportGig;
