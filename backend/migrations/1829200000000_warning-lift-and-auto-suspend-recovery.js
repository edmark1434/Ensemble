/**
 * Warning point lifts and auto-suspension recovery.
 *
 * - `violations.points_original`: the points a warning was issued with. Set the first time staff
 *   lift points off it; `points` then holds what still counts. A warning lifted to zero gets
 *   status `lifted` and stops counting, but stays on the Record.
 * - `warning_thresholds.lift_at_merit`: on an auto-suspend row, the Platform Merit (100 minus
 *   active warning points) at which that auto-suspension ends early. NULL keeps the full clock.
 * - `accounts.suspension_source` / `accounts.auto_suspend_lift_merit`: set when the warning
 *   engine suspends an account, so only engine suspensions are lifted by recovered merit. Any
 *   staff status change clears them.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('violations', {
    points_original: { type: 'smallint', notNull: false },
  });

  pgm.addColumn('warning_thresholds', {
    lift_at_merit: { type: 'smallint', notNull: false },
  });
  pgm.addConstraint('warning_thresholds', 'warning_thresholds_lift_at_merit_range', {
    check: 'lift_at_merit IS NULL OR (lift_at_merit BETWEEN 1 AND 100)',
  });

  pgm.addColumn('accounts', {
    suspension_source: { type: 'varchar(16)', notNull: false },
    auto_suspend_lift_merit: { type: 'smallint', notNull: false },
  });

  // Seeded auto-suspend rows end early once the member is out of auto-suspend range:
  // merit above 100 minus the lowest auto-suspend trigger (20 points → merit 81).
  pgm.sql(`
    UPDATE warning_thresholds
    SET lift_at_merit = GREATEST(1, LEAST(100, 101 - (
          SELECT MIN(min_points) FROM warning_thresholds
          WHERE effect = 'auto_suspend' AND deleted_at IS NULL
        ))),
        updated_at = NOW()
    WHERE effect = 'auto_suspend'
      AND deleted_at IS NULL
      AND lift_at_merit IS NULL;
  `);

  // Accounts serving an engine suspension right now: the latest status change was the
  // warning engine's auto-suspend.
  pgm.sql(`
    UPDATE accounts a
    SET suspension_source = 'auto',
        auto_suspend_lift_merit = (
          SELECT MAX(lift_at_merit) FROM warning_thresholds
          WHERE effect = 'auto_suspend' AND deleted_at IS NULL
        )
    WHERE LOWER(COALESCE(a.status, '')) = 'suspended'
      AND (
        SELECT aa.metadata->>'action'
        FROM account_activity aa
        WHERE aa.account_id = a.account_id
          AND aa.event_code = 'ACCOUNT_STATUS_CHANGED'
        ORDER BY aa.created_at DESC
        LIMIT 1
      ) = 'auto_suspend';
  `);
};

exports.down = (pgm) => {
  // Lifts already given stay given: a fully lifted warning becomes rescinded so it keeps not
  // counting, and partly lifted warnings keep their reduced points.
  pgm.sql(`UPDATE violations SET status = 'rescinded' WHERE LOWER(COALESCE(status, '')) = 'lifted';`);
  pgm.dropColumn('accounts', ['suspension_source', 'auto_suspend_lift_merit'], { ifExists: true });
  pgm.dropConstraint('warning_thresholds', 'warning_thresholds_lift_at_merit_range', { ifExists: true });
  pgm.dropColumn('warning_thresholds', 'lift_at_merit', { ifExists: true });
  pgm.dropColumn('violations', 'points_original', { ifExists: true });
};
