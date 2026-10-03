exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO tags (
      tag_id,
      name,
      created_at,
      deleted_at
    ) VALUES 
    (gen_random_uuid(), 'Captioning', NOW(), NULL),
    (gen_random_uuid(), 'Auto-captioning', NOW(), NULL),
    (gen_random_uuid(), 'Dynamic Captions', NOW(), NULL),
    (gen_random_uuid(), 'Subtitling & Closed Captions', NOW(), NULL),
    (gen_random_uuid(), 'Scene Selection', NOW(), NULL),
    (gen_random_uuid(), 'Scene Assembly', NOW(), NULL),
    (gen_random_uuid(), 'Scene Framing', NOW(), NULL),
    (gen_random_uuid(), 'Scene Transitions', NOW(), NULL),
    (gen_random_uuid(), 'Ensemble Editing', NOW(), NULL),
    (gen_random_uuid(), 'Multi-camera Scene Editing', NOW(), NULL),
    (gen_random_uuid(), 'Shot Selection', NOW(), NULL),
    (gen_random_uuid(), 'Dialogue Editing', NOW(), NULL),
    (gen_random_uuid(), 'Continuity Editing', NOW(), NULL),
    (gen_random_uuid(), 'Pacing & Timing', NOW(), NULL)
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
      'Captioning', 'Auto-captioning', 'Dynamic Captions', 'Subtitling & Closed Captions',
      'Scene Selection', 'Scene Assembly', 'Scene Framing', 'Scene Transitions',
      'Ensemble Editing', 'Multi-camera Scene Editing', 'Shot Selection',
      'Dialogue Editing', 'Continuity Editing', 'Pacing & Timing'
    );
  `);
};
