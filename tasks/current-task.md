# Current Task: Ticket invite confirmation
# Current Task: Fix and Refine Suspended Account Banner UI

## Objective
Staff confirm before adding someone to a ticket. Regular users must accept a notification before they can open it. Staff accounts are added immediately.
Redesign the `SuspensionBanner` component in `AccountStanding.tsx` to make it significantly more compact, small, sleek, and aesthetically aligned with the project theme without overwhelming the viewport or blocking header content.

## Acceptance Criteria
1. Choosing a person in the ticket modal asks for confirmation before the add is sent.
2. Adding a regular user creates a pending invite and a notification with Accept and Decline. They cannot open the ticket until they accept.
3. Accepting adds them to the ticket chat and opens that conversation. Declining leaves them off the ticket.
4. Adding a staff account puts them on the ticket immediately, with no accept step.
1. **Compact Sizing & Layout (`frontend/src/components/ui/AccountStanding.tsx`)**:
   - Reduce width from `max-w-6xl` to a sleek, centered `max-w-2xl`.
   - Reduce vertical padding from `py-3` to `py-1.5 sm:py-2`.
   - Downsize icon container from `h-9 w-9` to `h-7 w-7` with smaller icon.
2. **Refined Typography & Details**:
   - Downsize text to `text-xs` with an inline "Account Suspended" status chip and animated pulse dot.
   - Display concise explanatory text (`detail`) that fits cleanly on desktop and mobile.
3. **Streamlined Notifications Action**:
   - Compact button styled with `Bell` icon and subtle theme tokens (`px-2.5 py-1 text-xs`).
4. **Verification**:
   - Run `npm run build` in `frontend/` to confirm clean compilation and zero TypeScript errors.