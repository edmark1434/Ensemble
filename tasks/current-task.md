# Current Task — Drop dispute sanction_notes

Keep a single notes field: `resolution_notes`. Drop `sanction_notes` (merge existing text into resolution notes first). Keep `sanction_type`.

## Acceptance Criteria

- [x] Migration merges then drops `sanction_notes`.
- [x] Backend/seed stop writing `sanction_notes`.
- [x] Frontend detail modal removes Sanction notes field.

## Verification

- Applied `1811500000000_154-drop-dispute-sanction-notes`.
- Detail modal shows sanction type + resolution notes only.
