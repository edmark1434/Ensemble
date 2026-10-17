# Current Task: Limit Dropdown Height to ~3 Visible Items & Scroll Remainder

## Objective
Configure the dropdown selects on the "About you" onboarding step ("What is your nature of work?" & "Where did you hear about us?"):
1. **Support `maxVisibleItems` in `GlideSelect.tsx`**:
   - Added `maxVisibleItems` (defaulting to 3.25) and `menuMaxHeight` props to `GlideSelectProps`.
   - Calculated `maxHeight` dynamically based on row height and gap to show at least 3 items (`~3.25` rows so 3 are fully visible and the 4th subtly peeks out to provide a natural scroll indicator).
   - Applied custom theme-aware thin scrollbars (`.gs-listbox-scroll`) with zero native browser scrollbar styles.
   - Automatically scrolls the active/focused item into view when navigating via keyboard or opening to a preselected item.
2. **Applied in `04_Survey.tsx`**:
   - Configured `maxVisibleItems={3.25}` for the survey dropdown questions.
3. **Verification**:
   - Ran `cd frontend && npm run build` and verified 0 compilation/bundle errors.

## Acceptance Criteria
- [x] Dropdowns show at least 3 items cleanly with the remaining items scrollable.
- [x] Custom dark/light scrollbar is active and responsive.
- [x] Keyboard arrows scroll the listbox into view as options change.
- [x] `npm run build` passes with 0 errors.
