# Moderation, Violations, Reports, and Disputes

Admin route: `/admin/moderation`

Source files:

- `frontend/src/pages/admin/moderation/ModerationPage.tsx`
- `frontend/src/pages/admin/moderation/moderationTypes.ts`
- `frontend/src/pages/admin/moderation/CaseDetailModals.tsx`
- `frontend/src/pages/admin/userTeam/components/RowActionsMenu.tsx`

This document describes role-protected operations. It is not a customer action guide.

## Moderation cases

Moderation cases may originate from a report, dispute, listing, identity review, or another supported source. Cases carry type, priority, target, reason, status, assignment, timestamps, and action permissions.

## Violations and account actions

Authorized admin interfaces expose account history for violations and disputes and management actions such as issuing a warning, suspending an account, or restoring an eligible suspended account. Actions require backend authorization and are expected to be recorded in operational history.

Warnings or reports do not automatically prove wrongdoing. Suspension decisions must be based on the applicable case, evidence, permissions, and configured moderation rules.

## Automated moderation settings

The admin interface stores toggles for spam filtering, profanity flagging, new-account holds, forum link scanning, marketplace listing review, dispute assignment, and the warning threshold associated with suspension. A saved setting should not be described as enforced unless the corresponding backend workflow applies it.

## Reports

Reports include the reporter, target, reason, description, status, priority, assignment, and resolution timestamps. Specialist queues separate forum, marketplace, support, and jobs/gigs subject areas.

## Disputes and credit holds

Disputes may include involved parties, related entity, credit amount, hold transaction, outcome, sanction, assignment, and resolution information. Permission flags control assignment, replies, actions, and credit release.

## Audit principle

Durable case state should be updated before realtime notifications are broadcast. Documentation chat must never claim it warned, suspended, cleared, refunded, or sanctioned an account.
