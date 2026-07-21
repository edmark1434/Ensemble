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
  // ============================================
  // INSERT PLATFORM PURPOSE
  // Using DO $$ block to check existence first (no unique constraint needed)
  // ============================================
  pgm.sql(`
    DO $$
    BEGIN
      -- Insert Freelancer if not exists
      IF NOT EXISTS (SELECT 1 FROM platform_purpose WHERE purpose_name = 'Freelancer') THEN
        INSERT INTO platform_purpose (plpu_id, purpose_name) 
        VALUES (gen_random_uuid(), 'Freelancer');
      END IF;

      -- Insert Client if not exists
      IF NOT EXISTS (SELECT 1 FROM platform_purpose WHERE purpose_name = 'Client') THEN
        INSERT INTO platform_purpose (plpu_id, purpose_name) 
        VALUES (gen_random_uuid(), 'Client');
      END IF;

      -- Insert Casual if not exists
      IF NOT EXISTS (SELECT 1 FROM platform_purpose WHERE purpose_name = 'Casual') THEN
        INSERT INTO platform_purpose (plpu_id, purpose_name) 
        VALUES (gen_random_uuid(), 'Casual');
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
  // ============================================
  // DELETE PLATFORM PURPOSE
  // ============================================
  pgm.sql(`
    DELETE FROM platform_purpose 
    WHERE purpose_name IN ('Freelancer', 'Client', 'Casual');
  `);
};

