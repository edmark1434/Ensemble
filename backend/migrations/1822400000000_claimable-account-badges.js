/**
 * Badges become claimable: grants start as `pending`, are delivered through a
 * System notification, and only `claimed` badges are shown publicly.
 * Existing rows are treated as already claimed.
 */
const REGISTRY_BADGES = [
  ['acc-alpha', 'Alpha Tester', 'Granted to core ecosystem pioneers who tested the platform during its early alpha stages.'],
  ['acc-beta', 'Beta Tester', 'Granted to core ecosystem pioneers who tested the platform during its early beta stages.'],
  ['setup-profile', 'Profile Complete', 'Granted to users who have successfully fully completed their profile setup.'],
  ['acc-freelance-1', 'Fresh Freelancer', 'Granted to users who have newly started becoming a freelancer on this platform.'],
  ['acc-freelance-2', 'Rising Freelancer', 'Granted to active freelancers establishing a consistent workspace pipeline.'],
  ['acc-freelance-3', 'Elite Freelancer', 'Granted to high-tier freelancers delivering premium-grade production deliverables.'],
  ['acc-freelance-4', 'Grand Freelancer', 'The absolute pinnacle of freelance production excellence across the platform ecosystem.'],
  ['acc-client-1', 'Fresh Client', 'Granted to users who have successfully become a Client for the first time.'],
  ['acc-client-2', 'Rising Client', 'Granted to clients expanding their workforce layout and regular contract deployments.'],
  ['acc-client-3', 'Elite Client', 'Granted to trusted high-volume spenders and milestone managers inside the hub.'],
  ['acc-client-4', 'Grand Client', 'Ecosystem power client commanding substantial studio pipelines and commercial arrays.'],
  ['acc-asset-1', 'Fresh Creator', 'Granted to users who have successfully uploaded their first production asset.'],
  ['acc-asset-2', 'Rising Creator', 'Granted to assets creators with growing distribution tracking metrics.'],
  ['acc-asset-3', 'Elite Creator', 'Granted to top-tier library authors crafting high-fidelity design standards.'],
  ['acc-asset-4', 'Grand Creator', 'Legendary library architect setting the structural baseline style across the global market.'],
];

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_badges' AND column_name = 'account_badge_id') THEN
            ALTER TABLE account_badges
              ADD COLUMN account_badge_id uuid NOT NULL DEFAULT gen_random_uuid(),
              ADD COLUMN status varchar(20) NOT NULL DEFAULT 'claimed',
              ADD COLUMN granted_by_staff_id uuid,
              ADD COLUMN grant_message text,
              ADD COLUMN claimed_at timestamp without time zone,
              ADD COLUMN revoked_at timestamp without time zone;

            UPDATE account_badges SET claimed_at = created_at WHERE claimed_at IS NULL;

            ALTER TABLE account_badges ALTER COLUMN status SET DEFAULT 'pending';
            ALTER TABLE account_badges ADD CONSTRAINT account_badges_account_badge_id_key UNIQUE (account_badge_id);
            ALTER TABLE account_badges ADD CONSTRAINT account_badges_status_check
              CHECK (status IN ('pending', 'claimed', 'revoked'));

            INSERT INTO badge_categories (name, description)
            SELECT 'Platform', 'Platform-granted account badges'
            WHERE NOT EXISTS (SELECT 1 FROM badge_categories);
        END IF;
    END $$;
    CREATE INDEX IF NOT EXISTS idx_account_badges_account_status ON account_badges (account_id, status);
  `);

  const literal = (value) => `'${String(value).replace(/'/g, "''")}'`;
  for (const [registryId, name, description] of REGISTRY_BADGES) {
    pgm.sql(`
      INSERT INTO badges (registry_id, name, description, is_secret, trigger_event_code, condition_type, condition_value, badge_category_id)
      SELECT ${literal(registryId)}, ${literal(name)}, ${literal(description)},
             false, 'admin_grant', 'manual', 1,
             (SELECT badge_category_id FROM badge_categories ORDER BY created_at LIMIT 1)
      ON CONFLICT (registry_id) DO NOTHING;
    `);
  }
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_account_badges_account_status;
    DELETE FROM account_badges WHERE status <> 'claimed';
    ALTER TABLE account_badges
      DROP CONSTRAINT IF EXISTS account_badges_status_check,
      DROP CONSTRAINT IF EXISTS account_badges_account_badge_id_key,
      DROP COLUMN IF EXISTS revoked_at,
      DROP COLUMN IF EXISTS claimed_at,
      DROP COLUMN IF EXISTS grant_message,
      DROP COLUMN IF EXISTS granted_by_staff_id,
      DROP COLUMN IF EXISTS status,
      DROP COLUMN IF EXISTS account_badge_id;
  `);
};
