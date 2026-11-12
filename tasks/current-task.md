# Active Task: Refresh support RAG knowledge (policy + current pages)

## Implementation Objective

Update the support assistant knowledge base in `backend/data/` so it reflects the current platform policies (Platform Merit, warnings, account standing/appeals, badges, reports/disputes) and the current customer-facing pages. Content must be customer-support oriented only.

## Acceptance Criteria

- [x] Knowledge files describe current customer-facing routes and behavior (e.g. `/support/ticket`, `/account/appeal`, gig orders, disputes, discovery, workspaces).
- [x] New policy documents cover Platform Merit, warnings and automatic limits, account standing and appeals, and badges in user-facing terms.
- [x] No database, table/column, API endpoint, environment variable, credential, source-file path, or internal staff tooling details appear in ingested knowledge.
- [x] Staff-only operations documents are no longer ingested; stale chunks from removed sources are pruned at ingestion.
- [x] Each source in `sources.json` has a unique URL so documents no longer overwrite each other's chunks.
- [x] Generated documents no longer mention the underlying database.
