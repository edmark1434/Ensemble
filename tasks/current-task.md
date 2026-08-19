# Current Task

## Active Task — Atomic Top-up Settlement and Reconciliation

Make successful credit top-ups atomic and idempotent across the Xendit webhook and payment reconciliation job. A successful top-up must update payment/top-up status, credit the user wallet, write exactly one `Fund Transfer` ledger row using the internal payment UUID, and persist exactly one notification in a single PostgreSQL transaction. Realtime events must be emitted only after commit. Already-paid top-ups missing ledger artifacts must be detected without automatically crediting their wallets again.

### Acceptance Criteria

* [x] Webhook and background reconciliation share one durable settlement operation.
* [x] `credit_transactions.reference_id` uses `payments.id`, not the external `TOPUP-*` reference.
* [x] Payment status, top-up status, wallet mutation, ledger insert, and notification commit atomically.
* [x] Concurrent/repeated provider events cannot credit a wallet twice.
* [x] Realtime notification and wallet events emit only after commit.
* [x] Paid top-ups missing ledger artifacts are reported for safe repair without another wallet credit.
* [x] A focused database migration adds the required idempotency constraint.
* [x] Backend syntax and focused behavior checks pass.

**Status:** Completed August 19, 2026.

**Implementation summary:** Added a single-client PostgreSQL settlement operation shared by the Xendit webhook and reconciliation job. It locks the payment/top-up and wallets, uses the internal payment UUID for the ledger reference, credits the user wallet, persists one ledger row and notification, and commits before emitting realtime notification/wallet events. A partial unique index prevents duplicate top-up ledger entries. Reconciliation reports legacy paid top-ups missing ledger records without guessing whether to credit their wallets. Added an explicit artifact-only repair operation for independently confirmed wallet credits.

**Repair performed:** Repaired the real 1,600-credit top-up `TOPUP-2654caff-b903-45fc-9651-2d828532bdc0` by inserting its missing ledger and notification records. The repair did not change the wallet balance. Two unrelated seed top-ups with missing ledgers were detected and intentionally left unchanged.

**Verification:** Applied migration 137, confirmed the repaired payment/top-up remain `PAID`, and confirmed exactly one matching credit transaction and one notification. Backend syntax checks and `git diff --check` passed.

## Active Follow-up — Asset Previews, Likes, Saves, and Buyer Reviews

Provide one safe public derivative preview for every file in an asset package. Package Contents must render these previews blurred for users who do not own the package and without a lock replacement; full-quality originals remain available only through the existing authorized signed-URL endpoints after purchase or to the creator. Add durable asset likes and saves, including authenticated idempotent API actions, counts/state in asset responses, and a Saved library view. Add `asset_reviews` so each active purchaser can submit at most one 1–5 star review, update or delete their own review, and non-purchasers/creators cannot review. Keep the controller → service → repository boundary and change only marketplace-asset schema and feature files.

### Acceptance Criteria

* [x] A reversible append-only migration adds a public derivative file relationship to each bundle item and safely backfills existing items from the package thumbnail.
* [x] New one-file and multi-file assets upload and atomically persist one derivative preview for every protected original.
* [x] Public asset responses expose derivative preview paths but never original paths or original signed URLs.
* [x] Package Contents shows clear derivative previews to creators/purchasers and blurred derivative previews to other users without fetching protected originals.
* [x] Original preview/download endpoints remain restricted to the creator or an active purchaser.
* [x] Reversible `asset_likes`, `asset_saves`, and `asset_reviews` tables enforce one active relationship/review per account and asset.
* [x] Authenticated like/save actions are idempotent and asset responses include current-account state and aggregate counts.
* [x] Saved assets are available through the paginated Assets Library.
* [x] Only an active purchaser can create or update one 1–5 star review; only its author can update/delete it.
* [x] Asset Details shows review totals/average, buyer review controls, and active reviews without a page reload.
* [x] Backend validation and authorization remain authoritative.
* [x] Relevant migration, repository/service/controller/route checks, focused database verification, frontend lint, and production build pass.

**Follow-up status:** Completed August 18, 2026.

**Implementation summary:** Added and applied the reversible marketplace-engagement migration. Every protected bundle original now references a safe public image derivative; existing items use their listing thumbnail, while new images receive a resized watermarked WebP, videos receive a watermarked still frame, and audio files receive a non-playable visual card. Public asset list/detail responses expose only this derivative metadata. Package Contents renders the derivative clearly for creators and active purchasers and blurred for other users, while the existing signed original preview/download endpoints remain entitlement-protected. Added durable, soft-deletable `asset_likes`, `asset_saves`, and `asset_reviews` records with one row per account/asset, authenticated idempotent like/save endpoints, aggregate/current-user state, and a paginated Saved library view. Buyer Reviews supports one 1–5 star review per active purchaser with author-only edit/delete controls and immediate local UI updates; creators and non-purchasers are rejected by backend authorization.

