# Current Task: Discovery Modern Segmented Tab Navigation

## Objective
Replace the dated, full-bleed tab bar (which had an awkward pale blue box and full-width border) with a modern, sleek segmented capsule navigation bar matching Ensemble's Profile design language.

## Acceptance Criteria
- [x] Converted the tab bar in [DiscoveryPage.tsx](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/frontend/src/pages/user/14_discovery/DiscoveryPage.tsx) into an enclosed segmented capsule (`bg-zinc-100/80 dark:bg-zinc-800/60 p-1 rounded-2xl border border-zinc-200/80 dark:border-white/10 w-fit`).
- [x] Completely removed the pale blue box (`bg-blue-500/5`), the bright blue text, and the blue underline.
- [x] Added butter-smooth sliding pill animation via `framer-motion` (`layoutId="activeDiscoveryTabPill"`).
- [x] Active tab renders as an elevated neutral card (`bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs border border-zinc-200/80 dark:border-white/10 font-semibold rounded-xl`).
- [x] Added dynamic count badge on "Matched Editors" when candidate matches are found.
- [x] Verified frontend build passes (`npm run build` completed with 0 errors).
