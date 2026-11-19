/**
 * Timed merit punishments.
 *
 * Automatic punishments no longer follow Platform Merit live. A threshold now says "when merit
 * drops to this level, apply this punishment for this many days". It starts once per crossing,
 * runs its full clock, and does not end when the warnings behind it expire, are lifted, or merit
 * recovers. Merit itself is never changed by a punishment. Deeper drops cross harsher rows.
 *
 * - `warning_thresholds.duration_days`: how long the punishment of every row lasts (replaces
 *   `suspend_days`, which only auto-suspend rows had).
 * - New effect `mute`: no forum writes, no marketplace comments, no new conversations.
 * - Several rows may share a merit level when their effects differ (unique on points + effect).
 * - `none` / `record` rows lock nothing, so they cannot be timed punishments: retired.
 * - `warning_thresholds.lift_at_merit` and `accounts.auto_suspend_lift_merit` are dropped: an
 *   automatic suspension no longer ends early when merit recovers.
 * - `merit_penalties`: one row per punishment the engine applied, with its own clock.
 *
 * Members already in a band keep it on a fixed clock that counts from their latest active
 * warning, and accounts already serving an automatic suspension get its record row.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/** Drop every CHECK constraint on warning_thresholds that guards `effect`, whatever its name. */
const DROP_EFFECT_CHECKS = `
  DO $$
  DECLARE c record;
  BEGIN
    FOR c IN
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'warning_thresholds'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%effect%'
    LOOP
      EXECUTE format('ALTER TABLE warning_thresholds DROP CONSTRAINT %I', c.conname);
    END LOOP;
  END $$;
`;

const ACTIVE_WARNING = `
  v.deleted_at IS NULL
  AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'open', 'pending')
  AND (v.expires_at IS NULL OR v.expires_at > NOW())
`;

