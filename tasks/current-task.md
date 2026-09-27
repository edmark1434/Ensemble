# Current Task — Link Forum Discussion & Forum Group Member Tab Author Names to Profile

Allow users in Forums to click author/member names (in forum discussions, comment authors, and forum group member tab) and navigate directly to their profile page (`/profile/:id`).

## Implementation Objective
1. **Forum Discussion Author Linking**:
   - In discussion post cards across `Forums.tsx` and `SelectedGroup.tsx`, make the author name (and avatar) clickable buttons linking to `/profile/${authorAccountId}`.
   - In discussion comments across `Forums.tsx`, `SelectedGroup.tsx`, and `ExpandDiscussion.tsx`, make the comment author name (and avatar) clickable buttons linking to `/profile/${authorAccountId}`.
   - In expanded discussion view (`ExpandDiscussion.tsx`), make the main discussion author name (and avatar) clickable buttons linking to `/profile/${authorAccountId}`.
2. **Forum Group Member Tab Member Linking**:
   - In `SelectedGroup.tsx` under the "members" tab (`activeTab === "members"`), make each member's name (and avatar) clickable buttons linking to `/profile/${memberAccountId}`.
3. **Identity & Profile Resolution Support**:
   - Ensure `getPublicForumUserIdentities` and `getUserByListofIdsRepositories` in `backend/repositories/UserRepositories.js` select `account_id` so frontend identity parsers receive the account UUID needed for profile routing.
   - Update `identityFromDetails` in `frontend/src/pages/user/4_forums/forumIdentity.ts` to include `accountId`.
   - Update `attachDiscussionIdentities` call in `getForumDiscussionByIdServices` (`backend/services/ForumDiscussionServices.js`) so fetching a single discussion returns full author/comment identities.
   - Update `checkAccountId` and `checkUserAccountIdRepositories` in `backend/repositories/AccountRepositories.js` to also resolve by `users.user_id` in addition to `accounts.account_id`, providing resilient fallback if a user ID is passed.
   - Update `getProfileByAccountId` in `backend/repositories/ProfileRepositories.js` to support matching `account_id` or `user_id`.

## Acceptance Criteria
- [x] Group member tab in `SelectedGroup.tsx` links member names to profile page.
- [x] Discussion author names in `Forums.tsx` post cards link to author profile.
- [x] Discussion author names in `SelectedGroup.tsx` post cards link to author profile.
- [x] Discussion author name in `ExpandDiscussion.tsx` links to author profile.
- [x] Comment author names in `Forums.tsx`, `SelectedGroup.tsx`, and `ExpandDiscussion.tsx` link to author profile.
- [x] Backend identity endpoints attach `account_id`.
- [x] Frontend build succeeds without errors (`npm run build`).
