# Ensemble Website Knowledge Data

This directory contains customer-facing knowledge derived from the React route source files in `frontend/src`.

## URL convention

Routes are stored as application-relative URLs, such as `/landing/FAQ`. At runtime, prepend the configured frontend origin (`FRONTEND_URL`). Dynamic segments such as `:assetId` require a real resource identifier and must not be returned to customers as a literal clickable URL.

## Categories

- `public/`: public product information, FAQ, hiring, and working flows
- `platform/`: Ensemble overview and advertised feature set
- `account/`: authentication, profile, settings, and verification routes
- `collaboration/`: projects, teams, forums, inbox, and dashboard
- `marketplace/`: assets and creative-service discovery
- `work/`: jobs, proposals, gigs, and contracts
- `payments/`: credits, checkout, transactions, and subscriptions
- `support/`: tickets, feedback, notifications, and help
- `communication/`: inbox, direct/group chat, calls, and meetings
- `governance/`: reports, violations, disputes, and moderation lifecycle
- `operations/`: role-protected admin and specialist moderator portals
- `legal/`: public and authenticated legal pages

`sources.json` is the machine-readable route catalog. Markdown files are the cleaned knowledge source for ingestion.

## Accuracy rules

- Content describes behavior represented by current frontend source.
- Staff and moderator routes are role-protected operational references, not customer instructions.
- Backend-only guarantees are not inferred from labels or marketing copy.
- UI placeholders and non-persisted forms are identified as such.
- URLs come from `frontend/src/App.tsx`.
- Rebuild or review this data when route behavior changes.
