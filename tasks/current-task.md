# Current Task: Profile budget

## Objective
Let users set, edit, and clear a budget (whole platform credits) on their own profile, shown publicly in the profile header stats row for later use.

## Acceptance Criteria
- `accounts.budget_credits` is a nullable integer with a non-negative check, added by a new reversible migration.
- `PUT /api/accounts/profile/budget` updates only the signed-in account; the backend rejects non-integers, negatives, and values above 100,000,000.
- The profile API returns `budget_credits`; the header shows "Budget: N credits" after Freelance Rating.
- Owners can set, edit, and remove the budget inline; visitors see it only when set.
- `cd frontend && npm run build` passes.
