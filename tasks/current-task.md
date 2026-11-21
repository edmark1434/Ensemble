# Current Task

## Objective

Make team accounts behave as teams, not users, across the admin and staff User & Team desks, punishments and wallets (docs/punishment-system.md §8.10).

## Acceptance Criteria

- **Leader answers for the team.** A warning or forum timeout aimed at a team is issued to its leader (first active Owner); `violations.team_account_id` (migration `1830200000000_team-leader-warnings`) names the team, the leader's notice says it came with the team, and the team's record lists it. No leader → 409 `TEAM_NO_LEADER`.
- **Team status with leader cascade.** Ban / suspend / lock change the team account; "Also apply to the team leader" (default on, single and bulk) gives the leader the same named punishment. Leaders already at the same or a stricter standing are skipped; a leader staff may not act on stops the action before anything changes. Lifting the team also lifts a leader penalty that was set with it. This works on every path (`warnAccount` / `updateAccountStatus` route team targets to `TeamSanctionServices`).
- **Team standing gate** (`TeamStandingServices.assertTeamAllows`) on every team write: suspended teams keep only live work; locked and banned teams stop all writes; leave, decline, report and chat always work. A banned, locked or missing leader pauses marketplace actions, wallet moves and subcontract hires. Covers `TeamsServices`, `TeamTaskServices`, `TeamProjectServices` and `MarketplaceActorServices`.
- **Team notices.** Team status changes, credit holds/releases, staff credit adjustments and timed-penalty expiry notify the team's active Owners and Admins, and push `team:standing_changed` to members. The team page shows a restriction banner (`standing` on `GET /api/teams/:id`) and reloads on that event.
- **Staff ownership transfer.** `POST /api/admin/teams/:accountId/transfer-ownership` (Admin / Support): the new owner must be an active member in good standing; the previous owner becomes Admin, Member or is removed; both are told; recorded on the team.
- **Teams desk.** Rows show the real leader (status, merit, timeout), team wallet (spendable, held, owed to members), status with end date, team type and attention flags (no leader, leader restricted, credits held, open disputes); filters for type and attention; stat cards and a leader-issues banner. Team-specific menu labels (Ban team, Warn team leader, Timeout team leader, Transfer ownership). Overview shows a leader card instead of a fake team merit, plus the wallet breakdown; history shows warnings issued through the team (rescind acts on the leader's account); the wallet modal shows escrow / owed / free-to-pay-out and the counterparty of each payment.
