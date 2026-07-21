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
  // 1. INSERT FEATURES
  // ============================================
  pgm.sql(`
    INSERT INTO features (
      feature_id,
      feature_key,
      name,
      description
    ) VALUES 
    (
      gen_random_uuid(),
      'export_resolution',
      'Export Resolution',
      'Maximum export quality'
    ),
    (
      gen_random_uuid(),
      'export_speed',
      'Export Speed',
      'Rendering/export speed'
    ),
    (
      gen_random_uuid(),
      'render_queue',
      'Render Queue Priority',
      'Priority in render queue'
    ),
    (
      gen_random_uuid(),
      'watermark',
      'Watermark',
      'Watermark on exported files'
    ),
    (
      gen_random_uuid(),
      'tools',
      'Tools',
      'Available editing tools'
    ),
    (
      gen_random_uuid(),
      'collaborators',
      'Collaborators',
      'Maximum collaborators'
    ),
    (
      gen_random_uuid(),
      'projects',
      'Collaborative Projects',
      'Maximum collaborative projects'
    ),
    (
      gen_random_uuid(),
      'asset_posts',
      'Asset Posts',
      'Maximum asset posts'
    ),
    (
      gen_random_uuid(),
      'profile_visibility',
      'Profile Visibility',
      'Additional profile visibility'
    ),
    (
      gen_random_uuid(),
      'badge',
      'Membership Badge',
      'Displayed membership badge'
    );
  `);

  // ============================================
  // 2. INSERT PLAN_FEATURES
  // Note: We need to map features by their feature_key
  // ============================================
  pgm.sql(`
    WITH feature_ids AS (
      SELECT 
        feature_key,
        feature_id 
      FROM features
    ),
    plan_ids AS (
      SELECT 
        name,
        plan_id 
      FROM plans
      WHERE name IN ('Free', 'Premium', 'Business')
    )
    INSERT INTO plan_features (
      plan_id,
      feature_id,
      value
    ) VALUES 
    -- Free Plan Features (plan_id 1)
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'export_resolution'),
      '720p'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'export_speed'),
      'Standard'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'render_queue'),
      'Low'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'watermark'),
      'Enabled'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'tools'),
      'Basic'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'collaborators'),
      '3'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'projects'),
      '3'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Free'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'asset_posts'),
      '1'
    ),
    -- Premium Plan Features (plan_id 2)
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'export_resolution'),
      '1080p'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'export_speed'),
      'Accelerated'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'render_queue'),
      'Priority'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'watermark'),
      'Disabled'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'tools'),
      'Premium + AI'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'collaborators'),
      '10'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'projects'),
      '10'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'asset_posts'),
      '20'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'profile_visibility'),
      '30'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Premium'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'badge'),
      'Premium'
    ),
    -- Business Plan Features (plan_id 3)
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'export_resolution'),
      '2K-4K'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'export_speed'),
      'Maximum'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'render_queue'),
      'Top'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'watermark'),
      'Disabled'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'tools'),
      'Premium + AI'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'collaborators'),
      '20'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'projects'),
      '20'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'asset_posts'),
      'Unlimited'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'profile_visibility'),
      '90'
    ),
    (
      (SELECT plan_id FROM plan_ids WHERE name = 'Business'),
      (SELECT feature_id FROM feature_ids WHERE feature_key = 'badge'),
      'Business'
    );
  `);
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // ============================================
  // 1. DELETE PLAN_FEATURES
  // ============================================
  pgm.sql(`
    DELETE FROM plan_features 
    WHERE plan_id IN (
      SELECT plan_id FROM plans WHERE name IN ('Free', 'Premium', 'Business')
    );
  `);

  // ============================================
  // 2. DELETE FEATURES
  // ============================================
  pgm.sql(`
    DELETE FROM features 
    WHERE feature_key IN (
      'export_resolution',
      'export_speed',
      'render_queue',
      'watermark',
      'tools',
      'collaborators',
      'projects',
      'asset_posts',
      'profile_visibility',
      'badge'
    );
  `);
};
