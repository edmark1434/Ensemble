# Current Task — Granular Marketplace Asset Content Editing

Allow asset owners to keep or unselect individual current thumbnails/package files, add replacements, and save the resulting asset package securely.

## Acceptance Criteria

- [x] Edit Asset displays every current thumbnail and package-file preview as selected by default.
- [x] Owners can click an existing item to toggle it between `Keep` and `Removed`.
- [x] Owners can combine retained current items with newly uploaded thumbnails and original files.
- [x] Final content validation requires 1–8 thumbnails and the appropriate original/template deliverables.
- [x] Template project links load through the authenticated owner endpoint and remain individually editable/removable.
- [x] Backend validates every retained relation ID belongs to the asset being edited.
- [x] Backend validates every new upload's ownership, intent consumption, MIME type, storage folder, size, and uniqueness.
- [x] Selected current relations and new uploads are rebuilt in one transaction with correct positions and primary thumbnail/proxy pointers.
- [x] Metadata-only edits preserve content, asset type remains immutable, and content replacement remains locked after an active purchase.
- [x] Backend syntax checks and the frontend production build pass.

## Final Flow

1. Current content opens selected as `Keep`.
2. Clicking a current item marks it `Removed`; clicking again restores it.
3. New uploads are appended to the selected existing package.
4. The client sends retained relation IDs plus new upload IDs.
5. The backend verifies retained ownership and new uploads, validates the final combined counts, then rebuilds the selected content atomically.
6. Unselected relations are removed from the asset while retained and newly uploaded content remain available in the saved listing.

## Verification

- `node --check backend/repositories/AssetRepositories.js` passed.
- `node --check backend/services/AssetServices.js` passed.
- `cd frontend && npm run build` passed (`tsc --noEmit` and Vite production build).
- Escaped-newline scan returned no matches.
- `git diff --check` passed after formatting cleanup.

Status: Completed.
