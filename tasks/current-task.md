# Current Task: User Header Profile Dropdown Redesign

## Objective
Apply the same `GlideSelect` dropdown design language and neutral palette to the user header profile menu:
1. **Neutral Theme (No Bluish/Navy Tints)**:
   - Replace bluish `dark:bg-[#1a1b23]` with neutral `#18181b` (dark zinc) and neutral border `border-zinc-200 dark:border-zinc-800`.
   - Neutral shadow and dividers.
2. **Sliding Glide Pill Hover Effect**:
   - Implement the smooth sliding highlight pill (`cubic-bezier(0.23, 1, 0.32, 1)`) that tracks hovered items (Profile, Settings, Feedback, Support, and Sign out).
   - Support dynamic item heights smoothly (such as the taller two-line "Get Support" item).
   - Tint the pill red smoothly when hovering over the "Sign out" destructive option.
3. **Smooth Pop Animation & Rotating Chevron**:
   - Animate dropdown entrance smoothly (`animate-in fade-in zoom-in-95 origin-top-right`).
   - Rotate the trigger `ChevronDown` icon smoothly when open (`rotate-180`).
4. **Preserve Dimensions & Logic ("Don't change the size")**:
   - Keep exact container width (`w-72`), item padding (`px-3 py-2`), font sizes, and layout.
   - Keep all navigation links, modals, and logout workflows 100% intact.

## Acceptance Criteria
- [x] User profile dropdown uses neutral dark mode (`#18181b`) and neutral borders (no blue/navy).
- [x] Animated sliding glide pill smoothly highlights hovered options without layout shifts.
- [x] Smooth red tint highlight on "Sign out".
- [x] Trigger chevron rotates smoothly when menu opens.
- [x] Dimensions (`w-72`), item padding, font sizes, and spacing remain unchanged.
- [x] All click actions (Profile, Settings, Submit Feedback, Get Support, Sign out) work as before.
- [x] `cd frontend && npm run build` compiles with 0 errors.
