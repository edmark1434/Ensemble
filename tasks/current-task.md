# Guest view-only share links & navbar title subtitles

## Implementation objective

Allow guests to open view-only project share links without signing in, display owner/save subtitles in the editor navbar, and add a custom tooltip to the portfolio back button.

## Acceptance criteria

- View-only share links generated from the Share modal point directly to the editor (`/editor/[id]?share=...`) and allow unauthenticated guests to view the live project via read-only `SnapshotPreview` after verifying the signed link and active issuer authority in PostgreSQL.
- Non-viewer share links (`Commenter`, `Editor`, `Manager`) still require login and redeem membership through `/projects/open/[id]?share=...`.
- The navbar displays `by [owner]` in `text-muted-foreground` next to the title for view-only/comment-only access, template previews (showing template owner), guest view-only share links, and portfolio mode — and in mobile mode only when the user is actually a Viewer or Commenter (never for Owners/Managers/Editors).
- Save previews display `at [Month Day, Year] · [Hour:Minute AM/PM]` in `text-muted-foreground` instead of `by [owner]`.
- The portfolio mode back button uses a UI `<Tooltip>` with `"Back to profile"` and no native `title` attribute.
