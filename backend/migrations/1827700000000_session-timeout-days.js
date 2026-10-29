/**
 * Convert session timeout setting from minutes to days.
 * Key: platform.sessionTimeoutMinutes -> platform.sessionTimeoutDays
 */

/** @param pgm {import('node-pg-migrate').MigrationBuilder} */
exports.up = async (pgm) => {
  await pgm.db.query(`
    DO $$
    DECLARE
      old_val text;
      new_days text := '30';
    BEGIN
      SELECT current_value_literal INTO old_val
      FROM configuration
      WHERE configuration_key = 'platform.sessionTimeoutMinutes';

      IF old_val IS NOT NULL THEN
        IF old_val ~ '^[0-9]+$' THEN
          IF old_val::numeric >= 1440 THEN
            new_days := GREATEST(1, ROUND(old_val::numeric / 1440))::text;
          ELSE
            new_days := '1';
          END IF;
        END IF;
        DELETE FROM configuration WHERE configuration_key = 'platform.sessionTimeoutMinutes';
      END IF;

      INSERT INTO configuration (
        configuration_key, name, description, current_value_literal, default_value_literal, updated_at
      ) VALUES (
        'platform.sessionTimeoutDays',
        'Session timeout (days)',
        'Idle session lifetime in days.',
        new_days,
        '30',
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (configuration_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        default_value_literal = EXCLUDED.default_value_literal;
    END $$;
  `);
};

exports.down = async (pgm) => {
  await pgm.db.query(`
    DO $$
    DECLARE
      days_val text;
      minutes_val text := '43200';
    BEGIN
      SELECT current_value_literal INTO days_val
      FROM configuration
      WHERE configuration_key = 'platform.sessionTimeoutDays';

      IF days_val IS NOT NULL THEN
        IF days_val ~ '^[0-9]+$' THEN
          minutes_val := (days_val::numeric * 1440)::text;
        END IF;
        DELETE FROM configuration WHERE configuration_key = 'platform.sessionTimeoutDays';
      END IF;

      INSERT INTO configuration (
        configuration_key, name, description, current_value_literal, default_value_literal, updated_at
      ) VALUES (
        'platform.sessionTimeoutMinutes',
        'Session timeout (minutes)',
        'Idle session lifetime in minutes.',
        minutes_val,
        '60',
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (configuration_key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        default_value_literal = EXCLUDED.default_value_literal;
    END $$;
  `);
};
