/**
 * Reasons a member can pick when reporting a person (profile, team project chat, forum member).
 * They follow the warning catalog (docs/warning-system.md §6) so every warning staff can issue
 * to a person has a matching reason. Each reason stays under 50 characters: the server stores it
 * in `reports.type` (varchar(50)).
 */

export type PersonReportContext = "profile" | "team" | "forum";

export interface ReportReasonGroup {
  label: string;
  reasons: string[];
}

const BEHAVIOR: ReportReasonGroup = {
  label: "Behavior",
  reasons: [
    "Harassment or bullying",
    "Hate speech or discrimination",
    "Threats or violence",
    "Offensive language",
    "Sharing private information",
  ],
};

const CONTENT: ReportReasonGroup = {
  label: "Content",
  reasons: [
    "Inappropriate or explicit content",
    "Inappropriate profile content",
    "Spam or unsolicited messages",
    "Stolen or copyrighted work",
    "Malware or harmful files",
  ],
};

const IDENTITY: ReportReasonGroup = {
  label: "Identity",
  reasons: [
    "Impersonation",
    "Fake account or fake identity",
    "Fake team",
  ],
};

const MONEY: ReportReasonGroup = {
  label: "Scams and payments",
  reasons: [
    "Scam or phishing",
    "Payment fraud",
    "Asking to pay outside Ensemble",
    "Refund or chargeback abuse",
    "Abuse of the dispute process",
  ],
};

const WORK: ReportReasonGroup = {
  label: "Jobs, gigs and contracts",
  reasons: [
    "Fake job or scam offer",
    "Misleading job, gig or listing",
    "No-show or ghosting after hire",
    "Fake or empty delivery",
    "Review manipulation",
  ],
};

const CONTEXT_GROUPS: Record<PersonReportContext, ReportReasonGroup[]> = {
  profile: [],
  team: [
    {
      label: "Team and projects",
      reasons: [
        "Harassment of team members",
        "Disrupting a team project",
        "Harmful file in a project",
      ],
    },
  ],
  forum: [
    {
      label: "Forums",
      reasons: [
        "Repeated forum spam",
        "Off-topic or low-effort flooding",
        "Copyrighted material in forums",
      ],
    },
  ],
};

const OTHER: ReportReasonGroup = { label: "Other", reasons: ["Other"] };

/** Reason groups for reporting a person, with the extra reasons for where the report starts. */
export function personReportReasonGroups(context: PersonReportContext): ReportReasonGroup[] {
  return [
    BEHAVIOR,
    CONTENT,
    IDENTITY,
    MONEY,
    WORK,
    ...CONTEXT_GROUPS[context],
    OTHER,
  ];
}
