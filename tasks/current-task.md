# Active Task: Staff host must not trap member login
# Active Task: Refresh support RAG knowledge (policy + current pages)

## Implementation Objective

On `staff.ensemble.software`, choosing the member/user login path must reach
the platform login on the main site. An existing staff session must not bounce
the browser back into the staff desk.
Update the support assistant knowledge base in `backend/data/` so it reflects the current platform policies (Platform Merit, warnings, account standing/appeals, badges, reports/disputes) and the current customer-facing pages. Content must be customer-support oriented only.

## Acceptance Criteria

- [x] “Member login” from the staff portal opens the main-site member login.
- [x] Visiting `/login` (and signup/forgot/reset) on the main site with a staff
      session does not auto-redirect to the staff desk.
- [x] Already-signed-in staff on the portal login see Continue vs Member login
      instead of a silent redirect.
- [x] Staff can still reach their desk from Continue / successful staff login.
- [x] Admin session handling on the member site remains unchanged.
- [x] Knowledge files describe current customer-facing routes and behavior (e.g. `/support/ticket`, `/account/appeal`, gig orders, disputes, discovery, workspaces).
- [x] New policy documents cover Platform Merit, warnings and automatic limits, account standing and appeals, and badges in user-facing terms.
- [x] No database, table/column, API endpoint, environment variable, credential, source-file path, or internal staff tooling details appear in ingested knowledge.
- [x] Staff-only operations documents are no longer ingested; stale chunks from removed sources are pruned at ingestion.
- [x] Each source in `sources.json` has a unique URL so documents no longer overwrite each other's chunks.
- [x] Generated documents no longer mention the underlying database.
