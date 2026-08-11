# Current Task

## Objective

Refactor the account onboarding flow so that onboarding data is **not permanently written to the database after every step**.

The onboarding flow must temporarily store the user's progress and entered onboarding data in the application's existing **server-side session / Redis session storage** while onboarding is in progress.

Only when the user successfully completes the **final onboarding step** should the accumulated onboarding data be validated and permanently saved to the appropriate database tables.

The application must also enforce onboarding for authenticated users whose onboarding has not yet been completed.

The database source of truth for onboarding completion is:

```text
users.completed_onboarding = 'completed'
```

If the authenticated user's `completed_onboarding` value is anything other than `completed`, the user must be required to continue or complete onboarding before accessing protected application areas.

The onboarding session must additionally track the user's current onboarding step so that refreshing the browser, closing/reopening the page while the session remains valid, or navigating back to onboarding does not reset the user to the first step.

---

# Scope

## Frontend

Primary onboarding directory:

```text
E:\EnsembleV2\Ensemble\frontend\src\pages\setup_account
```

Treat the pages/components inside this directory as the existing onboarding flow.

Inspect the directory first and determine:

* all onboarding pages
* onboarding step order
* existing forms
* existing API requests
* current navigation logic
* current database-saving behavior
* existing onboarding guards
* existing authentication/session handling

Do not assume the number or order of onboarding steps. Derive them from the current implementation.

Modify only onboarding-related frontend code and directly related authentication/navigation code where necessary.

---

## Backend

Trace the APIs currently called by:

```text
frontend/src/pages/setup_account
```

Identify their:

```text
route
→ controller
→ service
→ repository
→ database
```

execution paths.

Refactor the relevant onboarding APIs so intermediate onboarding steps store temporary state in the existing server-side session / Redis infrastructure instead of permanently updating onboarding-related database records.

Reuse the project's existing Redis/session infrastructure.

Do not introduce a second Redis client, duplicate session implementation, or new state-management system if an existing implementation can support this feature.

---

## Database

Inspect the existing `users` table and onboarding-related tables.

The existing column:

```text
users.completed_onboarding
```

must remain the authoritative persistent indicator of whether onboarding has been completed.

Completed state:

```text
completed_onboarding = 'completed'
```

Do not change the existing database schema unless absolutely necessary.

Intermediate onboarding progress must NOT require a new database table if Redis/session can support it.

---

## Redis / Session

Store temporary onboarding state server-side.

Use a structure conceptually equivalent to:

```text
onboarding:{user_id}
```

or integrate the state into the project's existing authenticated session structure if that better matches the current architecture.

The temporary onboarding state should contain at minimum:

```text
{
  current_step: <step identifier>,
  data: {
    ...accumulated onboarding fields
  },
  updated_at: <timestamp>
}
```

The exact Redis/session representation should follow existing project conventions.

Do not store sensitive information unnecessarily.

Do not trust client-provided user IDs for identifying the onboarding owner. Derive the user/account identity from the authenticated server-side request context.

---

# Required Onboarding Flow

The intended architecture is:

```text
Authenticated User
        |
        v
Check users.completed_onboarding
        |
        +----------------------------+
        |                            |
   "completed"                 not "completed"
        |                            |
        v                            v
Normal Application             Onboarding
                                     |
                                     v
                              Load Session State
                                     |
                         +-----------+-----------+
                         |                       |
                    state exists             no state
                         |                       |
                         v                       v
                    Resume Step              Step 1
                         |
                         v
                 User submits a step
                         |
                         v
               Validate submitted data
                         |
                         v
                 Save to Redis/session
                         |
                         v
                Update current_step
                         |
                         v
                    Next Step
                         |
                         v
                     ...
                         |
                         v
                    Final Step
                         |
                         v
              Validate complete payload
                         |
                         v
                Database Transaction
                         |
              +----------+----------+
              |                     |
           SUCCESS                FAILURE
              |                     |
              v                     v
      Save onboarding data      Rollback DB
              |                 Keep session
              v                     |
users.completed_onboarding           v
        = 'completed'           Return error
              |
              v
      Commit transaction
              |
              v
    Delete onboarding session
              |
              v
       Enter Application
```

---

# Intermediate Step Behavior

When a user completes an onboarding step:

1. Validate the submitted fields server-side.
2. Retrieve the existing onboarding state from session/Redis.
3. Merge only the fields belonging to that onboarding step.
4. Save the updated onboarding data back to session/Redis.
5. Record the next/current onboarding step.
6. Return the updated onboarding progress to the frontend.
7. Do NOT permanently save the onboarding form data to onboarding-related database tables yet.

