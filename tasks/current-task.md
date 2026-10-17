# Current Task: Account Setup Redesign (/setup/upload-image & /setup/survey)

## Objective
1. **Neutral Dark Mode Palette (No Bluish/Navy Tints)**:
   - Eliminate all bluish/navy tints (`#080a12`, `#13151f`, `#2a2d3e`, `#4a6fa5`, blue grid lines, blue card tints) across `/setup/upload-image` and `/setup/survey`.
   - Implement clean, neutral zinc/charcoal dark tones (`#0f0f11`, `#141416`, `#18181b`, `#202024`, `#27272a`, `#3f3f46`, neutral grid lines).
   - Fully support both light mode and dark mode with high contrast and zero clutter.
2. **Remove Icon on Avatar Step**:
   - In `/setup/upload-image`, remove the image icon container above "Choose avatar profile".
3. **GlideSelect Component with Icons**:
   - Implement `GlideSelect` (`@/components/ui/GlideSelect.tsx`) based on the requested `@react-bits/GlideSelect-TS-TW` component with Hugeicons (`ArrowDown01Icon`, `Tick02Icon`), smooth animated glide pill, full-width support, scrollable options, and icons for each choice.
   - Replace native `<select>` dropdowns in `/setup/survey` with `GlideSelect`, mapping meaningful icons for each option (e.g. Social Media, YouTube, Friends, Search Engine, Work types).
4. **Icons for Platform Purpose (Multi-Select)**:
   - In `/setup/survey` (step 3/3 "Platform purpose"), add dedicated icons to each selection card:
     - "Earn / Find Work" (`Briefcase` / `Coins`)
     - "Look for Service / Hire" (`UserCheck` / `Users`)
     - "Explore / Learn" (`Compass` / `GraduationCap`)
5. **Preserve Exact Logic**:
   - Maintain 100% of existing logic, state management, S3 upload flow, API payloads, validation rules, draft persistence, and navigation.

## Acceptance Criteria
- [x] `/setup/upload-image` uses neutral dark mode palette (no blue/navy) and crisp light mode.
- [x] Image icon box above "Choose avatar profile" is removed.
- [x] `GlideSelect` is created with Hugeicons and animated sliding pill.
- [x] All dropdown questions in `/setup/survey` use `GlideSelect` with icons.
- [x] Multi-select purpose choices in `/setup/survey` render sleek icons.
- [x] All text is high-contrast and readable in both dark and light modes.
- [x] Zero logic changes; all uploads, draft caching, and survey submissions function as before.
- [x] `cd frontend && npm run build` compiles with 0 errors.
