# Current Task: Account Setup Vertical Stepper Layout

## Objective
Implement a unified split-screen setup wizard layout for the onboarding flow:
- **Left Column**: Vertical progress stepper displaying the 3 steps starting at Avatar Setup:
  1. **Profile Picture** ("Choose presets or upload photo")
  2. **Role & Purpose** ("Tell us what you're here to do")
  3. **Skills & Tools** ("Select your experience & software")
- Visual states for stepper:
  - **Completed**: Badge with checkmark icon and connected solid line.
  - **Active**: Highlighted badge with step number, crisp text, and active styling.
  - **Upcoming**: Muted badge and dimmed text.
- **Right Column**: Embedded form card containing the current step's active content:
  - Step 1: Avatar / Profile Picture on `/setup/upload-image`
  - Step 2: Role & Purpose on `/setup/survey` (Substep 1)
  - Step 3: Skills & Tools on `/setup/survey` (Substep 2)
- Neutral dark mode palette (`#09090b` page, `#18181b` card, `#27272a` borders) and crisp light mode palette.
- Responsive mobile adaptation (horizontal stepper on mobile).
- Preserve 100% of existing upload, cropping, GlideSelect dropdown, and survey validation logic.

## Acceptance Criteria
- [x] Create reusable `SetupLayout` component with the vertical 3-step stepper.
- [x] Integrate `SetupLayout` into `02_UploadImage.tsx` (`currentStep={1}`).
- [x] Integrate `SetupLayout` into `04_Survey.tsx` (`currentStep={subStep === 1 ? 2 : 3}`).
- [x] Stepper correctly reflects completed, active, and upcoming steps across forward and backward navigation.
- [x] Fully styled in neutral dark mode (no blue/navy tints) and clean light mode.
- [x] Responsive design gracefully adapts for smaller screens.
- [x] All existing logic (avatar upload/crop/presets, survey answer handling, GlideSelects, submit pipeline) works without regression.
- [x] `cd frontend && npm run build` compiles with 0 errors.
