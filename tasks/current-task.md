# Active Task: Parity — admin gets all moderator desk capabilities

## Implementation Objective

Scan marketplace, support, forum, and jobs/gigs moderator desks. Ensure Admin has the same operational capabilities (especially marketplace asset viewing/actions), merged into existing admin design, theme, formats, and categories — not bolted-on duplicates. Verify flows work.

## Acceptance Criteria

- [x] Moderator desks audited (marketplace, support, forum, jobs/gigs).
- [x] Missing admin capabilities identified, especially marketplace asset view/actions.
- [x] Gaps implemented inside existing admin pages/sections with matching UI patterns.
- [x] No redundant parallel nav items that duplicate Moderation/Tickets if already covered.
- [ ] Frontend typecheck passes (run when asked).

## Done in this pass

- Admin APIs: `/api/admin/moderation/marketplace/*`, `/api/admin/moderation/jobs/*`, `/api/admin/restrictions/*`
- Management → Marketplace / Jobs & Gigs (shared controls via `apiBase` + `embedded`)
- Listing case modal → full ListingDetailModal (thumbnail/seller/actions)
- User & Team → Restrictions tab (admin + support variants)
