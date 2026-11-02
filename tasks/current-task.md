# Active Task: Make dispute private again

## Objective

Let the assigned dispute handler set a public dispute back to private so it leaves profiles and the public forum.

## Acceptance Criteria

1. Staff PATCH supports `action: "hide"` / `"make_private"` (and `visibility: false`) for the assigned handler.
2. Dispute detail UI shows **Make dispute private** when the case is public.
3. Private cases drop from public profiles and `GET /api/accounts/disputes/:id` returns unavailable.
4. Docs updated; frontend build passes.
