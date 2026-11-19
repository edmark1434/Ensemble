/**
 * Rebalance the automatic merit punishment ladder (gentler).
 *
 * The first timed ladder (`1829300000000_timed-merit-punishments`) punished a single minor
 * warning and stacked several punishments on one serious one. The new seed:
 *
 *   merit 95 → Limited 1 day       merit 80 → Restricted 2 days
 *   merit 90 → Mute 1 day          merit 75 → Frozen access 3 days
 *   merit 85 → Mute 2 days         merit 70 → Auto-suspend 3 days
 *                                  merit 60 → Auto-suspend 7 days
 *
 * Only seeded rows nobody edited (same level, punishment and length as the first seed) are
 * replaced; rows an admin changed or created stay as they are. Bands and mutes those old rows
 * started and that are still running are shortened to the new length of their kind (never
 * lengthened); the one-minute sweep closes any that are now over and tells the member.
 * Automatic suspensions already running are left alone (staff can Unsuspend).
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

const OLD_SEED = `(VALUES
  (3, 'limited', 3, 'Limited 3 days'),
  (8, 'restricted', 5, 'Restricted 5 days'),
  (10, 'mute', 3, 'Mute 3 days'),
  (15, 'mute', 5, 'Mute 5 days'),
  (16, 'frozen', 7, 'Frozen access 7 days'),
  (20, 'auto_suspend', 7, 'Auto-suspend 7 days'),
  (30, 'auto_suspend', 14, 'Auto-suspend 14 days')
) AS seed(min_points, effect, days, label)`;

const NEW_SEED = `(VALUES
  (5, 'limited', 1, 'Limited 1 day', 'Merit 95 or lower.'),
  (10, 'mute', 1, 'Mute 1 day', 'Merit 90 or lower.'),
  (15, 'mute', 2, 'Mute 2 days', 'Merit 85 or lower.'),
  (20, 'restricted', 2, 'Restricted 2 days', 'Merit 80 or lower.'),
  (25, 'frozen', 3, 'Frozen access 3 days', 'Merit 75 or lower.'),
  (30, 'auto_suspend', 3, 'Auto-suspend 3 days', 'Merit 70 or lower.'),
  (40, 'auto_suspend', 7, 'Auto-suspend 7 days', 'Merit 60 or lower.')
) AS seed(min_points, effect, days, label, note)`;

/** Longest new length per kind; running punishments from retired rows are capped to it. */
const NEW_CAP_DAYS = `CASE retired.effect
  WHEN 'limited' THEN 1
  WHEN 'mute' THEN 2
  WHEN 'restricted' THEN 2
  WHEN 'frozen' THEN 3
END`;

exports.up = (pgm) => {
  // Retire the untouched first-seed rows and shorten what they started, in one statement so
  // the shortening only ever touches punishments from those exact rows.
  pgm.sql(`
    WITH retired AS (
      UPDATE warning_thresholds t
      SET deleted_at = NOW(), updated_at = NOW()
      FROM ${OLD_SEED}
      WHERE t.is_system = TRUE
        AND t.deleted_at IS NULL
        AND t.min_points = seed.min_points
        AND t.effect = seed.effect
        AND t.duration_days = seed.days
      RETURNING t.warning_threshold_id, t.effect
    )
    UPDATE merit_penalties mp
    SET ends_at = LEAST(mp.ends_at, mp.starts_at + make_interval(days => ${NEW_CAP_DAYS}))
    FROM retired
    WHERE mp.warning_threshold_id = retired.warning_threshold_id
      AND retired.effect IN ('limited', 'mute', 'restricted', 'frozen')
      AND mp.ended_at IS NULL
      AND mp.ends_at > NOW();
  `);

  // Back-filled band rows from the first migration carry a retired row's id too, so they were
  // covered above. Seed the new ladder wherever that level and kind are free.
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
  // Shortened punishments stay shortened; only the ladder goes back.
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
    FROM ${OLD_SEED}
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
