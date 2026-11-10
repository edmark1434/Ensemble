# Current Task: Theme-Adaptive Visibility Tooltips & Discovery Page Width Alignment

## Objectives & Completed Work

### 1. Theme-Adaptive Visibility Tooltips (Light on Light Mode, Dark on Dark Mode)
- Replaced native browser `title="..."` attributes with custom floating tooltips matching existing UI patterns across:
  - [`Teams.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/Teams.tsx) (grid banner & compact list view).
  - [`DiscoveryTeamsTab.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/14_discovery/DiscoveryTeamsTab.tsx) (grid banner).
  - [`EditTeamModal.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_modals/EditTeamModal.tsx) (Live Card Preview banner).
- **Styling**:
  - Light mode: `bg-white text-zinc-800 border-zinc-200 shadow-xl`.
  - Dark mode: `dark:bg-zinc-800 dark:text-zinc-100 dark:border-white/10 shadow-xl`.
  - Includes directional caret arrow pointing directly to the icon.
  - Smooth fade/scale animation on hover without native tooltip delays or double tooltips.

### 2. Discovery Page Container Width Alignment
- In [`DiscoveryPage.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/14_discovery/DiscoveryPage.tsx#L861-L867):
  - Updated container width from `max-w-6xl` (1152px) to `max-w-7xl w-full` (1280px).
  - Now matches Job Market (`job_main.tsx`), Teams (`Teams.tsx`), Projects (`Projects.tsx`), and Proposals (`proposals_main.tsx`) layouts identically.

### 3. Team Board View Mode Restriction & Client Orders Scoping
- **Team Board ([`TeamTaskboard.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/team_components/TeamTaskboard.tsx))**:
  - Restricted top tab switcher strictly to `Board` and `Table` (removed `List`, `Gantt`, and `+ View`).
  - Preserved full 4 views (`Board | List | Table | Gantt`) on Workspace Board (`ProjectTaskboardTab.tsx`).
- **Team Services Client Orders Scoping ([`SelectedTeam.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/3_teams/SelectedTeam.tsx), [`GigControllers.js`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/backend/controllers/GigControllers.js))**:
  - Scoped `/api/gigs/orders/incoming` to the team's account ID when `teamId` is passed, ensuring orders for personal services are excluded.

## Verification
- Verified build via `tsc --noEmit && vite build`: built with **0 errors**.

---

# Pulled from origin/main: Dispute Chat & Console Updates

## Objective (10) — the public thread must not make the page endless
- [x] The page is a fixed-height shell (`h-dvh`, `overflow-hidden`): only the thread pane scrolls, so a 300-reply case is the same page height as a 3-reply one.
- [x] Summary card collapses behind a "Details" toggle so it can't starve the thread; the complaint box caps at `max-h-32` with its own scroll.
- [x] Composer is a flex sibling under the pane (no more sticky overlay), textarea down to 2 rows.
- [x] "N new replies" pill floats inside the pane; scroll tracking reads the pane, not the window.

## Objective (11) — realtime for the disputer and disputee
- [x] `emitDisputeState(disputeId)` broadcasts `disputeUpdated` (status, visibility, closed) to both parties' account rooms and the public dispute room. Wired into approve, hide, resolve, dismiss, ban, reopen, generic status patches, and the financial settle/reverse auto-close. It selects only long-standing columns so it is safe before the `resolution_outcome` migration runs.
- [x] `MyTransactionDisputesPage` patches the affected row live (status, visibility, whether notes are still accepted) and refetches when a case first becomes visible to the member.
- [x] `PublicDisputePage` updates the status pill live and locks the composer the moment a case closes.
- [x] Tickets: `announceTicketState(ticketId)` syncs `ticket_details.status/priority` onto the inbox conversation and emits `ticketStateChanged` to the ticket room and the requester; `chat_state.ts` patches the conversation, so a member's ticket composer locks on close without a reload. Ticket *messages* were already realtime through the shared inbox.

---

## Admin and staff console hosts
- [x] `localhost:5173/admin` and `/staff` redirect to `admin.localhost` and `staff.localhost`. On those hosts the address bar omits the prefix.
- [x] `ensemble.software` / `www.ensemble.software` do the same for `admin.ensemble.software` and `staff.ensemble.software`.
- [x] API CORS allows the console origins derived from `FRONTEND_URL`.
- [x] Local console hosts proxy `/api` and `/socket.io` so login cookies stay on that host.
- [x] Admin routes require the Admin role on the client; signed-out visitors land on the portal login.
- [x] Logout and refresh failures clear cookies with matching Secure/SameSite attributes.
- [x] Platform view frames member pages from the console host (same origin, staff session, view-only guard); cross-origin framing renders nothing.
- [x] Verified with a stub API: login, session reload, CSRF rejection/acceptance, logout revocation, CORS allow/deny.
