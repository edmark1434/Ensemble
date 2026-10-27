# Active Task: Admin Badge Catalog CRUD

## Implementation Objective

Give administrators a catalog editor for the badge system at `/admin/badges`, next to the existing grant/revoke desk.

1. List, create, update, and soft-delete badge definitions (registry id, name, description, category, trigger, condition, secret flag).
2. Create badge categories from the same form.
3. Keep grant and revoke on a Grant tab. Product catalog IDs stay locked so auto-award and profile icons do not break.
4. Soft-deleted badges leave existing grants in place until staff revoke them.

## Acceptance Criteria

- [x] Admin can open `/admin/badges` from the console nav.
- [x] Catalog tab supports create, edit, and delete of honorary badges.
- [x] Product badges (`acc-alpha`, ranks, profile complete) can be edited but not deleted or re-id'd.
- [x] Grant tab still searches users, sends pending grants, and revokes holders.
- [x] Backend validates all catalog writes. `/admin/badge-grant` redirects to the Grant tab.
- [x] TypeScript check succeeded. Vite production bundle is blocked by an existing missing `@hugeicons/react` install, unrelated to this change.