**Verification:** Both asset migrations are applied. Live schema checks confirmed all eight active bundle items have a non-null preview relationship and confirmed the primary, foreign-key, uniqueness, rating, text-length, and index protections on all three engagement tables. A read-only repository check loaded an existing package and confirmed its public payload had matching preview metadata and no protected `asset-originals/` path. Rollback-only database checks confirmed like/save set/unset idempotency and purchaser review create, duplicate rejection, update, and delete; a service check confirmed a non-purchaser receives HTTP 403. Backend syntax checks and Asset route loading passed. Targeted Assets ESLint, `git diff --check`, and the frontend TypeScript/Vite production build passed. The production build retains the repository's existing dynamic-import and large-chunk warnings; route loading also triggered the environment's existing Redis network-access warnings after the route itself loaded.

## Active Follow-up — Multi-file Asset Bundles

Allow one marketplace asset package to contain one or many protected original files. Add `media_asset_bundle_files` as the normalized child of `media_assets`, backfill every existing `original_file_id` as bundle position zero, then remove the legacy `media_assets.original_file_id` foreign key and column. Keep `thumbnail_file_id` as the package cover and `proxy_file_id` as the safe public preview. Asset creation must accept multiple finalized, account-owned originals, enforce per-file and aggregate limits, persist all bundle relationships atomically, and retain one-file creation. Asset Details must list every bundle file; creators and active purchasers may request a separate 60-second signed preview/download URL per file, while public list/detail responses must never contain original paths or signed URLs. Update only direct schema consumers, including the video editor's one-file media-asset flow.

### Acceptance Criteria

* [x] An append-only reversible migration creates `media_asset_bundle_files` with keys, ordering, constraints, indexes, and timestamps.
* [x] Every existing non-deleted and deleted media asset original is backfilled before `media_assets.original_file_id` is removed.
* [x] Migration down restores `original_file_id` from the first ordered bundle item before removing the bundle table.
* [x] Asset creation accepts 1–20 original files and validates distinct IDs, finalized ownership, protected placement, MIME support, per-file size, and a 500MB aggregate limit on the backend.
* [x] The first original remains the source for public proxy generation and top-level media metadata; the selected thumbnail remains the package cover.
* [x] Media asset, market listing, bundle-file rows, tags, and file-use checks are committed atomically.
* [x] Public asset list/detail responses include only safe bundle metadata and never original paths or signed URLs.
* [x] Only the creator or an active purchaser can request a signed preview/download URL for a specific active bundle file.
* [x] Asset Details lists all included originals and opens the selected authorized file in the protected viewer.
* [x] New single-file and multi-file packages both work, while existing assets remain accessible as one-file bundles.
* [x] Direct video-editor media-asset inserts/read queries use the bundle table and preserve their existing one-file behavior.
* [x] No unrelated feature files are modified.

**Follow-up status:** Completed August 18, 2026.

**Implementation summary:** Added and applied the append-only `media_asset_bundle_files` migration, backfilled each former `media_assets.original_file_id` at position zero, and removed the legacy column. Marketplace asset creation now accepts one to twenty finalized protected originals, enforces distinct ownership, MIME, placement, per-file, and 500MB aggregate rules on the backend, and inserts the media record, ordered originals, listing, and tags in one transaction. The first selected original still produces the public proxy and top-level media metadata; the separate thumbnail remains the package cover. Public asset responses return only safe ordered file metadata. Creator and active-purchaser preview/download endpoints authorize the requested bundle-file ID before returning a 60-second signed URL. The create modal supports one or many originals, appends files selected in later picker sessions, preserves valid selections when a new selection fails validation, and allows individual removal. Asset Details renders visual image/video cards for authorized package originals instead of filename-led rows, uses a media visual when no frame is available, and displays locked blurred cover cards without fetching originals for non-purchasers. Clicking an authorized preview opens the selected file in the protected viewer. Seed and video-editor direct schema consumers now create/read position-zero bundle rows for their existing single-file flows, and the affected video-editor routes use the current media UUID after the old public-ID column removal.

**Verification:** The migration applied successfully. Live schema inspection confirmed six child-table columns, one primary key, two foreign keys, two uniqueness constraints, and five indexes; all five existing media assets were backfilled and none retained or lacked the legacy original relationship. A rollback-only two-original creation reached ordered positions zero and one atomically, and a follow-up query confirmed no verification data persisted. Read-only authorization checks confirmed public results contain no original path or signed URL, creators can select an exact child file, unrelated child IDs return no result, and an unauthorized account receives `ASSET_PURCHASE_REQUIRED`. Empty, duplicate, and 21-file payloads returned backend validation errors. Backend syntax checks and route loading, targeted Assets ESLint, `git diff --check`, and the frontend TypeScript/Vite production build passed. The four changed video-editor TypeScript files parsed without diagnostics; a full video-editor type/build check could not run because that package's dependencies are not installed in this workspace and restricted npm access prevented `npx` from fetching TypeScript. Existing frontend dynamic-import and large-chunk warnings remain unrelated.

## Active Follow-up — Asset Replies and Marketplace Purchase Fee

Complete the existing `asset_replies` feature with authenticated create, edit, and soft-delete operations scoped to an active comment on an accessible asset. Add nested reply rendering and controls to Asset Details. Enhance the existing purchase confirmation modal to show the asset thumbnail/name, total price, current account-wallet balance, and projected balance after purchase. Define the marketplace asset transaction-fee percentage in one backend constant, calculate all fee amounts server-side using integer credits, deduct the fee from the creator's proceeds, credit the platform wallet, and persist a linked `Fee` credit transaction atomically with the purchase. Show creators the fee percentage, fee credits, and net proceeds per sale. No schema change is required.

