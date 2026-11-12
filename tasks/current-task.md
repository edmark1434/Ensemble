# Active Task: Joed AI Profile Introduction Underline Removal & Badge Rarities Redesign

## Implementation Objective

1. Underline removal for Joed AI Profile Introductions:
   - Updated `PROFILE_INTRO_SYSTEM_PROMPT` in `backend/services/ClaudeSupportServices.js` to strictly forbid generating underline tags (`<u>` or `</u>`) or markdown underlines, advising reliance exclusively on bold and italics for emphasis.
   - Added automated sanitization in `generateProfileIntroductionDraft` to strip all `<u>` and `</u>` tags from the generated introduction string before returning it to the user.
2. Tool & Platform Mentions:
   - Forbid boilerplate third-party software bullets (Premiere Pro, After Effects, DaVinci Resolve) unless explicitly provided by the creator.
   - Focus on Ensemble collaboration, pacing, sound design, and retention craft.
3. Badge Rarities Popover Redesign:
   - Rename to "Badge Rarities" with `Plus Jakarta Sans` font and concise, easy-to-read tier descriptions.

## Acceptance Criteria

- [x] Underline rule removed from `PROFILE_INTRO_SYSTEM_PROMPT` and replaced with an explicit prohibition against underlines.
- [x] Post-processing filter strips all `<u>` and `</u>` tags from generated introductions in [`ClaudeSupportServices.js`](file:///c:/Users/Rexshimura/PycharmProjects/EnsembleProject/backend/services/ClaudeSupportServices.js).
- [x] Boilerplate software bullets suppressed unless written by user.
- [x] Badge Rarities tooltip updated with clean Plus Jakarta Sans styling and 1-line tier explanations.
