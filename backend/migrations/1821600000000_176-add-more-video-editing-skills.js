exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // ============================================
  // INSERT MORE TAGS (Specific software and basic skills)
  // ============================================
  pgm.sql(`
    INSERT INTO tags (
      tag_id,
      name,
      created_at,
      deleted_at
    ) VALUES 
    (gen_random_uuid(), 'Premiere Pro', NOW(), NULL),
    (gen_random_uuid(), 'DaVinci Resolve', NOW(), NULL),
    (gen_random_uuid(), 'Final Cut Pro', NOW(), NULL),
    (gen_random_uuid(), 'CapCut', NOW(), NULL),
    (gen_random_uuid(), 'After Effects', NOW(), NULL),
    (gen_random_uuid(), 'Sony Vegas Pro', NOW(), NULL),
    (gen_random_uuid(), 'Filmora', NOW(), NULL),
    (gen_random_uuid(), 'iMovie', NOW(), NULL),
    (gen_random_uuid(), 'LumaFusion', NOW(), NULL),
    (gen_random_uuid(), 'Transitions', NOW(), NULL),
    (gen_random_uuid(), 'Cutting & Trimming', NOW(), NULL),
    (gen_random_uuid(), 'B-roll Selection', NOW(), NULL),
    (gen_random_uuid(), 'Audio Syncing', NOW(), NULL),
    (gen_random_uuid(), 'Proxy Editing', NOW(), NULL),
    (gen_random_uuid(), 'Frame Rate Conversion', NOW(), NULL),
    (gen_random_uuid(), 'Aspect Ratio Conversion', NOW(), NULL),
    (gen_random_uuid(), 'Video Stabilization', NOW(), NULL),
    (gen_random_uuid(), 'Stop Motion', NOW(), NULL),
    (gen_random_uuid(), 'Time Lapse', NOW(), NULL),
    (gen_random_uuid(), 'Slow Motion', NOW(), NULL),
    (gen_random_uuid(), 'Keyframing', NOW(), NULL),
    (gen_random_uuid(), 'Masking', NOW(), NULL),
    (gen_random_uuid(), 'Script Syncing', NOW(), NULL),
    (gen_random_uuid(), 'Multi-track Editing', NOW(), NULL),
    (gen_random_uuid(), 'Text Overlays', NOW(), NULL),
    (gen_random_uuid(), 'Montage', NOW(), NULL),
    (gen_random_uuid(), 'Rough Cut', NOW(), NULL),
    (gen_random_uuid(), 'Fine Cut', NOW(), NULL),
    (gen_random_uuid(), 'Vlog Editing', NOW(), NULL),
    (gen_random_uuid(), 'Gameplay Editing', NOW(), NULL),
    (gen_random_uuid(), 'Stream Highlights', NOW(), NULL),
    (gen_random_uuid(), 'Reaction Video Editing', NOW(), NULL),
    (gen_random_uuid(), 'Jump Cuts', NOW(), NULL),
    (gen_random_uuid(), 'J-Cuts & L-Cuts', NOW(), NULL),
    (gen_random_uuid(), 'Whip Pans', NOW(), NULL),
    (gen_random_uuid(), 'Speed Ramping', NOW(), NULL)
    ON CONFLICT DO NOTHING;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM tags 
    WHERE name IN (
      'Premiere Pro', 'DaVinci Resolve', 'Final Cut Pro', 'CapCut', 
      'After Effects', 'Sony Vegas Pro', 'Filmora', 'iMovie', 'LumaFusion', 
      'Transitions', 'Cutting & Trimming', 'B-roll Selection', 'Audio Syncing', 
      'Proxy Editing', 'Frame Rate Conversion', 'Aspect Ratio Conversion', 
      'Video Stabilization', 'Stop Motion', 'Time Lapse', 'Slow Motion', 
      'Keyframing', 'Masking', 'Script Syncing', 'Multi-track Editing', 
      'Text Overlays', 'Montage', 'Rough Cut', 'Fine Cut', 'Vlog Editing', 
      'Gameplay Editing', 'Stream Highlights', 'Reaction Video Editing', 
      'Jump Cuts', 'J-Cuts & L-Cuts', 'Whip Pans', 'Speed Ramping'
    );
  `);
};
