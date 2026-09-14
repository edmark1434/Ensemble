# Current Task — Fix UserHeader Avatar Display from Database avatar_file_id

Ensure user header displays the user's actual database avatar associated with `avatar_file_id` / preset `path` instead of falling back to the Pravatar dataset URL.

## Acceptance Criteria

- [x] Identify root cause of Pravatar dataset fallback (`userAvatar = "https://i.pravatar.cc/150?u=john"` default prop, missing avatar joins in `UserRepositories.js`, and Vite path mismatch for `/public/p1.png`).
- [x] Update `backend/repositories/UserRepositories.js` (`getEmailandPasswordHashByEmail` & `getEmailandPasswordHashByUsername`) to join `files` on `avatar_file_id` and select `avatar_preset_url`.
- [x] Update `backend/controllers/UserControllers.js` (`loginCredentials` & `getCurrentUser`) to include `avatar_file_id` and hydrate `avatar_preset_url` from database.
- [x] Update `backend/controllers/ProfileControllers.js` (`getProfileCurrentAvatarByAccountIdController`) to safely handle `req.session?.account_id || req.session?.accountId`.
- [x] Update `frontend/src/components/nav/user_header.tsx`:
  - [x] Add `constructAvatarUrl` mapping `/public/p*.png` to `/profile_presets/p*.png`.
  - [x] Remove Pravatar default prop and replace with dynamic name-based avatar fallback.
  - [x] Format `initialAvatar` with `constructAvatarUrl`.
  - [x] Sync `userAvatarState` when global user state changes.
  - [x] Prevent image error infinite loops on `onError`.
- [x] Update `user_settings.tsx` and `Profile.tsx` `constructAvatarUrl` helpers to map preset avatars to `/profile_presets/`.
- [x] Verify frontend build passes with 0 errors (`npm run build`).

Status: Completed.

## Verification Results

### Frontend Build Verification
- Command: `cd frontend && npm run build`
- Output: `✓ built in 10.99s` with 0 errors.

### Backend Verification
- Syntax and imports verified across modified controllers and repositories.
