# Current Task: Rate & Review Modal Streamlining & 24h Review Window

## Objective
1. **Uncluttered & Compact Rate & Review Modal**:
   - Drastically reduced modal footprint (from ~600px to compact ~350px `max-w-md`) so both POVs see only what they need to see and do without scrolling or visual noise.
   - Reduced the 4-line warning card into a sleek, small 1-line amber strip with the countdown timer and grace-period notice.
   - Streamlined the payout summary for freelancers into an unobtrusive 1-line Net Earnings pill.
   - Removed heavy outer container boxes around the star ratings for a clean, direct, and satisfying rating UX.
   - Made written feedback compact and easy to fill.
2. **Dynamic Star Rating Tiers (Crisp, Enlarged, No Glow)**:
   - Level 1: **Poor** - Red (`#f43f5e`, red pill badge).
   - Level 2: **Fair** - Orange (`#f97316`, orange pill badge).
   - Level 3: **Good** - Yellow (`#fbbf24`, yellow pill badge).
   - Level 4: **Very Good** - Green (`#10b981`, green pill badge with subtle light sheen).
   - Level 5: **Outstanding** - Blue - purple (SVG linear gradient royal-blue to neon-purple, blue-purple pill with celestial glint).
   - Extra large star icons (`w-11 h-11 sm:w-12 sm:h-12` up to 48px) in an `h-16` container for a bold, prominent, and tactile feel.
   - Removed all fuzzy glow/drop-shadow filters on the stars for crisp, sharp vector rendering.
   - 500-character ceiling with dynamic character counter (`{count} / 500`) that changes color when nearing the limit.
   - Fixed height (`h-6`) and pill container on both empty and active rating states to eliminate layout shift (modal resizing/jumping) when hovering or selecting stars.
3. **High-Contrast Light Mode UI**:
   - Upgraded borders, backgrounds, warning strips, stars, badges, and textarea borders for sharp visibility in light mode without color washouts.
4. **Action Buttons with Embedded 24h Window & Icons**:
   - `Rate & Review` button converted into a segmented two-tone button with an emerald green left segment (`⭐ Rate & Review` in `bg-emerald-600 group-hover:bg-emerald-700 text-white`) and a clean white right segment (`🕒 24h Window` in `bg-white group-hover:bg-gray-50 text-gray-900 border-l border-emerald-700/30`).
   - `View Progress Details` / `View Progress` upgraded with leading `Eye` icon and animated trailing `ArrowRight`.
   - `Update Milestones` upgraded with leading `ListChecks` icon and animated trailing `ArrowRight`.
   - `You Reviewed` badge styled with rounded-xl and emerald check icon.
5. **Contract Details Page Action Buttons**:
   - `View Task History` (freelancer) and `View Progress History` (client) on Done / Closed contracts.
6. **Counterparty Rate & Review on Completed / Archived Cards**:
   - When a contract is completed and both parties have rated (or completed/archived), display the rating and review received from the counterparty directly on that card.
   - Includes counterparty name, role (`Client` / `Freelancer`), star rating (1-5 filled amber stars), numeric score (e.g. `5.0`), dynamic tier badge (`Outstanding`, `Very Good`, `Good`, `Fair`, `Poor`), and written feedback quote.
   - Interactive segmented switch allows switching between the counterparty's review and your own review seamlessly.
   - Dates and attribution indicators ("Received from {Name}" / "Given to {Name}") formatted cleanly with high contrast in light mode.

## Acceptance Criteria
1. **Modal Sizing & Layout**:
   - Compact `max-w-md` modal with no overflow or heavy stacked cards.
   - Warning is a slim, clean 1-line strip with live countdown timer.
   - Payout info (freelancer) is a small 1-line row.
   - Dynamic tier colors (Red, Orange, Yellow, Green, Blue-Purple gradient).
   - Enlarged, crisp stars with no blurry glow.
   - Fixed-height seamless label pill (`h-6`, zero layout jump).
   - Character counter displaying live count out of 500 characters.
2. **Counterparty Review Display**:
   - Display counterparty's rating and review feedback on completed/archived cards.
   - Dual-tab toggle if both reviews exist, defaulting to counterparty review.
3. **Verification**:
   - `npm run build` succeeds with 0 errors.