exports.up = (pgm) => {
  // --- Thresholds: every row is a timed punishment ---------------------------------------
  pgm.sql(`ALTER TABLE warning_thresholds ADD COLUMN IF NOT EXISTS duration_days SMALLINT;`);
  pgm.sql(`
    UPDATE warning_thresholds
    SET duration_days = CASE
      WHEN effect = 'auto_suspend' THEN COALESCE(suspend_days, 7)
      WHEN effect = 'limited' THEN 3
      WHEN effect = 'restricted' THEN 5
      ELSE 7
    END
    WHERE duration_days IS NULL;
  `);
  pgm.sql(`ALTER TABLE warning_thresholds ALTER COLUMN duration_days SET NOT NULL;`);
  pgm.sql(`
    ALTER TABLE warning_thresholds
      ADD CONSTRAINT warning_thresholds_duration_days_range
      CHECK (duration_days BETWEEN 1 AND 365);
  `);

  // Retire rows that lock nothing (they were display bands, not punishments).
  pgm.sql(`
    UPDATE warning_thresholds
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE effect IN ('none', 'record') AND deleted_at IS NULL;
  `);

  pgm.sql(DROP_EFFECT_CHECKS);
  pgm.sql(`
    ALTER TABLE warning_thresholds
      ADD CONSTRAINT warning_thresholds_effect_check
      CHECK (effect IN ('none', 'record', 'limited', 'restricted', 'frozen', 'mute', 'auto_suspend'));
  `);

  pgm.sql(`DROP INDEX IF EXISTS warning_thresholds_min_points_active_uidx;`);
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS warning_thresholds_trigger_active_uidx
      ON warning_thresholds (min_points, effect)
      WHERE deleted_at IS NULL;
  `);

  // Seeded mutes: merit 90 → 3 days, merit 85 → 5 days.
  pgm.sql(`
    INSERT INTO warning_thresholds (min_points, effect, label, duration_days, note, is_system, sort_order)
    SELECT seed.min_points, 'mute', seed.label, seed.days, seed.note, TRUE, seed.min_points
    FROM (VALUES
      (10, 'Mute 3 days', 3, 'Merit 90 or lower.'),
      (15, 'Mute 5 days', 5, 'Merit 85 or lower.')
    ) AS seed(min_points, label, days, note)
    WHERE NOT EXISTS (
      SELECT 1 FROM warning_thresholds t
      WHERE t.min_points = seed.min_points AND t.effect = 'mute' AND t.deleted_at IS NULL
    );
  `);

  // Seeded band labels now say how long they last.
  pgm.sql(`
    UPDATE warning_thresholds
    SET label = CASE effect
          WHEN 'limited' THEN 'Limited 3 days'
          WHEN 'restricted' THEN 'Restricted 5 days'
          WHEN 'frozen' THEN 'Frozen access 7 days'
        END,
        updated_at = NOW()
    WHERE is_system = TRUE
      AND deleted_at IS NULL
      AND effect IN ('limited', 'restricted', 'frozen')
      AND label IN ('Limited', 'Restricted', 'Frozen access');
  `);

  pgm.sql(`ALTER TABLE warning_thresholds DROP CONSTRAINT IF EXISTS warning_thresholds_lift_at_merit_range;`);
  pgm.sql(`ALTER TABLE warning_thresholds DROP COLUMN IF EXISTS lift_at_merit;`);
  pgm.sql(`ALTER TABLE warning_thresholds DROP COLUMN IF EXISTS suspend_days;`);
  pgm.sql(`ALTER TABLE accounts DROP COLUMN IF EXISTS auto_suspend_lift_merit;`);
  // Engine suspensions stay marked so staff can tell them apart.
  pgm.sql(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS suspension_source VARCHAR(16);`);

  // --- Punishments the engine applied ----------------------------------------------------
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS merit_penalties (
      merit_penalty_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
      warning_threshold_id UUID REFERENCES warning_thresholds(warning_threshold_id) ON DELETE SET NULL,
      violation_id UUID REFERENCES violations(violation_id) ON DELETE SET NULL,
      effect VARCHAR(40) NOT NULL
        CHECK (effect IN ('limited', 'restricted', 'frozen', 'mute', 'auto_suspend')),
      label VARCHAR(80) NOT NULL,
      min_points INTEGER NOT NULL,
      points_at_start INTEGER NOT NULL,
      duration_days SMALLINT NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
      starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ends_at TIMESTAMPTZ NOT NULL,
      ended_at TIMESTAMPTZ,
      end_reason VARCHAR(24),
      ended_by_staff_id UUID REFERENCES staff(staff_id) ON DELETE SET NULL,
      end_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS merit_penalties_account_open_idx
      ON merit_penalties (account_id, ends_at)
      WHERE ended_at IS NULL;
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS merit_penalties_open_ends_idx
      ON merit_penalties (ends_at)
      WHERE ended_at IS NULL;
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS merit_penalties_account_created_idx ON merit_penalties (account_id, created_at DESC);`);
  // A warning fires each rule at most once, even if the engine runs twice for it.
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS merit_penalties_violation_rule_uidx
      ON merit_penalties (violation_id, effect, min_points)
      WHERE violation_id IS NOT NULL;
  `);

  // --- Back-fill ---------------------------------------------------------------------------
  // Members in a band today keep the strictest one on a fixed clock from their latest active
  // warning (roughly when they crossed it). Mutes are new and are not applied retroactively.
  pgm.sql(`
    WITH pts AS (
      SELECT v.account_id,
             SUM(LEAST(GREATEST(COALESCE(v.points, 1), 1), 10))::int AS points,
             MAX(v.created_at) AS last_warned_at
      FROM violations v
      WHERE ${ACTIVE_WARNING}
      GROUP BY v.account_id
    ),
    rule AS (
      SELECT DISTINCT ON (p.account_id)
             p.account_id, p.points, p.last_warned_at,
             t.warning_threshold_id, t.effect, t.label, t.min_points, t.duration_days
      FROM pts p
      JOIN accounts a ON a.account_id = p.account_id
        AND a.deleted_at IS NULL
        AND LOWER(COALESCE(a.type, '')) = 'user'
      JOIN warning_thresholds t ON t.deleted_at IS NULL
        AND t.effect IN ('limited', 'restricted', 'frozen')
        AND p.points >= t.min_points
      ORDER BY p.account_id,
               CASE t.effect WHEN 'frozen' THEN 3 WHEN 'restricted' THEN 2 ELSE 1 END DESC,
               t.min_points DESC
    )
    INSERT INTO merit_penalties (
      account_id, warning_threshold_id, effect, label, min_points, points_at_start,
      duration_days, starts_at, ends_at
    )
    SELECT account_id, warning_threshold_id, effect, label, min_points, points,
           duration_days, last_warned_at, last_warned_at + duration_days * INTERVAL '1 day'
    FROM rule
    WHERE last_warned_at + duration_days * INTERVAL '1 day' > NOW();
  `);

  // Automatic suspensions being served right now.
  pgm.sql(`
    INSERT INTO merit_penalties (
      account_id, effect, label, min_points, points_at_start, duration_days, starts_at, ends_at
    )
    SELECT a.account_id,
           'auto_suspend',
           'Auto-suspend',
           COALESCE((
             SELECT MIN(t.min_points) FROM warning_thresholds t
             WHERE t.effect = 'auto_suspend' AND t.deleted_at IS NULL
           ), 20),
           COALESCE((
             SELECT SUM(LEAST(GREATEST(COALESCE(v.points, 1), 1), 10))::int
             FROM violations v
             WHERE v.account_id = a.account_id AND ${ACTIVE_WARNING}
           ), 0),
           GREATEST(1, LEAST(365, CEIL(EXTRACT(EPOCH FROM (a.suspension_ends_at - NOW())) / 86400)))::smallint,
           NOW(),
           a.suspension_ends_at
    FROM accounts a
    WHERE a.deleted_at IS NULL
      AND LOWER(COALESCE(a.status, '')) = 'suspended'
      AND a.suspension_source = 'auto'
      AND a.suspension_ends_at IS NOT NULL
      AND a.suspension_ends_at > NOW();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS merit_penalties;`);

  pgm.sql(`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS auto_suspend_lift_merit SMALLINT;`);

  pgm.sql(`
    ALTER TABLE warning_thresholds
      ADD COLUMN IF NOT EXISTS suspend_days INTEGER
      CHECK (suspend_days IS NULL OR (suspend_days >= 1 AND suspend_days <= 365));
  `);
  pgm.sql(`UPDATE warning_thresholds SET suspend_days = duration_days WHERE effect = 'auto_suspend';`);

  pgm.sql(`ALTER TABLE warning_thresholds ADD COLUMN IF NOT EXISTS lift_at_merit SMALLINT;`);
  pgm.sql(`ALTER TABLE warning_thresholds DROP CONSTRAINT IF EXISTS warning_thresholds_lift_at_merit_range;`);
  pgm.sql(`
    ALTER TABLE warning_thresholds
      ADD CONSTRAINT warning_thresholds_lift_at_merit_range
      CHECK (lift_at_merit IS NULL OR (lift_at_merit BETWEEN 1 AND 100));
  `);
  pgm.sql(`
    UPDATE warning_thresholds
    SET lift_at_merit = GREATEST(1, LEAST(100, 101 - (
          SELECT MIN(min_points) FROM warning_thresholds
          WHERE effect = 'auto_suspend' AND deleted_at IS NULL
        )))
    WHERE effect = 'auto_suspend' AND deleted_at IS NULL;
  `);
  pgm.sql(`
    UPDATE accounts
    SET auto_suspend_lift_merit = (
      SELECT MAX(lift_at_merit) FROM warning_thresholds
      WHERE effect = 'auto_suspend' AND deleted_at IS NULL
    )
    WHERE suspension_source = 'auto' AND LOWER(COALESCE(status, '')) = 'suspended';
  `);

  // The old schema has no mute effect and one row per point total.
  pgm.sql(`DELETE FROM warning_thresholds WHERE effect = 'mute';`);
  pgm.sql(`
    UPDATE warning_thresholds t
    SET deleted_at = NOW(), updated_at = NOW()
    WHERE t.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM warning_thresholds o
        WHERE o.deleted_at IS NULL
          AND o.min_points = t.min_points
          AND o.warning_threshold_id <> t.warning_threshold_id
          AND (o.created_at, o.warning_threshold_id) < (t.created_at, t.warning_threshold_id)
      );
  `);
  pgm.sql(`DROP INDEX IF EXISTS warning_thresholds_trigger_active_uidx;`);
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS warning_thresholds_min_points_active_uidx
      ON warning_thresholds (min_points)
      WHERE deleted_at IS NULL;
  `);

  // Bring the retired Clear / Record rows back where their slot is still free.
  pgm.sql(`
    UPDATE warning_thresholds t
    SET deleted_at = NULL, updated_at = NOW()
    WHERE t.is_system = TRUE
      AND t.effect IN ('none', 'record')
      AND t.deleted_at IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM warning_thresholds o
        WHERE o.deleted_at IS NULL AND o.min_points = t.min_points
      )
      AND t.warning_threshold_id = (
        SELECT x.warning_threshold_id FROM warning_thresholds x
        WHERE x.is_system = TRUE AND x.effect = t.effect AND x.min_points = t.min_points
        ORDER BY x.deleted_at DESC NULLS LAST
        LIMIT 1
      );
  `);
  pgm.sql(`
    UPDATE warning_thresholds
    SET label = CASE effect
          WHEN 'limited' THEN 'Limited'
          WHEN 'restricted' THEN 'Restricted'
          WHEN 'frozen' THEN 'Frozen access'
        END
    WHERE is_system = TRUE
      AND effect IN ('limited', 'restricted', 'frozen')
      AND label IN ('Limited 3 days', 'Restricted 5 days', 'Frozen access 7 days');
  `);

  pgm.sql(DROP_EFFECT_CHECKS);
  pgm.sql(`
    ALTER TABLE warning_thresholds
      ADD CONSTRAINT warning_thresholds_effect_check
      CHECK (effect IN ('none', 'record', 'limited', 'restricted', 'frozen', 'auto_suspend'));
  `);
  pgm.sql(`ALTER TABLE warning_thresholds DROP CONSTRAINT IF EXISTS warning_thresholds_duration_days_range;`);
  pgm.sql(`ALTER TABLE warning_thresholds DROP COLUMN IF EXISTS duration_days;`);
};
