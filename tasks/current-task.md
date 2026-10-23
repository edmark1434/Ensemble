# Current Task: Improve Forum Feed Ranking

## Objective
Fix the forum discussion feed ranking (likes / comments / saves; no upvotes or downvotes) so each sort tab behaves distinctly and engagement is counted fairly.

## Changes
1. `backend/repositories/ForumDiscussionRepositories.js` (`feedScoreExpression`, `getPaginatedForumDiscussions`):
   - Weights changed to like = 1, comment = 3, save = 4.
   - Counts only unique users per action and excludes the discussion author.
   - Ignores soft-deleted comments.
   - Trending now only ranks discussions created in the last 7 days; Popular stays all-time.
   - `created_at` is converted with `$toDate` so discussions stored with string dates no longer crash the feed.
2. `frontend/src/pages/user/4_forums/Forums.tsx`: logged-out visitors now see the "Hot" sort instead of all-time "Popular".

## Acceptance Criteria
- [x] Trending and Popular return different rankings (Trending is limited to a 7-day window).
- [x] Author self-engagement, duplicate comments by one user, and deleted comments do not raise a post's score.
- [x] Saves weigh more than comments, comments more than likes.
- [x] Guests default to Hot.
- [x] All four feed types (latest, trending, popular, hot) run against the live MongoDB without errors.
- [x] `npm --prefix frontend run build` passes.
