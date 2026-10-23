/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    DECLARE
      v_feature_id UUID;
      v_free_plan_id UUID;
      v_premium_plan_id UUID;
      v_business_plan_id UUID;
    BEGIN
      -- 1. Insert feature into features if it doesn't exist
      SELECT feature_id INTO v_feature_id FROM features WHERE feature_key = 'team_creation' LIMIT 1;
      IF v_feature_id IS NULL THEN
        v_feature_id := gen_random_uuid();
        INSERT INTO features (feature_id, feature_key, name, description)
        VALUES (v_feature_id, 'team_creation', 'Team Creation', 'Maximum teams allowed to create');
      END IF;

      -- 2. Find plans
      SELECT plan_id INTO v_free_plan_id FROM plans WHERE LOWER(name) = 'free' OR amount_php_cents = 0 ORDER BY amount_php_cents ASC LIMIT 1;
      SELECT plan_id INTO v_premium_plan_id FROM plans WHERE LOWER(name) = 'premium' LIMIT 1;
      SELECT plan_id INTO v_business_plan_id FROM plans WHERE LOWER(name) IN ('business', 'studio') LIMIT 1;

      -- 3. Insert default plan features if not already set
      IF v_free_plan_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM plan_features WHERE plan_id = v_free_plan_id AND feature_id = v_feature_id) THEN
          INSERT INTO plan_features (plan_id, feature_id, value) VALUES (v_free_plan_id, v_feature_id, '1');
        END IF;
      END IF;

      IF v_premium_plan_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM plan_features WHERE plan_id = v_premium_plan_id AND feature_id = v_feature_id) THEN
          INSERT INTO plan_features (plan_id, feature_id, value) VALUES (v_premium_plan_id, v_feature_id, '5');
        END IF;
      END IF;

      IF v_business_plan_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM plan_features WHERE plan_id = v_business_plan_id AND feature_id = v_feature_id) THEN
          INSERT INTO plan_features (plan_id, feature_id, value) VALUES (v_business_plan_id, v_feature_id, 'Unlimited');
        END IF;
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
  pgm.sql(`
    DO $$
    DECLARE
      v_feature_id UUID;
    BEGIN
      SELECT feature_id INTO v_feature_id FROM features WHERE feature_key = 'team_creation' LIMIT 1;
      IF v_feature_id IS NOT NULL THEN
        DELETE FROM plan_features WHERE feature_id = v_feature_id;
        DELETE FROM features WHERE feature_id = v_feature_id;
      END IF;
    END $$;
  `);
};
