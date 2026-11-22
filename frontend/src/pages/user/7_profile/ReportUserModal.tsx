import api from "@/lib/axios";
import ReportDialog from "@/components/report/ReportDialog";
import { personReportReasonGroups } from "@/lib/reportReasons";

const reportReasonGroups = personReportReasonGroups("profile");

export function ReportUserModal({
  isOpen,
  accountId,
  displayName,
  onClose,
}: {
  isOpen: boolean;
  accountId: string;
  displayName: string;
  onClose: () => void;
}) {
  return (
    <ReportDialog
      isOpen={isOpen}
      title="Report user"
      subjectName={displayName}
      reasons={reportReasonGroups}
      subjectWord="account"
      reviewer="Ensemble moderation team"
      onClose={onClose}
      onSubmit={async (reason, description) => {
        await api.post(`/api/accounts/${accountId}/report`, { reason, description });
      }}
    />
  );
}
