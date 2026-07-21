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
  // 1. INSERT FILES
  // ============================================
  pgm.sql(`
    INSERT INTO files (
      file_id,
      name,
      path,
      mime_type,
      size_bytes,
      created_at,
      deleted_at
    ) VALUES 
    (gen_random_uuid(), 'p1.png', '/public/p1.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p2.png', '/public/p2.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p3.png', '/public/p3.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p4.png', '/public/p4.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p5.png', '/public/p5.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p6.png', '/public/p6.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p7.png', '/public/p7.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p8.png', '/public/p8.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p9.png', '/public/p9.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p10.png', '/public/p10.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p11.png', '/public/p11.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL),
    (gen_random_uuid(), 'p12.png', '/public/p12.png', 'image/png', 87, '2026-07-11 00:44:59.96505', NULL);
  `);

  // ============================================
  // 2. INSERT SYSTEM_FILES
  // Note: Need to get the file_ids from the inserted files
  // ============================================
  pgm.sql(`
    WITH inserted_files AS (
      SELECT file_id, name 
      FROM files 
      WHERE name IN ('p1.png', 'p2.png', 'p3.png', 'p4.png', 'p5.png', 'p6.png', 
                     'p7.png', 'p8.png', 'p9.png', 'p10.png', 'p11.png', 'p12.png')
      ORDER BY name
    )
    INSERT INTO system_files (
      sysfile_id,
      file_id,
      category
    )
    SELECT 
      gen_random_uuid(),
      file_id,
      'profile'
    FROM inserted_files;
  `);

  // ============================================
  // 3. INSERT SURVEY
  // ============================================
  pgm.sql(`
    INSERT INTO surveys (
      survey_id,
      survey_name,
      description,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      '11111111-1111-1111-1111-111111111111',
      'User Onboarding Survey',
      'Initial survey for new users during account setup',
      true,
      '2026-07-11 18:00:42.727689',
      '2026-07-11 18:00:42.727689'
    ) ON CONFLICT (survey_id) DO NOTHING;
  `);

  // ============================================
  // 4. INSERT QUESTIONS
  // ============================================
  pgm.sql(`
    INSERT INTO questions (
      question_id,
      survey_id,
      question_text,
      question_type,
      is_required,
      display_order,
      created_at,
      updated_at
    ) VALUES 
    (
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
      'Where did you hear about us?',
      'dropdown',
      true,
      1,
      '2026-07-11 18:00:42.727689',
      '2026-07-11 18:00:42.727689'
    ),
    (
      '33333333-3333-3333-3333-333333333333',
      '11111111-1111-1111-1111-111111111111',
      'What is your nature of work?',
      'dropdown',
      true,
      2,
      '2026-07-11 18:00:42.727689',
      '2026-07-11 18:00:42.727689'
    ),
    (
      '44444444-4444-4444-4444-444444444444',
      '11111111-1111-1111-1111-111111111111',
      'What is your purpose on the platform?',
      'multi-select',
      true,
      3,
      '2026-07-11 18:00:42.727689',
      '2026-07-11 18:00:42.727689'
    )
    ON CONFLICT (question_id) DO NOTHING;
  `);

  // ============================================
  // 5. INSERT QUESTION OPTIONS
  // ============================================
  pgm.sql(`
    INSERT INTO question_options (
      option_id,
      question_id,
      option_text,
      option_value,
      display_order,
      created_at
    ) VALUES 
    -- Options for Question 1: "Where did you hear about us?"
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-2222-2222-222222222222',
      'Social Media (Facebook/X/IG)',
      'social_media',
      1,
      '2026-07-11 18:00:42.727689'
    ),
    (
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      '22222222-2222-2222-2222-222222222222',
      'YouTube Video / Ad',
      'youtube',
      2,
      '2026-07-11 18:00:42.727689'
    ),
    (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '22222222-2222-2222-2222-222222222222',
      'Friend / Colleague Recommendation',
      'friend_recommendation',
      3,
      '2026-07-11 18:00:42.727689'
    ),
    (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      '22222222-2222-2222-2222-222222222222',
      'Online Community (Reddit/Discord)',
      'online_community',
      4,
      '2026-07-11 18:00:42.727689'
    ),
    (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      '22222222-2222-2222-2222-222222222222',
      'Search Engine (Google)',
      'search_engine',
      5,
      '2026-07-11 18:00:42.727689'
    ),
    (
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '22222222-2222-2222-2222-222222222222',
      'Other',
      'other',
      6,
      '2026-07-11 18:00:42.727689'
    ),
    
    -- Options for Question 2: "What is your nature of work?"
    (
      '11111111-1111-1111-1111-aaaaaaaaaaaa',
      '33333333-3333-3333-3333-333333333333',
      'Student (Employed)',
      'student_employed',
      1,
      '2026-07-11 18:00:42.727689'
    ),
    (
      '22222222-2222-2222-2222-bbbbbbbbbbbb',
      '33333333-3333-3333-3333-333333333333',
      'Student (Unemployed)',
      'student_unemployed',
      2,
      '2026-07-11 18:00:42.727689'
    ),
    (
      '33333333-3333-3333-3333-cccccccccccc',
      '33333333-3333-3333-3333-333333333333',
      'Full-time Employee',
      'pro_employed',
      3,
      '2026-07-11 18:00:42.727689'
    ),
    (
      '44444444-4444-4444-4444-dddddddddddd',
      '33333333-3333-3333-3333-333333333333',
      'Full-time Freelancer',
      'pro_freelance',
      4,
      '2026-07-11 18:00:42.727689'
    ),
    (
      '55555555-5555-5555-5555-eeeeeeeeeeee',
      '33333333-3333-3333-3333-333333333333',
      'Part-time Employee',
      'part_time_employed',
      5,
      '2026-07-11 18:00:42.727689'
    ),
    (
      '66666666-6666-6666-6666-ffffffffffff',
      '33333333-3333-3333-3333-333333333333',
      'Business Owner / Entrepreneur',
      'business_owner',
      6,
      '2026-07-11 18:00:42.727689'
    ),
    (
      '77777777-7777-7777-7777-aaaaaaaaaaaa',
      '33333333-3333-3333-3333-333333333333',
      'Not Working / Looking for Work',
      'not_working',
      7,
      '2026-07-11 18:00:42.727689'
    ),
    
    -- Options for Question 3: "What is your purpose on the platform?"
    (
      '88888888-8888-8888-8888-aaaaaaaaaaaa',
      '44444444-4444-4444-4444-444444444444',
      'Earn / Find Work',
      'earn',
      1,
      '2026-07-11 18:00:42.727689'
    ),
    (
      '99999999-9999-9999-9999-bbbbbbbbbbbb',
      '44444444-4444-4444-4444-444444444444',
      'Look for Service / Hire',
      'hire',
      2,
      '2026-07-11 18:00:42.727689'
    ),
    (
      'aaaaaaaa-aaaa-aaaa-aaaa-cccccccccccc',
      '44444444-4444-4444-4444-444444444444',
      'Explore / Learn',
      'explore',
      3,
      '2026-07-11 18:00:42.727689'
    )
    ON CONFLICT (option_id) DO NOTHING;
  `);
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // ============================================
  // 1. DELETE QUESTION OPTIONS
  // ============================================
  pgm.sql(`
    DELETE FROM question_options 
    WHERE question_id IN (
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444'
    );
  `);

  // ============================================
  // 2. DELETE QUESTIONS
  // ============================================
  pgm.sql(`
    DELETE FROM questions 
    WHERE survey_id = '11111111-1111-1111-1111-111111111111';
  `);

  // ============================================
  // 3. DELETE SURVEY
  // ============================================
  pgm.sql(`
    DELETE FROM surveys 
    WHERE survey_id = '11111111-1111-1111-1111-111111111111';
  `);

  // ============================================
  // 4. DELETE SYSTEM_FILES
  // ============================================
  pgm.sql(`
    DELETE FROM system_files 
    WHERE category = 'profile'
    AND file_id IN (
      SELECT file_id FROM files 
      WHERE name IN ('p1.png', 'p2.png', 'p3.png', 'p4.png', 'p5.png', 'p6.png', 
                     'p7.png', 'p8.png', 'p9.png', 'p10.png', 'p11.png', 'p12.png')
    );
  `);

  // ============================================
  // 5. DELETE FILES
  // ============================================
  pgm.sql(`
    DELETE FROM files 
    WHERE name IN ('p1.png', 'p2.png', 'p3.png', 'p4.png', 'p5.png', 'p6.png', 
                   'p7.png', 'p8.png', 'p9.png', 'p10.png', 'p11.png', 'p12.png');
  `);
};

