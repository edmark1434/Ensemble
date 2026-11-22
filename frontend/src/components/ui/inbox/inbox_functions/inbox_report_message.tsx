import React from "react";
import ReportDialog from "@/components/report/ReportDialog";
import type { Message } from "../inbox_dataset";

/** Must match `CHAT_REPORT_REASONS` on the server. */
const REPORT_REASONS = [
  "Harassment or Bullying",
  "Spam or Scam",
  "Inappropriate or Explicit Content",
  "Hate Speech or Violence",
  "Other",
];

interface InboxReportModalProps {
  messageToReport: Message | null;
  onClose: () => void;
  onSubmitReport: (reportData: {
    messageId: string;
    reason: string;
    details: string;
  }) => Promise<void>;
}

export const InboxReportModal: React.FC<InboxReportModalProps> = ({
  messageToReport,
  onClose,
  onSubmitReport,
}) => {
  const quotedText = messageToReport
    ? messageToReport.message_content ||
      (messageToReport.attachments?.length ? "[Image Attachment]" : "Message")
    : null;

  return (
    <ReportDialog
      isOpen={Boolean(messageToReport)}
      title="Report message"
      subjectPreview={quotedText}
      reasons={REPORT_REASONS}
      subjectWord="message"
      reviewer="Ensemble moderation team"
      minDetails={0}
      onClose={onClose}
      onSubmit={async (reason, details) => {
        if (!messageToReport) return;
        await onSubmitReport({ messageId: messageToReport._id, reason, details });
      }}
    />
  );
};
