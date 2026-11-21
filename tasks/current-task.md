# Current Task

## Objective

1. When a dispute is public, the disputee (and the disputer) can see the evidence files the disputer attached when filing, next to the original complaint, on the public dispute page and in Cases.
2. Make disputes, cases, tickets and the public dispute page update live without a reload, for members and staff.

## Acceptance Criteria

- Filing evidence is marked on its message (`filing_evidence: true`); older cases fall back to the filer's first attachment-only message posted within minutes of filing.
- `getPublicDisputeDiscussion` returns `evidence` only to the two parties; `loadDisputeCaseDetails` returns `evidence` (only reached by the filer, or both parties once public). The community never receives the files.
- The public page's case panel and the Cases dispute side column show an "Evidence filed" panel with previewable attachments.
- Staff sockets join `staff:cases`; every ticket/dispute change that already notifies members (`announceTicketCase`, `announceDisputeCase`, `notifyCaseOpened`) also emits `staffCaseChanged { kind, id, reason }` there, after the change is saved.
- Admin and support-moderator ticket desks, dispute desks and the admin My Cases tab refetch (debounced) on `staffCaseChanged`.
- The staff ticket modal re-reads the ticket on `ticketStateChanged` and `messageUpdated`.
- The public dispute page polls while its socket is not connected (guests cannot open an authenticated socket).
