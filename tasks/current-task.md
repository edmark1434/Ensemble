# Active Task: Restore badge categories

## Implementation Objective

Put `badge_categories` back as a catalog lookup. The badges entity stores `badge_category_id`. Existing category strings are copied into rows. Admin, profile, discovery, and grants read the joined name.

## Acceptance Criteria

- [x] Migration recreates `badge_categories`, backfills from the old `badges.category` text, and drops that column.
- [x] Catalog reads join the category name. Create/update require a live category.
- [x] `GET/POST /api/admin/badge-categories` lists and creates categories.
- [x] Admin catalog uses a category dropdown (plus inline create) instead of free text.
- [x] Seed writes `badge_category_id` for Milestones and Marketplace.
- [x] Profile, discovery, own grants, and pin UI carry `badge_category_id` / `category`.

Apply with `cd backend && npm run migrate` against the intended database.
