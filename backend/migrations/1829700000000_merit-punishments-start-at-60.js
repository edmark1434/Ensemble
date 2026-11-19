/**
 * Automatic merit punishments start at merit 60.
 *
 * The previous seed (`1829600000000_rebalance-merit-punishments`) still started at merit 95,
 * which punished members for one or two ordinary warnings. Nothing automatic now happens above
 * merit 60; same lengths as before, just much lower levels:
 *
 *   merit 60 → Limited 1 day        merit 45 → Restricted 2 days
 *   merit 55 → Mute 1 day           merit 40 → Frozen access 3 days
 *   merit 50 → Mute 2 days          merit 30 → Auto-suspend 3 days
 *                                   merit 20 → Auto-suspend 7 days
 *
 * Only seeded rows nobody edited are replaced; admin-made or edited rows stay. Punishments
 * from seeded rules (any earlier seed) that the new ladder would not give at the member's
 * current merit end now: their clock is set to now with end_reason `rebalanced`, so the
 * one-minute sweep closes them and tells the member ("You're unfrozen …"). An automatic
 * suspension released that way gets `suspension_ends_at = NOW()`, and the standing sweep lifts
 * it and tells the member, the same as any suspension that ran out.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

const PREVIOUS_SEED = `(VALUES
  (5, 'limited', 1),
  (10, 'mute', 1),
  (15, 'mute', 2),
  (20, 'restricted', 2),
  (25, 'frozen', 3),
  (30, 'auto_suspend', 3),
  (40, 'auto_suspend', 7)
) AS seed(min_points, effect, days)`;

const NEW_SEED = `(VALUES
  (40, 'limited', 1, 'Limited 1 day', 'Merit 60 or lower.'),
  (45, 'mute', 1, 'Mute 1 day', 'Merit 55 or lower.'),
  (50, 'mute', 2, 'Mute 2 days', 'Merit 50 or lower.'),
  (55, 'restricted', 2, 'Restricted 2 days', 'Merit 45 or lower.'),
  (60, 'frozen', 3, 'Frozen access 3 days', 'Merit 40 or lower.'),
  (70, 'auto_suspend', 3, 'Auto-suspend 3 days', 'Merit 30 or lower.'),
  (80, 'auto_suspend', 7, 'Auto-suspend 7 days', 'Merit 20 or lower.')
) AS seed(min_points, effect, days, label, note)`;

/** Active warning points now, same rule as sumActiveWarningPoints. */
const CURRENT_POINTS = `COALESCE((
  SELECT SUM(LEAST(GREATEST(COALESCE(v.points, 1), 1), 10))
  FROM violations v
  WHERE v.account_id = mp.account_id
    AND v.deleted_at IS NULL
    AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open', 'pending')
    AND (v.expires_at IS NULL OR v.expires_at > NOW())
), 0)`;

/** Lowest new trigger (in points) per kind of punishment. */
const NEW_TRIGGER = `CASE mp.effect
  WHEN 'limited' THEN 40
  WHEN 'mute' THEN 45
  WHEN 'restricted' THEN 55
  WHEN 'frozen' THEN 60
  WHEN 'auto_suspend' THEN 70
END`;

exports.up = (pgm) => {
  // 1. Retire the untouched previous-seed rows.
  pgm.sql(`
    UPDATE warning_thresholds t
    SET deleted_at = NOW(), updated_at = NOW()
    FROM ${PREVIOUS_SEED}
    WHERE t.is_system = TRUE
      AND t.deleted_at IS NULL
      AND t.min_points = seed.min_points
      AND t.effect = seed.effect
      AND t.duration_days = seed.days;
  `);

  // 2. Punishments from seeded rules (now retired) or with no rule (back-filled), that the new
  //    ladder would not give at the member's current merit, end now. The sweep closes and
  //    announces them within a minute.
  pgm.sql(`
    UPDATE merit_penalties mp
    SET ends_at = NOW(), end_reason = 'rebalanced'
    WHERE mp.ended_at IS NULL
      AND mp.ends_at > NOW()
      AND (
        mp.warning_threshold_id IS NULL
        OR EXISTS (
          SELECT 1 FROM warning_thresholds t
          WHERE t.warning_threshold_id = mp.warning_threshold_id
            AND t.is_system = TRUE
            AND t.deleted_at IS NOT NULL
        )
      )
      AND ${CURRENT_POINTS} < ${NEW_TRIGGER};
  `);

  // 3. Automatic suspensions whose every automatic-suspension record just ended: let the
  //    standing sweep lift them (and tell the member).
  pgm.sql(`
    UPDATE accounts a
    SET suspension_ends_at = NOW()
    WHERE LOWER(COALESCE(a.status, '')) = 'suspended'
      AND a.suspension_source = 'auto'
      AND EXISTS (
        SELECT 1 FROM merit_penalties mp
        WHERE mp.account_id = a.account_id
          AND mp.effect = 'auto_suspend'
          AND mp.end_reason = 'rebalanced'
          AND mp.ended_at IS NULL
          AND mp.ends_at = NOW()
      )
      AND NOT EXISTS (
        SELECT 1 FROM merit_penalties mp
        WHERE mp.account_id = a.account_id
          AND mp.effect = 'auto_suspend'
          AND mp.ended_at IS NULL
          AND mp.ends_at > NOW()
      );
  `);

  // 4. Seed the new ladder wherever that level and kind are free.
  pgm.sql(`
    INSERT INTO warning_thresholds (min_points, effect, label, duration_days, note, is_system, sort_order)
    SELECT seed.min_points, seed.effect, seed.label, seed.days, seed.note, TRUE, seed.min_points
    FROM ${NEW_SEED}
    WHERE NOT EXISTS (
      SELECT 1 FROM warning_thresholds t
      WHERE t.min_points = seed.min_points AND t.effect = seed.effect AND t.deleted_at IS NULL
    );
  `);
};

exports.down = (pgm) => {
  // Punishments and suspensions already released stay released; only the ladder goes back.
  pgm.sql(`
    UPDATE warning_thresholds t
    SET deleted_at = NOW(), updated_at = NOW()
    FROM ${NEW_SEED}
    WHERE t.is_system = TRUE
      AND t.deleted_at IS NULL
      AND t.min_points = seed.min_points
      AND t.effect = seed.effect
      AND t.duration_days = seed.days;
  `);
  pgm.sql(`
    UPDATE warning_thresholds t
    SET deleted_at = NULL, updated_at = NOW()
    FROM ${PREVIOUS_SEED}
    WHERE t.is_system = TRUE
      AND t.deleted_at IS NOT NULL
      AND t.min_points = seed.min_points
      AND t.effect = seed.effect
      AND t.duration_days = seed.days
      AND NOT EXISTS (
        SELECT 1 FROM warning_thresholds o
        WHERE o.deleted_at IS NULL AND o.min_points = t.min_points AND o.effect = t.effect
      )
      AND t.warning_threshold_id = (
        SELECT x.warning_threshold_id FROM warning_thresholds x
        WHERE x.is_system = TRUE AND x.min_points = t.min_points AND x.effect = t.effect
          AND x.duration_days = t.duration_days
        ORDER BY x.deleted_at DESC NULLS LAST
        LIMIT 1
      );
  `);
};