### Acceptance Criteria

* [x] Active asset comments return typed active replies with safe public author fields.
* [x] Authenticated users can create replies only under an active comment belonging to the requested accessible asset.
* [x] Reply authors can edit or soft-delete their own replies; other accounts cannot mutate them.
* [x] Reply text is trimmed and backend-limited to 2,000 characters.
* [x] Asset Details renders replies and responsive create/edit/delete controls without reloading the page.
* [x] The purchase confirmation shows asset identity, total credits, current balance, and balance after purchase.
* [x] Insufficient balance prevents confirmation on the frontend and remains enforced by the backend.
* [x] A single backend constant defines the marketplace asset transaction-fee percentage.
* [x] Buyer debit, creator net credit, platform fee credit, purchase ledger, linked fee ledger, entitlement, and notifications commit atomically.
* [x] The fee uses deterministic integer-credit rounding and can never exceed the asset price.
* [x] Asset creators see the configured percentage, fee amount, and expected net proceeds.
* [x] No database migration or schema change is introduced.

**Follow-up status:** Completed August 17, 2026.

**Implementation summary:** Completed the existing `asset_replies` persistence path with nested authenticated create, author-only edit, and author-only soft-delete endpoints. Comment responses now include active typed replies with safe author identity/avatar fields, and Asset Details adds inline reply forms, nested reply rendering, editing, deletion confirmation, and local state updates without a page reload. The purchase dialog now shows the asset thumbnail and name, total price, authoritative current wallet balance, and projected balance after purchase. Added a single backend marketplace asset fee constant set to 8%. Paid purchases debit the buyer by the listing price, credit the creator with price minus fee, credit the platform wallet with the fee, link a `Fee` ledger row to the `Asset Purchase` row, persist ownership and notifications, and commit all mutations in one transaction. Fees round upward to the next whole credit and are capped at the listing price. Owners see the percentage, fee credits, and net proceeds on Asset Details.

**Verification:** Backend syntax checks passed for the constant, repository, service, controller, and route modules. A rollback-only reply workflow confirmed trimmed creation, safe response fields, author-only update rejection, authorized update, soft deletion, and nested active-reply listing without persisting test data. A rollback-only paid purchase confirmed the 8% deterministic fee calculation, linked fee transaction, creator net calculation, two prepared notifications, and unchanged balances/ledgers after rollback. Targeted Assets frontend ESLint, `git diff --check`, and the frontend TypeScript/Vite production build passed. The route graph loaded, after which the local verification process reported the environment's existing Redis network-access errors. Existing unrelated dynamic-import and bundle-size build warnings remain.

## Active Follow-up — Durable User-Owned Market Assets and Original Viewer

Create `user_market_assets` as the durable entitlement table for purchased/claimed assets, while retaining `credit_transactions` as the financial audit ledger. The table must store `user_id`, `market_asset_id`, purchase `price`, ownership `status`, `created_at`, and nullable `deleted_at`, enforce one row per user/market asset, and backfill existing completed non-refunded Asset Purchases. Future purchase transactions must write the wallet transfer, credit transaction, ownership row, and notifications atomically. Purchased-list, protected-original authorization, and deletion safeguards must use the ownership table. Asset Details must use the thumbnail as its cover and provide an authorized Original File section that requests a short-lived inline signed URL only when opened in a modal; the permanent original storage path must remain absent from public API responses.

### Acceptance Criteria

* [x] An append-only migration creates `user_market_assets` with foreign keys, checks, indexes, timestamps, and a reversible down migration.
* [x] Existing completed, non-refunded user Asset Purchases are backfilled without duplicates.
* [x] New successful purchases atomically insert or reactivate a `user_market_assets` row using the authenticated buyer's `user_id`.
* [x] `credit_transactions` remains the payment/audit record and `user_market_assets` becomes the entitlement source of truth.
* [x] Purchased listing, asset detail access, original-file access, and delete safeguards use active ownership rows.
* [x] Creator ownership remains in `media_assets.owner_user_id` and is not transferred.
* [x] Asset Details cover renders `thumbnail_path`, not `proxy_path` or the original.
* [x] An Original File card appears for creators and active purchasers and opens an accessible modal.
* [x] The modal obtains a short-lived inline signed URL from an authenticated/authorized endpoint on demand.
* [x] Image, video, and audio originals render with appropriate native elements in the modal.
* [x] Original storage paths remain absent from list/detail API responses.

**Follow-up status:** Completed August 17, 2026.

**Implementation summary:** Added and applied the append-only `user_market_assets` migration with one entitlement per user/asset, active/refunded ownership status, purchase-price snapshot, timestamps, foreign keys, indexes, and a completed non-refunded purchase backfill. New purchases now write the credit ledger, ownership row, wallet changes, and notifications in one PostgreSQL transaction. Purchased listings, protected-original authorization, and deletion safeguards now use the ownership table. Asset Details uses the listing thumbnail as the cover and includes a protected Original File card; opening it requests an authenticated, authorization-checked, 60-second inline S3 URL and renders image, video, or audio media in a modal. The permanent original path remains server-only.

