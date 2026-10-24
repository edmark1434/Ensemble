# Task: Proposal Identity Team Representation Avatar & Switch Team Icon

## Objectives
- Update the **Switch Team** button icon to `<Repeat />` from `lucide-react`.
- Fix the Team card avatar representation:
  - The card banner already displays the team's visual identity banner.
  - The overlapping avatar badge should be the proposing user's profile picture (`userAvatarUrl`) rather than a repeated team thumbnail with a nested sub-avatar badge.
- Strictly adhere to rule: Do not commit unless the user explicitly asks.

## Acceptance Criteria
- [x] Switch Team button icon changed to `<Repeat className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />`.
- [x] Removed overlapping dual avatar (team thumbnail + tiny proposer dot) from Team card.
- [x] Overlapping avatar on Team card now renders the proposing user's avatar (`userAvatarUrl`, fallback `getFallbackAvatarUrl(userName)`, alt `userName`) cleanly over the team banner.
- [x] `cd frontend && npm run build` compiles cleanly with zero errors.
- [x] No `git commit` performed (per user rule).
