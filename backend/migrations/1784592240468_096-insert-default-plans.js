/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // Insert default plans
  pgm.sql(`
    DO $$
    BEGIN
      -- Insert Free plan if not exists
      IF NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Free') THEN
        INSERT INTO plans (
          plan_id,
          name,
          description,
          billing_period,
          amount_php_cents,
          created_at,
          updated_at,
          days_of_trials
        ) VALUES (
          gen_random_uuid(),
          'Free',
          'Free membership',
          'MONTH',
          0,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          0
        );
      END IF;

      -- Insert Premium plan if not exists
      IF NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Premium') THEN
        INSERT INTO plans (
          plan_id,
          name,
          description,
          billing_period,
          amount_php_cents,
          created_at,
          updated_at,
          days_of_trials
        ) VALUES (
          gen_random_uuid(),
          'Premium',
          'Premium monthly membership',
          'MONTH',
          59900,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          7
        );
      END IF;

      -- Insert Business plan if not exists
      IF NOT EXISTS (SELECT 1 FROM plans WHERE name = 'Business') THEN
        INSERT INTO plans (
          plan_id,
          name,
          description,
          billing_period,
          amount_php_cents,
          created_at,
          updated_at,
          days_of_trials
        ) VALUES (
          gen_random_uuid(),
          'Business',
          'Business monthly membership',
          'MONTH',
          350000,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          0
        );
      END IF;
    END $$;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Remove default plans
  pgm.sql(`
    DELETE FROM plans 
    WHERE name IN ('Free', 'Premium', 'Business');
  `);
};