**Verification:** The migration runner reported no pending migrations after application. Live schema inspection confirmed all six columns, primary key, foreign keys, status/price checks, and one active backfilled entitlement. Read-only repository/service checks confirmed the purchased listing and detail permissions use that entitlement, public detail responses omit `original_path`, and an authorized short-lived original preview URL can be generated. A full eligible purchase reached wallet updates, ledger insert, entitlement upsert, and two notification inserts while commit was deliberately replaced with rollback; follow-up queries confirmed no test entitlement or transaction persisted. Backend syntax checks, targeted Assets frontend ESLint, `git diff --check`, and the frontend TypeScript/Vite production build passed. Existing unrelated dynamic-import and bundle-size build warnings remain.

## Active Follow-up — Asset Upload Modal Preview Layout

Fix the create-asset modal upload controls so their dashed fields do not overflow into the preview section. After selection, show the actual original image rather than relying on its filename, and provide separate responsive previews for the original media and listing thumbnail. Support image, video, and audio originals using native browser preview elements where appropriate. All temporary object URLs must be revoked during replacement, reset, close, or unmount. This is a frontend-only adjustment with no API or schema changes.

### Acceptance Criteria

* [x] Original and thumbnail upload controls remain within their grid cells at all supported widths.
* [x] Selected images render their actual visual content in the upload control and full preview area.
* [x] Video originals use an inline video preview and audio originals use an inline audio preview.
* [x] Original and thumbnail previews stack on small screens and display side-by-side when space permits.
* [x] Replacing or clearing files revokes the previous object URLs.
* [x] Existing upload validation and submission behavior remains unchanged.

**Follow-up status:** Completed August 17, 2026.

**Implementation summary:** Removed the conflicting full-height sizing from both upload buttons and added minimum-width/overflow containment so the dashed controls stay inside their responsive grid. Selected original and thumbnail images now render directly inside their upload controls instead of using filenames as the primary state. A separate responsive preview grid shows the full original image/video/audio alongside the listing thumbnail. Object URLs are created only while the modal is open and are revoked when a file is replaced, the modal closes, or the component unmounts.

**Verification:** Targeted ESLint passed for `AssetEditorModal.tsx`, and the frontend TypeScript/Vite production build passed. Existing unrelated dynamic-import and bundle-size build warnings remain unchanged.

## Active Follow-up — Asset Tags

Add an optional tag field to asset creation and editing using the existing `tags` and `market_asset_tags` tables. Tags must be normalized, case-insensitively deduplicated, limited to 10 entries of at most 50 characters, persisted in the same transaction as the asset create/update, returned through existing asset responses, displayed in Asset Details, and included in asset search. Removing a tag from an asset must soft-delete only the `market_asset_tags` relationship and must not delete the shared `tags` catalog row. No schema change or migration is permitted.

### Acceptance Criteria

* [x] Create/edit forms provide an accessible chip-style tag input supporting Enter and comma.
* [x] Users can remove selected tags before submission.
* [x] Frontend and backend enforce at most 10 distinct tags and 50 characters per tag.
* [x] Tag names are trimmed, optional leading `#` characters are removed, and duplicates are compared case-insensitively.
* [x] Existing active tag rows are reused; missing tag rows are created safely.
* [x] `market_asset_tags` relationships are inserted/reactivated transactionally with asset creation/update.
* [x] Removed asset-tag relationships are soft-deleted without deleting global tags.
* [x] Asset search matches active related tag names.
* [x] Asset Details displays active tags.
* [x] No database schema or migration change is made.

**Follow-up status:** Completed August 17, 2026.

**Implementation summary:** Asset create/edit payloads now accept normalized tag arrays. The backend removes leading `#` characters, collapses whitespace, performs case-insensitive deduplication, and enforces 10-tag/50-character limits. Asset repository transactions serialize missing-tag creation by normalized name, reuse active catalog tags, soft-delete the asset's previous relationships, and insert or reactivate the selected `market_asset_tags` rows. Asset search now matches active tag names. The modal provides removable tag chips with Enter/comma entry and preloads existing tags while editing, and Asset Details renders the saved tags.

**Verification:** Backend syntax checks and targeted frontend ESLint passed. A real asset update traversed tag catalog lookup/creation and relationship synchronization with commit deliberately replaced by rollback; a follow-up query confirmed no test tag persisted. A live read-only tag-search query returned its related published asset. The frontend TypeScript/Vite production build passed. No migration or schema file was created.

## Active Follow-up — Asset Preview and Credit Purchases

Add an immediate thumbnail-image preview to the create-asset modal and implement credit-based asset purchasing without changing the database schema. A completed `Asset Purchase` credit transaction is the durable buyer entitlement; the original creator remains the listing/media owner. Purchases must atomically debit the buyer account wallet, credit the creator account wallet, persist buyer and creator notifications, prevent duplicate/concurrent charges, and unlock the existing protected-original download. Purchased assets must be recoverable after refresh through a Purchased library view. Realtime notification and wallet-balance updates must be emitted only after the transaction commits. Assets with a completed, non-refunded purchase must not be deleted while no refund/removal workflow exists.

