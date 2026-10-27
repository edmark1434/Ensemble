# Active Task: Dynamic Badge Requirement Library

## Implementation Objective

Named, CRUD-able badge requirements that staff create and attach to badges. The 15 product badges are wired to scanned platform metrics (alpha, beta, profile, 1/10/50/100 ranks). Custom rules can be added later (followers, jobs posted, and so on).

## Acceptance Criteria

- [x] `badge_requirement_defs` library with operators and thresholds.
- [x] Existing product badges attach the matching named requirements.
- [x] Admin Requirements tab can create / update / delete custom defs and attach them from Catalog.
- [x] Evaluator uses the attached def (metric + operator + threshold).
- [x] TypeScript check for the new admin surfaces.
