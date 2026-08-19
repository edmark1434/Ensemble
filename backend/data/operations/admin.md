# Administration

Routes:

- `/admin/dashboard`
- `/admin/user-team`
- `/admin/credit-economy`
- `/admin/moderation`
- `/admin/analytics`
- `/admin/ticket-management`
- `/admin/system-settings`

Sources:

- `frontend/src/App.tsx`
- `frontend/src/pages/admin/AdminDashboard.tsx`
- `frontend/src/pages/admin/userTeam/UserTeamPage.tsx`
- `frontend/src/pages/admin/creditEconomy/CreditEconomyPage.tsx`
- `frontend/src/pages/admin/moderation/ModerationPage.tsx`
- `frontend/src/pages/admin/ticketManagement/TicketManagementPage.tsx`
- `frontend/src/pages/admin/systemSettings/SystemSettingsPage.tsx`

All routes in this document are protected by staff middleware and admin authorization.

## Dashboard and analytics

Admin views summarize platform activity and provide operational analytics based on backend data sources.

## Users and teams

The user/team area supports account review, wallet and credit inspection, verification details, history, warnings, and authorized account-status actions. Bulk actions remain permission-controlled.

## Credit economy

The economy portal displays wallet balances, transaction audit data, circulation and revenue summaries, top buyers, credit packages, fee settings, and marketplace configuration. Changes to balances or configuration must be enforced by backend services rather than trusted from the UI.

## Moderation

The moderation portal brings together cases, reports, disputes, identity reviews, marketplace listings, forum review data, moderator activity, and automated-setting controls.

## Ticket management

Administrators can view cross-queue tickets, apply filters, inspect messages and linked cases, assign staff, escalate, and update ticket state according to permissions.

## System settings

The settings portal stores platform, moderation, economy, notification, and security configuration in `platform_settings`. A setting affects production behavior only when the relevant backend service consumes and validates it.

Internal admin routes and operational metrics should not be returned as suggested customer navigation links.