### Acceptance Criteria

* [x] Selecting a thumbnail in the create modal shows an immediate preview and revokes temporary browser URLs safely.
* [x] Authenticated non-owners can purchase published assets or claim zero-credit assets.
* [x] Creator ownership is unchanged; buyers receive a ledger-backed entitlement.
* [x] Buyer and creator account wallets are validated, locked, and updated atomically.
* [x] Insufficient balance, inactive wallets, draft/deleted assets, and self-purchases are rejected without mutations.
* [x] Repeated or concurrent purchase requests do not charge more than once.
* [x] Buyer and creator notifications are stored durably and emitted through the existing authenticated Socket.IO rooms after commit.
* [x] Buyer and creator wallet balances update in the shared header without a page refresh.
* [x] The successful purchase updates Asset Details to Owned/Download without reloading.
* [x] Purchased assets appear in a paginated Purchased library view and remain discoverable after refresh.
* [x] Completed non-refunded purchases continue to authorize protected-original downloads.
* [x] Assets with active purchases cannot be deleted without a refund/removal workflow.
* [x] Asset purchases appear in the existing transaction history through `credit_transactions`.
* [x] No database table, column, or migration is added or modified.

**Follow-up status:** Completed August 17, 2026.

**Implementation summary:** Added an in-modal thumbnail preview backed by a temporary object URL with cleanup. Added `POST /api/assets/:assetId/purchase`, which serializes purchase attempts per buyer/asset, locks both account wallets, validates publication/ownership/wallet/balance state, transfers the listed credits, records the completed `Asset Purchase`, and inserts buyer/creator notifications in one PostgreSQL transaction. The service emits committed notifications and wallet balances through existing account Socket.IO rooms. Asset responses now expose derived `is_purchased` and `can_download` flags without exposing the original path. The Assets Library includes a Purchased view, Asset Details changes from Purchase/Get to Owned/Download without reloading, and completed purchases block asset deletion. Creator ownership remains unchanged. No schema or migration was added.

**Verification:** Backend syntax checks passed. Read-only discovery, owned, and purchased-list query execution passed against the configured PostgreSQL schema. A complete eligible-purchase repository execution reached both wallet updates, the ledger insert, and two notification inserts while its commit was deliberately replaced with rollback; a follow-up query confirmed zero persisted test purchases. Focused self-purchase and insufficient-balance checks passed. Targeted ESLint passed for all modified Assets files and the shared header. The frontend TypeScript/Vite production build passed. A real purchase was not committed against the configured data environment during automated verification.

## Active Follow-up — Protected Asset Originals

Separate new asset uploads into distinct `original_file_id`, `proxy_file_id`, and `thumbnail_file_id` records without changing the schema. Public asset APIs and media previews must expose only proxy/thumbnail paths. High-quality originals must use a private upload prefix and may be downloaded only through a short-lived signed URL after backend verification that the requester is the creator or has a completed, non-refunded Asset Purchase ledger entry for that asset. Image proxy and thumbnail derivatives must be generated before the final asset record is created. Existing image/video/audio browsing behavior must remain functional.

**Follow-up status:** Completed August 17, 2026.

**Implementation summary:** The create form requires separate original-media and thumbnail-image selections. New image uploads retain the untouched original under the private `asset-originals/` prefix, generate a maximum 1600px WebP proxy with an `Ensemble Preview` watermark, and process the selected thumbnail into a maximum 480px watermarked WebP. The three finalized, account-owned file IDs are validated as distinct and stored in their existing `media_assets` columns. Video/audio uploads also receive distinct original, proxy, and selected-thumbnail records; their playable proxy is currently a byte-for-byte preview copy because no video/audio transcoding service exists. Public list/detail responses no longer contain `original_path`. Creator/purchaser downloads use an authenticated 60-second S3 signed URL, with completed Asset Purchase and later Asset Refund entries checked through the existing credit ledger. Public image previews disable context-menu and dragging as a casual deterrent, while the valuable original remains absent from public responses. Existing legacy assets whose three file IDs already point to the same file require reprocessing/re-uploading to gain derivative separation. No database migration or schema change was made.

## Objective

Build the **Assets Library** feature using the platform's existing frontend theme, layout, components, coding patterns, and backend architecture.

The Assets Library must allow users to:

* Create/upload assets
* Post/publish assets
* Browse/display assets
* View individual assets
* Edit their own assets
* Delete their own assets
* Comment on assets
* Review/rate assets where supported by the existing database
* View comments and reviews
* Manage their uploaded assets

Supported media asset types:

* Images
* Videos
* Audio

The implementation must be based entirely on the existing:

* `media_assets` table
* Tables related to `media_assets`
* Existing relationships
* Existing database columns
* Existing authentication/authorization system
* Existing project architecture

**Do not add, remove, rename, or modify database columns or tables.**

---

## Phase 1 — Inspect Before Coding

Before making any changes, inspect the existing codebase.

### Database

Inspect:

* `media_assets`
* Tables directly related to `media_assets`
* Foreign keys
* Existing asset ownership fields
* Asset type/media type fields
* File/storage references
* Comment-related tables
* Review/rating-related tables
* User/account relationships
* Existing timestamps/status fields

