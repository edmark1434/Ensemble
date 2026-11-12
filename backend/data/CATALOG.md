# Ensemble Customer Support Knowledge Data

This directory contains customer-facing knowledge for the Ensemble Support Assistant (RAG). All content is written strictly for customer support and omits internal database, API, credential, environment, source-code, and staff-only operational details.

## URL convention

Each entry in `sources.json` maps to a unique customer-accessible route (with `#fragment` disambiguation where multiple topics reference the same page). Dynamic route placeholders such as `:id` or `:assetId` require an actual resource identifier and are not returned as standalone clickable links.

## Categories

- `public/`: public landing pages, FAQ, hiring, working, pricing, use cases, feedback
- `platform/`: Ensemble overview, features, history, user roles, home, discovery, profiles
- `account/`: registration, login, onboarding, profile setup, settings, deactivation
- `verification/`: personal identity verification (KYC) and team business verification
- `policy/`: Platform Merit, warnings and account limits, account standing and appeals, badges
- `governance/`: reporting content/users and contract/transaction disputes
- `collaboration/`: projects, browser editor, teams, workspaces, delivery dashboard, forums
- `communication/`: inbox, direct/group chat, calls, and Google Meet
- `marketplace/`: job postings, services (gigs), and asset marketplace
- `work/`: proposals and hiring, gig orders, contracts, milestones, and escrow lifecycle
- `payments/`: credits, subscriptions, wallet, cashouts, and transaction history
- `support/`: self-service channels, notifications, ticket categories, and purchase help
- `legal/`: summaries of Terms of Service, Privacy Policy, and custom participant terms
- `generated/`: live public platform settings and subscription plans synced automatically at ingestion

`sources.json` is the machine-readable catalog of enabled knowledge files.
