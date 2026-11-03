# Current task: Tailor Platform Walkthrough Tracks & Step Scopes

## Objective

Refactor the platform walkthrough steps into 4 distinctly tailored tracks (Freelancer, Client, Asset Creator, Explore All), update dark mode theme styling to neutral dark charcoal, customize perspective instructions, and add the transaction verification & re-entry notice to the completion modal.

## Scope

- `frontend/src/lib/tour_state.ts` (Track step lists, `roleTexts` customization, `getActiveTourSteps`)
- `frontend/src/components/tour/TourSpotlightCard.tsx` (Dynamic `roleTexts` renderer, neutral `#121214` styling)
- `frontend/src/components/tour/TourWelcomeModal.tsx` (Video banner, neutral gray theme, 4 perspective cards)
- `frontend/src/components/tour/TourGraduationModal.tsx` (Verification reminder & multi-perspective walkthrough hint)

## Acceptance criteria

- **Dark Mode Palette**: Completely neutral gray/charcoal (`dark:bg-[#121214]`, `dark:border-zinc-800`), removing blue tinting.
- **Freelancer Track (35 steps)**: Home (Latest Job Posts, Notifications, Ask AI, Profile Avatar), Profile, Projects, Teams, Job Market (bidding/finding jobs), Gigs (posting services), Credits.
- **Client Track (39 steps)**: Home (Global Search, Quick Actions, Top Services, Notifications, Ask AI, Profile Avatar), Profile, Projects, Teams, Discovery (scouting talent), Job Market (posting jobs), Gigs (ordering services), Credits.
- **Asset Creator Track (22 steps)**: Home (Global Search, Quick Actions, Popular Assets, Notifications, Ask AI, Profile Avatar), Profile, Projects, Asset Library (upload -> moderation approval -> earn money), Credits.
- **Explore All Track (62 steps)**: Full walkthrough of all platform capabilities.
- **Graduation Modal**: Notifies user of account verification requirement for transactions (with reassurance for already-verified users) and points to other walkthrough tracks.
- Frontend builds with 0 errors (`npm run build`).