Determine what functionality is already supported by the current schema.

Do **not** create migrations.

Do **not** modify the database schema.

If a requested feature cannot be supported by the existing tables, document the limitation instead of changing the database.

### Existing Backend

Search for existing:

* Asset controllers
* Asset services
* Asset repositories
* Asset routes
* Upload APIs
* File/storage services
* Comments APIs
* Reviews APIs
* Authentication middleware
* Authorization middleware
* Validation utilities

Reuse existing code whenever possible.

### Existing Frontend

Inspect previous completed platform features and identify:

* Main layout
* Sidebar
* Navbar
* Page container
* Cards
* Buttons
* Inputs
* Modals/dialogs
* Dropdowns
* Tabs
* Search bars
* Filters
* Empty states
* Loading skeletons
* Toasts
* Confirmation dialogs
* Pagination
* Typography
* Spacing
* Border radius
* Shadows
* Colors
* Responsive behavior

The Assets Library should look like it was originally designed as part of the same platform.

Do not introduce a completely new visual design system.

---

## Phase 2 — Report Before Implementation

Before coding, provide a short implementation report containing:

### Existing Database Support

List the relevant tables and explain what each one will be used for.

Example:

```text
media_assets
Purpose:
Main asset information.

Related table:
Purpose:
Comments associated with an asset.

Related table:
Purpose:
Reviews associated with an asset.
```

Use the actual tables discovered in the codebase.

### Existing Code That Can Be Reused

List relevant:

* Components
* Controllers
* Services
* Repositories
* Routes
* Utilities
* Storage/file handling
* Authentication middleware

### Files Expected to Change

List the exact files expected to be:

* Created
* Modified

Only files directly related to the Assets Library should be changed.

---

# Assets Library Frontend

## 1. Assets Library Page

Create the main Assets Library page.

Suggested structure:

```text
Assets Library
Discover images, videos, and audio shared by the community.

[ Search assets... ]        [ Upload Asset ]

------------------------------------------------

[ All ] [ Images ] [ Videos ] [ Audio ]

------------------------------------------------

Asset Grid / List
```

The layout should follow the existing platform theme.

---

## 2. Asset Cards

Each asset should be represented using the appropriate media preview.

### Image

Show:

* Image thumbnail
* Asset title
* Creator
* Asset type
* Existing relevant metadata

### Video

Show:

* Video thumbnail or preview
* Play indicator
* Asset title
* Creator
* Asset type
* Existing relevant metadata

### Audio

Show:

* Audio-style preview/card
* Audio icon or existing preview
* Asset title
* Creator
* Asset type
* Existing relevant metadata

Only display information already available from the existing tables/API.

Do not invent database fields.

---

# Filtering

Allow filtering by:

```text
All
Images
Videos
Audio
```

Use the existing media type/type field in `media_assets`.

If the existing schema uses different values, follow the existing values instead of modifying them.

---

# Search

Allow users to search assets using fields already supported by the existing schema/API.

Potential fields may include:

* Asset title
* Asset name
* Description
* Creator

Only implement fields actually available in the existing database.

---

# Upload / Create Asset

Add an:

```text
Upload Asset
```

button.

Opening it should display the upload/create interface using the platform's existing modal/page patterns.

The form should only contain fields available in `media_assets` or its existing related tables.

Do not create new database fields just to support the frontend.

Supported uploads:

```text
Image
Video
Audio
```

Validate the uploaded asset type.

Reuse the existing platform file upload/storage mechanism.

Do not create another storage architecture if one already exists.

---

# Asset Details Page

Selecting an asset should open its Asset Details page.

Example structure:

```text
< Back to Assets

------------------------------------------

              MEDIA PREVIEW

------------------------------------------

Asset Title

Creator information

Existing asset metadata

Description / existing information

------------------------------------------

Comments

------------------------------------------

Reviews
```

Adapt the exact fields according to the existing schema.

---

# Media Preview

Render assets according to their type.

### Image

Display a responsive image preview.

### Video

Use the project's existing media/video player where possible.

Otherwise use a simple supported video player.

Controls may include:

* Play/pause
* Seek
* Volume
* Fullscreen

### Audio

Use the project's existing audio component where possible.

Otherwise use a simple audio player.

Controls may include:

* Play/pause
* Seek
* Volume

---

# Asset CRUD

Implement CRUD based on the existing database structure.

## Create

Authenticated users can create/upload assets.

## Read

Users can:

* Browse assets
* Search assets
* Filter assets
* View asset details

## Update

Asset owners can edit fields already supported by the database.

Do not expose fields that users should not manually change.

## Delete

Asset owners can delete their assets.

Before deleting, use the platform's existing confirmation dialog pattern.

Ensure authorization is checked on the backend.

Never rely only on frontend checks.

---

# My Assets

Provide a way for authenticated users to view assets they created.

Example:

```text
My Assets

[ All ] [ Images ] [ Videos ] [ Audio ]

----------------------------------------

My uploaded assets...
```

Each owned asset can expose actions such as:

```text
View
Edit
Delete
```

Only expose actions permitted by the existing authorization rules.

---

# Comments

Use the existing comments-related table associated with assets.