Example:

```text
Step 1
POST onboarding data
→ validate
→ Redis/session
→ current_step = 2

Step 2
POST onboarding data
→ validate
→ merge with Step 1 state
→ Redis/session
→ current_step = 3
```

Continue using this pattern until the final step.

---

# Refresh / Resume Behavior

Refreshing the onboarding page must NOT reset onboarding progress.

For example:

```text
User completes Step 1
→ session current_step = 2

User is currently on Step 2
→ refreshes browser

Application requests onboarding state
→ server returns current_step = 2
→ frontend restores Step 2
```

The frontend must not rely exclusively on React/component state for determining onboarding progress.

The server-side session/Redis state is authoritative for **in-progress onboarding progress**.

Provide or reuse an endpoint conceptually similar to:

```text
GET /api/onboarding/state
```

that returns the authenticated user's current onboarding progress.

Reuse an existing endpoint if the project already has equivalent functionality rather than creating unnecessary duplicate routes.

The response should conceptually contain:

```json
{
  "completed": false,
  "current_step": 2,
  "data": {}
}
```

Only return previously entered onboarding fields to the frontend when they are actually required to restore the forms.

Never return sensitive server-only session information.

---

# Onboarding Access Enforcement

Authenticated users must not be able to bypass required onboarding simply by manually navigating to another frontend route.

On authentication/session restoration, determine the user's onboarding status using:

```text
users.completed_onboarding
```

Expected behavior:

```text
completed_onboarding === 'completed'
→ allow normal authenticated application routes

completed_onboarding !== 'completed'
→ require onboarding
```

When onboarding is required:

```text
/setup_account/...
```

must be the allowed onboarding area.

Attempts to navigate to protected application pages should redirect the user back to the appropriate onboarding step.

Do not create redirect loops.

Public routes such as login, registration, authentication callbacks, and other legitimately public routes must continue functioning.

---

# Backend Enforcement

Do not rely solely on frontend route guards for security or business-rule enforcement.

Inspect authenticated backend endpoints that should only be available after onboarding.

Where appropriate, reuse or implement centralized middleware equivalent to:

```text
requireCompletedOnboarding
```

Conceptual behavior:

```text
if user.completed_onboarding !== 'completed':
    reject access with an appropriate onboarding-required response
```

Do not blindly attach this middleware to every authenticated endpoint.

Onboarding APIs themselves, logout/session APIs, authentication-related endpoints, and other endpoints required to complete onboarding must remain accessible.

Prefer centralized middleware/route-group enforcement over duplicating the same check across controllers.

---

# Final Step

The final onboarding submission is the only point where the accumulated onboarding data should be permanently persisted.

Required flow:

```text
Retrieve onboarding state
        ↓
Verify all required steps/data
        ↓
Validate complete payload
        ↓
Begin database transaction
        ↓
Persist onboarding-related records
        ↓
Set users.completed_onboarding = 'completed'
        ↓
Commit transaction
        ↓
Clear onboarding Redis/session state
```

The database writes and `completed_onboarding` update must occur within an appropriate transaction when multiple related writes are involved.

The user must not be marked as completed before all required onboarding persistence succeeds.

---

# Failure Handling

If final persistence fails:

```text
database error
      ↓
rollback transaction
      ↓
DO NOT set completed_onboarding = 'completed'
      ↓
DO NOT delete onboarding Redis/session state
      ↓
return appropriate error
```

This allows the user to retry without losing all previously entered onboarding information.

If Redis/session temporarily fails during an intermediate step:

* return an appropriate server error
* do not pretend the step was successfully saved
* do not advance the frontend to the next step unless progress was actually stored

Do not silently fall back to partially writing onboarding data to the database.

---

# Session Lifecycle

The onboarding temporary state should:

* belong only to the authenticated user
* survive normal page refreshes
* follow the existing session/Redis expiration strategy where appropriate
* not be readable by another user
* be deleted after successful onboarding completion
* be invalidated appropriately if the project's authentication/session lifecycle requires it

Do not delete onboarding progress merely because the browser refreshes.

If the user logs out and later logs back in while the onboarding state still legitimately exists, resume behavior should follow the existing Redis/session architecture and security model.

---

# Existing User Compatibility

Existing users with:

```text
completed_onboarding = 'completed'
```

must not be forced through onboarding again.

Users whose value is:

```text
NULL
```

or any value other than:

```text
completed
```

must be treated as not having completed onboarding unless the existing schema/application explicitly defines another equivalent completed state.

Do not modify existing completed users' onboarding records unnecessarily.

