# Active Task: Restore badge categories

## Implementation Objective

Put `badge_categories` back as a catalog lookup. Badges store `badge_category_id`. Staff pick or create a category in `/admin/badges`. Grant, claim, pin, and evaluate stay unchanged.

## Acceptance Criteria

- [ ] Migration recreates `badge_categories`, backfills from the old `badges.category` text, and drops that column.
- [ ] Catalog reads join the category name. Create/update require a live category.
- [ ] `GET/POST /api/admin/badge-categories` lists and creates categories.
- [ ] Admin catalog uses a category dropdown (plus inline create) instead of free text.
- [ ] Seed writes `badge_category_id` for Milestones and Marketplace.