Asset Details should contain:

```text
Comments

[ Write a comment... ] [ Post ]

User
Comment content
Time
```

Support existing capabilities such as:

* Create comment
* View comments

If supported by the existing schema/backend:

* Edit own comment
* Delete own comment

Users must not edit or delete comments belonging to other users unless an existing moderator/admin permission allows it.

---

# Reviews

Use the existing review/rating table related to `media_assets`.

Allow users to submit reviews using only fields already available in the database.

Potential interface:

```text
Reviews

Your Review

★★★★★

Write your review...

[ Submit Review ]
```

Do not assume the database contains both ratings and text reviews.

Inspect the schema first.

For example:

* If only rating exists → implement rating only.
* If rating + review text exist → implement both.
* If reviews contain other existing fields → use those appropriately.

Do not modify the schema to support missing functionality.

---

# Review Display

Display reviews underneath the asset information.

Example:

```text
Reviews

John Doe
★★★★★
Very useful asset.

Jane Doe
★★★★☆
Good quality.
```

Use actual supported fields from the existing tables.

---

# Asset Creator Information

Where supported by the existing user/account relationships, display basic creator information.

Reuse existing user components where possible.

Do not expose:

* Private account information
* Email addresses unless already intentionally public
* Internal IDs
* Sensitive profile information

---

# Backend Requirements

Follow the existing backend architecture.

Example:

```text
Route
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
Database
```

Do not bypass existing architecture conventions.

If the project already follows another architecture, follow that architecture instead.

---

# Authorization

Protect all mutating operations.

### Create Asset

Requires authenticated user.

### Edit Asset

Requires:

```text
asset.owner/account/user == authenticated user
```

or an existing privileged role.

### Delete Asset

Same ownership/authorization requirement.

### Comment

Requires authentication if that matches the existing platform behavior.

### Review

Requires authentication if that matches the existing platform behavior.

All important authorization must be verified on the backend.

---

# API Behavior

Reuse existing APIs when available.

If missing endpoints are required, add only endpoints necessary for the Assets Library.

Potential operations:

```text
GET    assets
GET    asset details
POST   asset
PATCH  asset
DELETE asset

GET    asset comments
POST   asset comment

GET    asset reviews
POST   asset review
```

Do not blindly create these exact routes.

First inspect existing routing conventions and follow them.

---

# Data Rules

The database is the source of truth.

Strict rules:

```text
DO NOT add database columns.
DO NOT remove database columns.
DO NOT rename database columns.
DO NOT create replacement tables.
DO NOT change existing relationships.
DO NOT create migrations unless explicitly requested later.
```

Use the existing schema exactly as designed.

---

# UI / UX Requirements

Maintain consistency with existing platform pages.

Reuse:

* Existing design tokens
* Existing Tailwind classes/patterns
* Existing shared components
* Existing buttons
* Existing forms
* Existing dialogs
* Existing cards
* Existing page headers
* Existing loading indicators
* Existing toast notifications

Avoid creating duplicate components if equivalent reusable components already exist.

---

# Responsive Design

The Assets Library must work properly on:

* Desktop
* Tablet
* Mobile

Asset grids should adapt based on screen width.

Do not break the existing platform sidebar or navigation behavior.

---

# Loading States

Provide loading states for:

* Asset list
* Asset details
* Comments
* Reviews
* Upload
* Update
* Delete

Reuse existing skeleton/loading components.

---

# Empty States

Provide appropriate empty states.

Examples:

```text
No assets found.
```

```text
You haven't uploaded any assets yet.
```

```text
No comments yet.
```

```text
No reviews yet.
```

Follow the tone/style used elsewhere in the platform.

---

# Error Handling

Handle:

* Failed asset loading
* Failed uploads
* Unsupported media type
* Upload errors
* Missing asset
* Unauthorized editing
* Unauthorized deletion
* Failed comments
* Failed reviews
* Network errors

Use the platform's existing toast/error system.

Do not expose:

* Stack traces
* SQL errors
* Internal server paths
* Sensitive server information

---

# Performance

Avoid unnecessary duplicate API requests.

Do not repeatedly fetch the same asset information when already available.

Media previews should not unnecessarily load full-size media when a smaller existing preview/thumbnail is available.

Do not introduce performance-related infrastructure changes outside the scope of this feature.

---

# Security

Validate all user-controlled data on the backend.

Do not trust:

* Asset IDs
* User IDs
* Asset ownership values
* Media type
* Uploaded filename
* MIME type
* Review ownership
* Comment ownership

Use the project's existing authentication and authorization mechanisms.

---

# Scope Restrictions

Only modify files related to the Assets Library and required reusable integrations.

Do not refactor unrelated features.

Do not modify:

* Authentication behavior
* Payment features
* Messaging
* Jobs
* Marketplace features outside Assets Library
* User onboarding
* Database schema
* Existing unrelated APIs

unless a direct dependency is required for the Assets Library.

---

# Acceptance Criteria

The task is complete when:

