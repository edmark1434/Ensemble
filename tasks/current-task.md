# Current Task: Redesign Contracts List, Dedicated Details Page, Paper Contract View, Knowledge Guide, Ensemble Logo & Specialist TOS Fix

## Objective
1. Polish `/contracts` list cards and layout for superior light mode visibility, high-contrast typography, solid background (no gray bleed-through), crisp progress tracks, and clean deliverable checklist styling.
2. Refactor the contract details view from a cramped popup modal into a dedicated, responsive full-page view at `/contracts/:id`.
3. Add a Paper Contract ("Paper Detail") view mode to `/contracts/:id` that renders the agreement as a formal, printable legal document complete with full clauses, milestones schedule table, deliverables checklist, and digital signature blocks.
4. Add an Information Tab (`Contract Terms & Guide`) on `/contracts` explaining parties/roles, contract types (Job vs Gig, Single vs Team Milestone Job), contract statuses, milestone lifecycle statuses, and escrow/fee rules with search and category filters.
5. Declutter the top action bar on `/contracts/:id` to eliminate wrapping and button chaos (unified breadcrumb navigation, segmented view mode switcher, contextual print button, and a streamlined "Actions" dropdown for cancellation/disputes).
6. Fix PDF / Print layout and pagination so that sections don't slice awkwardly across pages, backgrounds don't produce dark rasterization bands, and legal formatting looks like a real paper agreement.
7. Fix print centering by neutralizing the 256px sidebar `marginLeft` / `paddingLeft` from the app `Layout` in print mode.
8. Replace placeholder "E" badge on paper contract and contracts view with the official Ensemble platform SVG logo (`/ensemble_lg.svg`).
9. Fix missing Specialist Terms of Service (TOS) in Section 5.1 and Workspace view by mapping backend `terms_title` and `terms_content` with robust fallback guarantees.
10. Replace the generic `Shield` icon on the user side navigation bar (`user_nav.tsx`), `Navbar.tsx`, and Active Contracts tab with the official `ScrollText` contract icon.

## Acceptance Criteria
1. **Contracts List Polish (`/contracts`)**:
   - Clean solid background in light mode (`bg-gray-50`) and dark mode (`dark:bg-dark-base`).
   - Cards redesigned: clear border structure, top accent strip, hover lift, distinct metadata pills (Job/Gig, Role, Status with pulsing indicator).
   - Milestone progress track is distinctly visible in light mode (`bg-zinc-200 dark:bg-zinc-800 border border-zinc-300/60`).
   - Role deliverables checklist container has crisp styling and clear checkboxes.
   - High contrast on all badges and dates in light mode (`bg-*-100 text-*-950 border-*-300`).
   - Top banner features the Ensemble platform SVG logo (`/ensemble_lg.svg`).
2. **Dedicated Full Page for `/contracts/:id`**:
   - Navigating to `/contracts/:id` renders a full-page document layout instead of a popup modal.
   - Clean, uncluttered top navigation bar with breadcrumb (`← Contracts / #id` with Ensemble icon), segmented view switcher (`Workspace` vs `Paper View`), contextual `Print / PDF` (exclusively visible when Paper View is active), and an `Actions ▾` dropdown menu (Copy ID, Request Cancellation, Report a Dispute).
   - Clean 2-column layout: Parties Involved, Escrow Policy, Scope of Work & Deliverables, Specialist Terms of Service card, Milestone Timeline & Actions, and Financial Ledger.
3. **Paper Contract ("Paper Detail") View & Print-to-PDF**:
   - Official Ensemble platform SVG logo (`/ensemble_lg.svg`) displayed in the document header, digital execution seal, and official footer note, styled with `invert dark:invert-0 print:invert` and dedicated `@media print { img.ensemble-logo-print { filter: invert(1) !important; } }`.
   - Dedicated print stylesheet `@media print` with custom `@page` margins (`15mm`).
   - `.avoid-break` applied to each Article, table rows, and digital signatures block to prevent awkward horizontal slice-throughs at page boundaries.
   - `print-exact` (`-webkit-print-color-adjust: exact`) ensuring badges, serial box, table headers, and status badges print with their intended colors and borders.
   - Strictly overrides dark mode in print: forces `#ffffff` background and `#000000` text, removing dark mode background shadows and rasterization bands.
   - Wraps `UserHeader`, `UserNav`, floating chat, and screen-only elements in `print:hidden` to ensure zero top and left whitespace on page 1.
   - Neutralizes `<main style={{ paddingLeft: marginLeft }}>` in `Layout.tsx` by overriding `main { padding-left: 0 !important; }` in print, ensuring the printed document is 100% horizontally centered on the paper.
4. **Specialist Terms of Service (TOS) Section 5.1 & Workspace Display**:
   - `ContractDetailsPage.tsx` properly maps `terms_title` and `terms_content` from the backend `/api/contracts` response into `DetailedContract.freelancerTosTitle` and `freelancerTosContent`.
   - Section 5.1 in `PaperContractDocument` displays the specialist's TOS title and content with safe platform fallbacks so it never renders blank.
   - Workspace view displays a dedicated "Specialist Terms of Service" card under the Scope section.
5. **Contract Terms & Knowledge Guide Tab (`/contracts`)**:
   - Third tab `Contract Terms & Guide` in the main contracts view.
   - Covers Parties & Roles, Contract Types, Overall Contract Statuses, Milestone Lifecycle, and Escrow Mechanics.
   - Category quick-filter pills for clean topic-by-topic navigation.
6. **Verification**:
   - `cd frontend && npm run build` compiles with zero errors.
   - No git commits performed without explicit user command.
