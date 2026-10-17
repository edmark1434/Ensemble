# Current Task: Setup Flow Transitions & Title Alignment

## Objective
Harmonize the onboarding vertical stepper titles and card headings with the actual questions being asked, and make forward/backward step navigation buttery smooth and seamless:
1. **Title Alignment**:
   - The survey questions are:
     - Substep 1: Q1 "Where did you hear about us?" & Q2 "What is your nature of work?" ➔ Step 2 Title: **"About You"** ("Discovery source & work background.")
     - Substep 2: Q3 "What is your purpose on the platform?" (Earn, Hire, Explore) ➔ Step 3 Title: **"Platform Purpose"** ("Tell us what you plan to do on Ensemble.")
   - Card headers updated to match stepper: `{subStep === 1 ? "About you" : "Platform purpose"}`.
2. **Smooth Transitions**:
   - Directional sliding animations:
     - Next/Forward: Slides in from the right (`translateX(20px)` ➔ `translateX(0)`) with `opacity: 0 ➔ 1` and `blur(2px) ➔ blur(0)`.
     - Back/Backward: Slides in from the left (`translateX(-20px)` ➔ `translateX(0)`) with `opacity: 0 ➔ 1` and `blur(2px) ➔ blur(0)`.
   - Native-app deceleration physics curve: `cubic-bezier(0.16, 1, 0.3, 1)`.
   - Removed artificial `animation-delay` so transitions respond instantly upon user action.
   - Added `overflow: hidden` to `.setup-card` to avoid horizontal scroll flutters during transitions.
   - Added checkmark badge pop animation (`animate-in zoom-in-75 duration-200`) and smooth state transitions.
   - Stepper items for completed steps are clickable on both desktop and mobile for intuitive back-navigation.

## Acceptance Criteria
- [x] Step 3 title accurately reflects platform purpose ("Platform Purpose" ➔ "What is your purpose on the platform?").
- [x] Step 2 title accurately reflects discovery and work background ("About You" ➔ "Discovery source & work background").
- [x] Directional sliding animations implemented for forward and backward navigation in `04_Survey.tsx`.
- [x] Zero-delay responsive animation added to `02_UploadImage.tsx` card entry.
- [x] Stepper progress indicator transitions smoothly between active, completed, and upcoming states.
- [x] Interactive back-navigation on completed steps enabled for desktop and mobile stepper.
- [x] Verified build cleanly with `npm run build` in `frontend/`.
- [x] Verified visually via headless browser screenshot artifacts.