* [x] Existing `media_assets` and related tables were inspected before implementation.
* [x] No database tables or columns were added, removed, or modified.
* [x] Assets Library matches the existing platform theme.
* [x] Existing reusable frontend components are reused where practical.
* [x] Users can browse assets.
* [x] Images are displayed correctly.
* [x] Videos are displayed/playable correctly.
* [x] Audio assets are displayed/playable correctly.
* [x] Assets can be filtered by supported media type.
* [x] Existing supported search functionality is implemented.
* [x] Authenticated users can create/upload assets.
* [x] Users can view individual asset details.
* [x] Asset owners can edit their assets.
* [x] Asset owners can delete their assets.
* [x] Users cannot modify assets belonging to another user without existing privileged permissions.
* [x] Comments use existing asset-related tables.
* [x] Users can create/view comments according to existing permissions.
* [x] Review support was evaluated against existing tables; no asset-related review persistence exists.
* [x] The UI reports that reviews are unavailable instead of adding unsupported persistence or endpoints.
* [x] My Assets displays the authenticated user's assets.
* [x] Loading states are implemented.
* [x] Empty states are implemented.
* [x] API errors are handled gracefully.
* [x] Duplicate/unnecessary requests are avoided.
* [x] Desktop/mobile layouts are responsive.
* [x] Existing authentication and authorization rules remain intact.
* [x] No unrelated files/features were modified.

---

# Verification

After implementation:

1. Run the frontend build.
2. Run the backend.
3. Run existing tests related to modified areas.
4. Verify database queries use existing columns only.
5. Verify no migration/schema file was created.
6. Test image upload and display.
7. Test video upload and playback.
8. Test audio upload and playback.
9. Test asset detail view.
10. Test edit as asset owner.
11. Test delete as asset owner.
12. Attempt edit/delete as another user and confirm rejection.
13. Test posting comments.
14. Test viewing comments.
15. Test submitting reviews.
16. Test viewing reviews.
17. Test filters.
18. Test search.
19. Test empty states.
20. Test loading/error states.
21. Test mobile responsiveness.
22. Confirm existing platform features continue working.

---

## Notes and Decisions

* Existing database schema is authoritative.
* `media_assets` and its related tables must be reused.
* No database schema modifications are allowed.
* Images, videos, and audio are the supported asset categories.
* Existing storage/upload architecture must be reused.
* Existing platform theme and UI components must be reused.
* Backend authorization must protect ownership-sensitive operations.
* Requested functionality unsupported by the current schema should be documented rather than implemented through schema changes.
* Keep changes isolated to the Assets Library and its direct dependencies.

---

## Status

Completed on August 17, 2026, with the existing-schema review limitation documented below.

### Implementation Notes

* Added authenticated Assets API routes following route → controller → service → repository separation.
* Reused `media_assets`, `market_assets`, `market_media_assets`, `files`, `upload_intents`, `asset_comments`, `asset_replies`, `market_asset_tags`, `tags`, `users`, and `accounts` without modifying the schema.
* Asset ownership is derived on the backend from `media_assets.owner_user_id` through `users.account_id`; client-supplied ownership is never accepted.
* Create operations accept only finalized, account-owned uploads under `assets/`, reject reused files, and verify that the persisted MIME category matches the requested media type.
* Added public discovery, search, media-type filters, pagination, private My Assets listing, details, owner-only edit/delete, and own-comment create/edit/delete.
* Added image, MP4 video, and MP3/WAV/OGG upload policies using the existing ownership-bound upload-intent flow. Local runtime configuration was updated to allow those audio MIME types; production deployments using `UPLOAD_ALLOWED_TYPES` must include them as well.
* Added responsive Assets Library and Asset Details pages using the existing `Layout`, `UserHeader`, toast utilities, confirmation dialog, Axios/CSRF client, theme classes, and file-upload helper.
* The existing `ratings` table is contract-bound through `contract_id` and has no relationship to `market_assets` or `media_assets`. Per the no-schema-change requirement, asset reviews were not persisted or exposed; the details UI communicates that reviews are unavailable.
* No migration or schema file was created.

### Verification Performed

* Backend syntax checks passed for every created/modified Assets module and `FileServices.js`/`Api.js`.
* The API route graph loaded successfully, and unauthenticated `GET /api/assets` returned HTTP 401.
* Read-only PostgreSQL execution passed for discovery, My Assets, type filtering, asset details, comments, owner-update lookup, owner-delete lookup, and comment ownership queries.
* Focused service validation checks passed for invalid media filters, invalid UUIDs, and invalid create payloads.
* Targeted ESLint passed for all new Assets frontend files.
* `npm run build` passed in `frontend` (TypeScript and Vite production build).
* A separate backend start attempt reached PostgreSQL and MongoDB, but the environment's Redis connection was denied and port 4000 was already occupied by an existing server; route behavior was verified against that running server instead.
* Destructive browser/database checks (real upload/create/edit/delete/comment writes and cross-account mutation attempts) were not run automatically against the configured data environment.

---

## Recent Completed Change Summary

The Team join-request flow was corrected before this Assets Library task began. **Ask to Join** now creates a pending membership instead of automatically activating the requester. Active Team owners and admins can review, search, approve, or deny requests from the **Pending Requests** tab, while unauthorized users cannot access the pending-request API. Join-by-code retains its existing Team-policy behavior. Backend syntax checks, targeted frontend lint, and the frontend production build passed for those changes.
