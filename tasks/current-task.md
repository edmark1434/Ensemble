# Current Task

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

* [ ] Existing `media_assets` and related tables were inspected before implementation.
* [ ] No database tables or columns were added, removed, or modified.
* [ ] Assets Library matches the existing platform theme.
* [ ] Existing reusable frontend components are reused where practical.
* [ ] Users can browse assets.
* [ ] Images are displayed correctly.
* [ ] Videos are displayed/playable correctly.
* [ ] Audio assets are displayed/playable correctly.
* [ ] Assets can be filtered by supported media type.
* [ ] Existing supported search functionality is implemented.
* [ ] Authenticated users can create/upload assets.
* [ ] Users can view individual asset details.
* [ ] Asset owners can edit their assets.
* [ ] Asset owners can delete their assets.
* [ ] Users cannot modify assets belonging to another user without existing privileged permissions.
* [ ] Comments use existing asset-related tables.
* [ ] Users can create/view comments according to existing permissions.
* [ ] Reviews use existing asset-related tables.
* [ ] Users can create/view reviews according to existing schema capabilities.
* [ ] My Assets displays the authenticated user's assets.
* [ ] Loading states are implemented.
* [ ] Empty states are implemented.
* [ ] API errors are handled gracefully.
* [ ] Duplicate/unnecessary requests are avoided.
* [ ] Desktop/mobile layouts are responsive.
* [ ] Existing authentication and authorization rules remain intact.
* [ ] No unrelated files/features were modified.

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

Not started.
