import ReportDialog from "@/components/report/ReportDialog";
import { personReportReasonGroups, type ReportReasonGroup } from "@/lib/reportReasons";

export type ForumReportSubject = "discussion" | "comment" | "group" | "member";

/** Kept short: the server stores the reason in a 50-character column. */
const REASONS: Record<Exclude<ForumReportSubject, "member">, string[]> = {
  discussion: [
    "Spam or advertising",
    "Harassment or bullying",
    "Hate speech or discrimination",
    "Inappropriate or explicit content",
    "Misinformation or misleading",
    "Copyright violation",
    "Other",
  ],
  comment: [
    "Spam or advertising",
    "Harassment or bullying",
    "Hate speech or discrimination",
    "Inappropriate or explicit content",
    "Off-topic or disruptive",
    "Other",
  ],
  group: [
    "Inappropriate content",
    "Spam or misleading",
    "Harassment or bullying",
    "Hate speech or discrimination",
    "Copyright violation",
    "Impersonation",
    "Other",
  ],
};

/** A member report uses the full person-report list; content reports keep one ungrouped list. */
function reasonsFor(subject: ForumReportSubject): string[] | ReportReasonGroup[] {
  if (subject === "member") return personReportReasonGroups("forum");
  return REASONS[subject];
}

const TITLES: Record<ForumReportSubject, string> = {
  discussion: "Report discussion",
  comment: "Report comment",
  group: "Report group",
  member: "Report member",
};

/** Report flow for forum content and members (shared `ReportDialog`). */
export default function ForumReportModal({
  isOpen,
  subject,
  subjectName,
  subjectPreview,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  subject: ForumReportSubject;
  /** Group name, member name or discussion title. */
  subjectName?: string;
  /** Optional excerpt of what is being reported (a comment's text). */
  subjectPreview?: string | null;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => Promise<void>;
}) {
  return (
    <ReportDialog
      isOpen={isOpen}
      title={TITLES[subject]}
      subjectName={subjectName}
      subjectPreview={subjectPreview}
      reasons={reasonsFor(subject)}
      subjectWord={subject}
      reviewer="forum moderators"
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
