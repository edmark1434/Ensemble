exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
  // ============================================
  // INSERT NEW SKILLS
  // ============================================
  pgm.sql(`
    INSERT INTO tags (
      tag_id,
      name,
      created_at,
      deleted_at
    ) VALUES 
    (gen_random_uuid(), 'Layouts', NOW(), NULL),
    (gen_random_uuid(), 'Arranging Clips', NOW(), NULL),
    (gen_random_uuid(), 'Clip Arrangement', NOW(), NULL),
    (gen_random_uuid(), 'Timeline Layout', NOW(), NULL),
    (gen_random_uuid(), 'Timeline Management', NOW(), NULL),
    (gen_random_uuid(), 'Sequencing', NOW(), NULL)
    ON CONFLICT DO NOTHING;
  `);

  // ============================================
  // CLEANUP SPAM SKILLS
  // ============================================
  // Delete references from junction tables first to avoid FK constraint errors
  const spamTags = [
    'sss', 'sssa', 'aaaa', 'sdas', 'asdas', 'asdasd', 'a', 'emo', 'goth', 'sad', 
    'as', 'asdd', 'aaa', 'You', 'aa', 'ddd', 'ss', 'dd', 's', 'asd', 'Holy Joly', 
    'Editing', 'Triming', 'e asd', 'asdk', 'lll', 'sd jasd', 'asdnd'
  ];
  
  const spamList = spamTags.map(t => "'" + t + "'").join(', ');

  pgm.sql(`
    DELETE FROM user_tags WHERE tag_id IN (SELECT tag_id FROM tags WHERE name IN (${spamList}));
    DELETE FROM job_tags WHERE tag_id IN (SELECT tag_id FROM tags WHERE name IN (${spamList}));
    DELETE FROM gig_tags WHERE tag_id IN (SELECT tag_id FROM tags WHERE name IN (${spamList}));
    DELETE FROM market_asset_tags WHERE tag_id IN (SELECT tag_id FROM tags WHERE name IN (${spamList}));
    
    DELETE FROM tags WHERE name IN (${spamList});
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
      'Layouts', 'Arranging Clips', 'Clip Arrangement', 
      'Timeline Layout', 'Timeline Management', 'Sequencing'
    );
  `);
};
