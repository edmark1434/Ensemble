# Active Task: Profile Planned Budget Toast Notifications

## Implementation Objective

1. Add toast feedback when setting, updating, or clearing the Planned Budget on the profile page:
   - When a budget value is saved: show `toast.success("Planned budget updated to <credits> Credits!")`.
   - When a budget value is removed: show `toast.success("Planned budget removed.")`.
   - On error: display error toast `toast.error(...)`.
2. Connect both `RatingsBudgetSideSection_ProfileDisplay` and `ProfileSetupWidget` to the unified `handleSaveBudget` handler in `Profile.tsx`.

## Acceptance Criteria

- [x] Toast notification fires with the formatted credit amount upon saving the planned budget in [`Profile.tsx`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/7_profile/Profile.tsx).
- [x] Toast notification fires when clearing the budget.
- [x] Errors display a clear toast notification if the API call fails.
