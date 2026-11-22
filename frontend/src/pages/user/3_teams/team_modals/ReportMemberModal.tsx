import ReportDialog from "@/components/report/ReportDialog";
import { personReportReasonGroups } from "@/lib/reportReasons";

interface ReportMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  onSubmit: (reason: string, description: string) => void | Promise<void>;
}

const reportReasonGroups = personReportReasonGroups("team");

const ReportMemberModal: React.FC<ReportMemberModalProps> = ({ isOpen, onClose, memberName, onSubmit }) => (
  <ReportDialog
    isOpen={isOpen}
    title="Report member"
    subjectName={memberName}
    reasons={reportReasonGroups}
    subjectWord="member"
    reviewer="Ensemble moderation team"
    onClose={onClose}
    onSubmit={onSubmit}
  />
);

export default ReportMemberModal;