---

# Acceptance Criteria

## 1. No intermediate database persistence

Completing Step 1, Step 2, or any non-final onboarding step must not permanently save the onboarding form data to its final database tables.

Temporary data must exist only in the approved server-side session/Redis state.

---

## 2. Progress survives refresh

Given:

```text
current_step = 2
```

When the user refreshes the page:

```text
expected → Step 2
incorrect → Step 1
```

The same requirement applies to every onboarding step.

---

## 3. Previous information is recoverable

When navigating backward to a previous onboarding step, previously entered information should be restored from onboarding state where appropriate.

The user should not have to re-enter information solely because they moved between onboarding steps.

---

## 4. Incomplete users cannot bypass onboarding

Given:

```text
users.completed_onboarding != 'completed'
```

Attempting to access a protected application route must require/redirect the user to onboarding.

---

## 5. Completed users bypass onboarding

Given:

```text
users.completed_onboarding = 'completed'
```

The user must enter the normal application and must not be unnecessarily redirected to onboarding.

---

## 6. Final step persists atomically

Successful final onboarding must:

```text
persist all required onboarding data
+
set completed_onboarding = 'completed'
+
commit
```

Only after successful persistence should temporary onboarding state be removed.

---

## 7. Failed final submission preserves progress

If final persistence fails:

```text
completed_onboarding != 'completed'
onboarding Redis/session state still exists
database transaction rolled back
```

The user must be able to retry.

---

## 8. Security

Verify that:

* one user cannot access another user's onboarding state
* client-supplied user IDs cannot override authenticated identity
* onboarding cannot be marked completed from the frontend alone
* users cannot skip required onboarding steps by manipulating route URLs
* protected backend functionality cannot be trivially bypassed through direct API requests

---

# Required Investigation

Before modifying code:

1. Read the project-level agent instructions.
2. Inspect:

```text
E:\EnsembleV2\Ensemble\frontend\src\pages\setup_account
```

3. Enumerate the actual onboarding pages and determine their order.
4. Trace every onboarding API call to its backend implementation.
5. Identify where intermediate onboarding data is currently written to PostgreSQL.
6. Identify the existing authentication/session implementation.
7. Identify the existing Redis client and session utilities.
8. Identify where `users.completed_onboarding` is currently read and updated.
9. Identify frontend authenticated route guards.
10. Identify backend routes that require completed onboarding.
11. Determine the smallest safe refactor.

Do not read unrelated documentation or scan unrelated features unless required by these execution paths.

---

# Implementation Constraints

* Do not rewrite the entire onboarding system.
* Do not modify unrelated features.
* Do not change unrelated database tables.
* Do not create duplicate Redis infrastructure.
* Do not introduce unnecessary dependencies.
* Preserve existing UI and styling unless a UI change is necessary for correct onboarding behavior.
* Preserve existing authentication behavior.
* Preserve existing API response contracts where reasonably possible.
* Prefer existing controllers/services/repositories/middleware patterns.
* Keep database access inside the project's existing repository/data-access layer.
* Keep business logic in the appropriate service layer.
* Keep controllers thin.
* Do not trust onboarding state supplied entirely by the frontend.
* Make the smallest production-safe change.

---

# Verification

Run the project's existing relevant build/test/lint commands discovered from `package.json` and existing project configuration.

At minimum manually verify:

```text
NEW/INCOMPLETE USER
login
→ onboarding Step 1
→ submit
→ Step 2
→ refresh
→ remains Step 2
→ continue
→ refresh
→ remains correct step
→ final submit
→ database records created/updated
→ completed_onboarding = 'completed'
→ onboarding session removed
→ application accessible
```

Verify bypass prevention:

```text
incomplete user
→ manually navigate to protected route
→ redirected/rejected to onboarding
```

Verify completed user:

```text
completed user
→ login
→ normal application
→ no onboarding redirect
```

Verify final failure:

```text
simulate/trigger persistence failure
→ transaction rollback
→ completed_onboarding remains incomplete
→ onboarding session remains available
→ retry remains possible
```

Also verify:

```text
npm build/test/lint commands as supported by project
```

Do not claim a command passed unless it was actually executed successfully.

---

# Notes and Decisions

## Source of Truth

Persistent onboarding completion:

```text
PostgreSQL
users.completed_onboarding
```

Completed value:

```text
'completed'
```

In-progress onboarding state:

```text
Redis / server-side session
```

Frontend state is only a presentation layer and must not be the authoritative source of onboarding progress.

---

## Persistence Strategy

Use:

```text
Intermediate steps
        ↓
Redis / Session

Final step
        ↓
Database transaction
        ↓
completed_onboarding = 'completed'
        ↓
clear temporary state
```

Do NOT use:

```text
Step 1 → DB
Step 2 → DB
Step 3 → DB
Step 4 → DB
```

unless a particular database operation is independently required by the existing system and cannot safely be deferred. Any such exception must be documented in the final report with justification.

---

## Context Policy

Follow the repository's project-level agent instructions.

Use progressive context discovery.

Start from:

```text
frontend/src/pages/setup_account
```

and trace only the relevant frontend → API → backend → database/session execution paths.

Do not reread all project markdown documentation.

Load only documentation directly relevant to:

* onboarding
* authentication
* sessions
* Redis
* users
* routing

Expand scope only when a direct dependency requires it.

---

# Final Report Required

After implementation, report:

## Root Cause

Explain why onboarding previously persisted data after every step and why progress could not reliably resume after refresh.

## Previous Flow

Document the discovered original flow.

## New Flow

Document the implemented:

```text
Frontend
→ API
→ Redis/session
→ final submission
→ database transaction
```

flow.

## Files Changed

List every modified/created file and why it was necessary.

## Redis / Session Changes

Document:

* state structure
* key/session naming
* expiration behavior
* current-step handling
* cleanup behavior

Do not expose secrets or actual session credentials.

## Database Changes

Document all persistence changes and confirm whether a migration was required.

## Route Protection

Document how incomplete users are prevented from bypassing onboarding on both frontend and relevant backend paths.

## Tests Performed

List the commands and manual scenarios actually executed.

## Remaining Risks

Document unresolved issues or edge cases instead of hiding them.

## Status

Set exactly one:

```text
COMPLETED
PARTIAL
BLOCKED
```

Include the reason when status is `PARTIAL` or `BLOCKED`.

---

# Implementation Report

## Root Cause

Each onboarding page independently called existing profile/user/survey endpoints that immediately wrote to PostgreSQL. Personal details updated `users`, avatar selection updated `accounts` and file tables, survey submission inserted responses/purposes, and a separate frontend request changed `completed_onboarding`. Survey sub-step progress lived only in React state, so refresh reset it. Existing route checks interpreted intermediate database values inconsistently and did not centrally protect application APIs.

## Previous Flow

1. Email verification created the base account/user and authenticated session.
2. Personal details wrote directly to `users`.
3. Avatar metadata/preset selection wrote directly to `files`, `account_profile_files`, and `accounts`.
4. The frontend wrote `completed_onboarding = 'profile'`.
5. Survey responses and platform purposes were committed in a separate transaction.
6. The frontend separately wrote `completed_onboarding = 'completed'`.
7. Survey sub-step state was not recoverable after refresh.

## New Flow

1. Authenticated onboarding pages load `GET /api/onboarding/state`.
2. Personal details, avatar metadata/preset ID, survey answers, and `current_step` are validated and stored under the authenticated user's Redis key.
3. Refresh and Back navigation restore both data and the authoritative current step.
4. Final survey submission is validated against the server-side survey catalog.
5. One PostgreSQL transaction writes personal details, avatar records/selection, survey responses, platform purposes, and finally `users.completed_onboarding = 'completed'`.
6. Any database failure rolls back the transaction and leaves Redis progress intact.
7. Redis onboarding state is deleted only after the transaction commits.

## Files Changed

- `backend/routes/Api.js`: mounts onboarding routes and centralized onboarding enforcement.
- `backend/routes/Onboarding.js`: authenticated state/step/finalization endpoints.
- `backend/controllers/OnboardingControllers.js`: thin HTTP adapters and safe errors.
- `backend/services/OnboardingServices.js`: validation, Redis state, step sequencing, survey validation, and completion orchestration.
- `backend/repositories/OnboardingRepositories.js`: completion reads and atomic final PostgreSQL transaction.
- `backend/middleware/RequireCompletedOnboarding.js`: rejects protected API access for incomplete authenticated users while allowing required onboarding/auth dependencies.
- `frontend/src/App.tsx`: places authenticated onboarding pages behind the existing route middleware; email verification remains public.
- `frontend/src/lib/RouteMiddleware.ts`: resolves onboarding state and redirects incomplete/completed users appropriately.
- `frontend/src/pages/setup_account/01_PersonalDetails.tsx`: restores/saves Redis onboarding data instead of PostgreSQL profile updates.
- `frontend/src/pages/setup_account/02_UploadImage.tsx`: restores/saves avatar choice/metadata without intermediate database writes.
- `frontend/src/pages/setup_account/04_Survey.tsx`: persists section progress, restores answers/sub-step, and uses atomic finalization.

