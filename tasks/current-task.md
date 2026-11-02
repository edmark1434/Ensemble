# Active Task: Apply Dark/Light Mode and Improve UI for `/credits/checkout`

## Objective

Update `/credits/checkout` (`frontend/src/pages/payment/checkout.tsx`) to support both light mode and dark mode seamlessly and improve the overall checkout UI/UX to match the Ensemble design system (`CreditsShop.tsx`) without gradients.

## Acceptance Criteria

1. **Light & Dark Mode Support**:
   - Replace hardcoded dark colors (`#080a12`, `#0d0f1a`, `#1e2130`, `text-white`) with light/dark theme tokens (`bg-gray-50 dark:bg-dark-base`, `bg-white dark:bg-dark-surface/80`, `border-gray-200 dark:border-white/10`, `text-gray-900 dark:text-white`, `text-gray-500 dark:text-zinc-400`, etc.) and `ShapeGrid` background synced with `useGlobalState` theme.
2. **Visual Theme Compliance (No Gradients)**:
   - Remove `bg-gradient-to-*` classes on the item summary card and primary action buttons; use solid Ensemble theme surfaces, borders, and CTA buttons (`bg-blue-600 hover:bg-blue-700`, `bg-emerald-600 hover:bg-emerald-700`).
3. **Improved Checkout UI/UX**:
   - **Item Overview Card**: Display `CreditIcon` for credit packs/custom top-ups or plan icons for subscriptions, item badges (`Credit Pack`, `Custom Top-up`, `Subscription Plan`, `Upgrade`, `Downgrade`, `Free Trial`), included plan features (for subscriptions), and prorated upgrade details when present.
   - **Payment Method Selection**: Enhance payment option cards ("Pay via Checkout Portal" vs "Saved Payment Method") and saved payment method items (fixing duplicate masked card number display, adding clear brand/channel badges, custom radio indicators, and a clean empty state).
   - **Order Summary & Success Screen**: Improve the sticky Order Summary breakdown, security callout, loading state, and payment confirmation screen in both light and dark modes.
4. **Verification**:
   - `cd frontend && npm run build` completes with zero errors.
