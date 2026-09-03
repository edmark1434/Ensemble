# Current Task — Drop dispute sanction_notes

Keep a single notes field: `resolution_notes`. Drop `sanction_notes` (merge existing text into resolution notes first). Keep `sanction_type`.

## Acceptance Criteria

- [ ] Migration merges then drops `sanction_notes`.
- [ ] Backend/seed stop writing `sanction_notes`.
- [ ] Frontend detail modal removes Sanction notes field.
