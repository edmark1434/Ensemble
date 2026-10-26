# Completed implementation: Project-scoped market asset licenses

## Objective
Replace user_market_assets with market_asset_licenses, preserving existing purchases and financial history. Each license can be assigned permanently to one project. No editor UI changes.

## Acceptance criteria
- Append a reversible migration; migrate existing entitlements to unassigned licenses and link historical purchase transactions where available.
- Update all runtime queries, purchase writes, reviews, download checks, and support purchase selectors.
- Purchase creates an unassigned license atomically with wallet transfers; retries reuse an available license. Assigned uses do not prevent another purchase.
- Backend assignment requires the buyer and an editable project membership; prevent reassignment and duplicate active licensing of the same asset/project.
- Expose license listing and assignment without adding editor UI. Project access uses project membership, not the original buyer identity.
- Verify migration up/down and purchase/access behavior against a rollback-only local database transaction; run relevant checks.

## Implementation and verification
- Added and applied only `1825200000000_market-asset-licenses` to the local development database. Confirmed the old table is removed and the license table exists. Other pending migrations were not applied.
- Migration up/down tested with active, refunded, and soft-deleted fixtures and historical transaction linkage. Rollback refuses lossy conversion after project assignments/multiple purchases.
- `node scripts/test_market_asset_licenses.js` passed before and after migration; all fixtures, wallet writes, and notifications rolled back. Covers fees, free claims, repeat purchases, assignment permissions/immutability, duplicate project grants, collaborator access after buyer departure, review counts, and refund selection.
- `node --test scripts/test_asset_market_actions.js`: 7 passed, including new assignment validation and history pagination checks.
- Frontend `npm run build` passed (existing chunk-size/dynamic-import/plugin-timing warnings). Focused lint comparison found no new findings. Backend syntax checks and `git diff --check` passed.
- Main-site purchase copy now describes one project license and supports another purchase after assignment. No editor UI changes were made for this task; editor checkout and clean-export integration remain unwired.
- No commit. Existing unrelated worktree changes preserved.
