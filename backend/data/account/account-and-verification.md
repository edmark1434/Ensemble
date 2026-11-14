# Accounts, Onboarding, Profile, and Settings

Routes: `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/settings`, `/profile`, `/account-verification-status`

## Creating an account and signing in

- **Sign up (`/signup`):** New users create an account using email and password or Google sign-in. New accounts complete email verification (`/setup/verify-email` or `/verify-email`) and onboarding steps including uploading a profile photo (`/setup/upload-image`) and completing the onboarding survey (`/setup/survey`).
- **Sign in (`/login`):** Existing members sign in with their email/credentials or Google sign-in.
- **Password recovery:** If you forget your password, request a reset link on `/forgot-password` and set a new password via `/reset-password`.

If your account is banned or locked, signing in directs you to `/account/appeal` to review your record and submit an appeal.

## Profile and completion checklist

Route: `/profile`

Your profile displays your avatar, banner, tagline, bio, introduction, skills, portfolio items, reviews, Platform Merit ring, standing chips (if any), and up to 5 pinned badges.

Completing the profile setup checklist (avatar, banner, tagline, bio, introduction, planned budget, at least 3 skills, and a portfolio item) improves how your profile presents to clients and freelancers. Completing the required profile setup items also unlocks the **Profile Complete** badge on `/notifications`.

## Account settings

Route: `/settings`

The Settings screen is organized into focused sections:

- **Account Details:** Update your username, address, email, password, or personal details.
- **Wallet:** View your Account Wallet and Escrow balances, transfer credits to another user, or request a payout to GCash or Maya (see the Credits, Wallet, and Transactions guide).
- **Subscription:** View your active membership plan, trial status, renewal date, or manage cancellation and plan upgrades on `/credits-subscriptions`.
- **Display:** Switch between light and dark theme and adjust display preferences.
- **Account Record / Violations:** View your current Platform Merit, standing, active or past warnings, and timeouts.
- **Help and Legal:** Launch the interactive Platform Walkthrough, open the FAQ (`/landing/FAQ`), submit a ticket (`/support/ticket`), or review legal policies.

## Deactivating and reactivating your account

You can voluntarily deactivate your account from the Deactivate section of `/settings`. Deactivation is not a punishment and does not lower Platform Merit:

- Your profile is hidden from other members in search and profiles, while active jobs, messages, and contracts remain in place.
- Reactivation is locked for a **72-hour cooldown** after deactivation, with a countdown showing when you can turn the account back on.

## Account security tips

Never share your password, verification codes, identity documents, or private payment details in chat, forums, or support attachments. If you notice suspicious logins or unauthorized changes, submit a **Sign-in and password** or **Account compromised** ticket on `/support/ticket`.
