import ReportDialog from "@/components/report/ReportDialog";

interface ReportTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  /** "Report team" by default; team project workspaces pass "Report team project". */
  title?: string;
  onSubmit: (reason: string, description: string) => void | Promise<void>;
}

const reportReasons = [
  "Inappropriate Content",
  "Spam or Misleading",
  "Harassment or Bullying",
  "Fake Team",
  "Copyright Infringement",
  "Other",
];

const ReportTeamModal: React.FC<ReportTeamModalProps> = ({ isOpen, onClose, teamName, title = "Report team", onSubmit }) => (
  <ReportDialog
    isOpen={isOpen}
    title={title}
    subjectName={teamName}
    reasons={reportReasons}
    subjectWord={title === "Report team" ? "team" : "project"}
    reviewer="Ensemble moderation team"
    onClose={onClose}
    onSubmit={onSubmit}
  />
);

export default ReportTeamModal;
