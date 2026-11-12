# Active Task: Forum Moderator console redo

## Implementation Objective

Rebuild the Forum Moderator desk into a cleaner, professional console: one
Forum Control tab for discussions and groups, a detailed dashboard, forum-only
tickets with escalate/recategorize, working reports, and no Restrictions tab.

## Acceptance Criteria

- [x] Dashboard is detailed, clean, and professional (marketplace-desk quality).
- [x] Forum Discussion and Forum Groups are a single Forum Control tab with
      Discussions | Groups views, wired to `/api/moderator/forum`.
- [x] Ticket Management shows only forum-scoped tickets; staff can escalate and
      move a ticket to another category/queue when filed wrong.
- [x] Reports desk is detailed, forum-scoped, and clean.
- [x] Restrictions tab is removed from the forum console (warn/suspend stay on
      User & Team).
- [x] Old `/groups`, `/forum-discussion`, and `/restrictions` paths still land
      somewhere useful (redirects).
- [x] Any extra forum-moderator tools needed for day-to-day work are present.

---

# Active Task (parallel): Jobs & Gigs Moderator console pass

## Implementation Objective

Bring `/moderator/jobs` to the marketplace-desk standard: a sectioned dashboard with
queue health, a cleaner and more detailed Jobs & Gigs Control, a jobs-only ticket desk
with move/escalate, report cases that resolve every jobs target, and no Restrictions tab.

## Acceptance Criteria

- [x] Dashboard: queue health (ageing tickets/reports/disputes, first-reply and
      resolution averages, 7-day throughput), board, contracts/escrow, tickets/reports
      sections; most-reported postings, team workload; flat surfaces, no gradients.
- [x] Control: sort (reported first by default), status filter with counts, type tabs,
      reported-only toggle, per-posting open-report count, load more, row kebab menu.
- [x] Pause / Close / Archive require a reason (backend-enforced) via a reason dialog.
- [x] Posting detail shows reports on the posting and its moderation history; it is a
      self-contained modal used by both Control and the dashboard.
- [x] Ticket desk is hard-scoped to `JOBS_TYPES` on every endpoint (incl. message
      edit/delete); Move ticket recategorises or hands off; copy explains it.
- [x] Report subjects resolve `job`, `gig`, `jobs`, `gigs`, `contract`, `proposal`,
      `application`, `feedback` with staff links.
- [x] Restrictions removed: nav, route (redirects to User & Team), lazy page, prefetch,
      page file, backend routes and controller handlers.
- [ ] Frontend typecheck passes (run when asked).