## Redis / Session Changes

- Key: `onboarding:{userId}`; the user ID always comes from `req.session`.
- TTL: 30 days, matching the existing authenticated session lifetime.
- Shape: `{ current_step, data: { personal_details, avatar, survey }, updated_at }`.
- Steps: `personal_details`, `avatar`, `survey_1`, `survey_2`.
- Validated backward step changes preserve entered data.
- Successful final completion deletes the key; rejected/failed completion preserves it.
- No credentials, tokens, or passwords are stored in onboarding state.

## Database Changes

- No schema migration was required.
- Intermediate onboarding endpoints perform no PostgreSQL writes.
- The final transaction updates `users`, persists/chooses the avatar, inserts survey responses and platform purposes, and sets `completed_onboarding = 'completed'` last within the same transaction.

## Route Protection

- Frontend: authenticated users resolve server onboarding state before protected content renders. Incomplete users are redirected to the server-provided onboarding path; completed users entering setup routes are redirected to `/home`.
- Backend: centralized middleware checks the database completion value for authenticated `User` sessions and returns `403 ONBOARDING_REQUIRED` for protected APIs. Authentication/session endpoints and the small set of APIs required for onboarding remain available.
- Final completion and all state access derive identity from the authenticated session; client user IDs are ignored.

## Tests Performed

- `npm.cmd run build` in `frontend`: passed (`tsc --noEmit` and Vite production build).
- `node --check` on every new/changed backend onboarding JavaScript file: passed.
- Focused in-memory Redis script: passed step advancement, refresh-style state reads, cross-user key isolation, backward navigation without data loss, and cleanup.
- Focused final-failure script with the real survey catalog: passed; invalid final submission was rejected and Redis progress remained.
- Focused PostgreSQL rollback script using a nonexistent user in the final repository transaction: passed; the transaction failed and rolled back without creating a user.
- Full `npm run lint`: failed on the repository baseline with 517 problems (479 errors, 38 warnings), including many unrelated files. No claim is made that full lint passes.
- Targeted onboarding-file lint also reports existing style/type issues in the touched legacy files; the TypeScript production build passes.

## Remaining Risks

- Custom avatar uploads now use a server-issued, authenticated-user-owned key under `profile/onboarding/{userId}/...`. Redis records the exact issued metadata and the avatar step rejects foreign or fabricated keys. A daily bounded cleanup removes objects older than the onboarding TTL only when their paths are not referenced by the `files` table.
- A full browser-driven successful onboarding against a disposable user was not executed because it would create permanent account/profile/survey data. The Redis, failure preservation, transaction rollback, syntax, and production build paths were verified independently.
- Centralized enforcement performs a completion lookup for authenticated user API requests; if traffic warrants it, a carefully invalidated completion cache may be added later without changing the source of truth.

## Follow-up Implementation

- Added `POST /api/onboarding/avatar-upload-url`; it derives ownership from the authenticated session, saves the exact issued object metadata in Redis, and never accepts a client-provided owner.
- Custom avatar selection must match that Redis-issued name, path, MIME type, and size before onboarding can advance.
- Pending upload metadata is kept server-side and excluded from `GET /api/onboarding/state` responses.
- Added a daily S3 cleanup job for expired, unreferenced onboarding avatar objects, capped at 500 scanned keys per run.
- Replaced onboarding's legacy `/api/places` lookup with authenticated `GET /api/onboarding/addresses`, backed by Geoapify through the backend. The Geoapify key remains server-only.
- The personal-details address field now debounces requests, cancels stale requests, and maps Geoapify selections into address, country, and postal code.

## Follow-up Verification

- Backend `node --check` passed for the onboarding service/controller/route/repository, file service, and background job.
- `git diff --check` passed.
- Frontend `npm.cmd run build` passed after the Geoapify and secure-upload changes.
- Targeted ESLint for the two changed onboarding forms completed with 0 errors and 2 existing React hook dependency warnings.
- A live Geoapify/S3 integration request was not executed because it requires the running authenticated application and configured provider credentials; provider failures are returned without exposing keys.

## Redirect-loop Fix

- Fixed a stale onboarding-route cache in `RouteMiddleware`. The middleware now refreshes authoritative onboarding state on every route transition and records which route that result belongs to.
- Redirect enforcement is suspended until the state response matches the current route, preventing an old `/setup/personal-details` result from fighting a newer avatar, survey, or completed-state redirect.

## Status

COMPLETED
