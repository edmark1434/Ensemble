exports.shorthands = undefined;

const CURATED_SKILLS = [
  // 1. Everyday Basics & Fundamental Cuts
  'Trimming & Cutting',
  'Splitting Clips',
  'Rearranging Clips',
  'Removing Dead Air & Pauses',
  'Cutting Out Mistakes',
  'Cropping Video',
  'Rotating & Flipping Video',
  'Pan & Zoom (Ken Burns)',
  'Zoom In / Zoom Out Cuts',
  'Aspect Ratio Conversion (16:9 to 9:16)',
  'Overlaying Photos & Images',
  'Picture-in-Picture (PiP)',
  'Freeze Frame',
  'Adding Intro & Outro',
  'Adding Watermark & Logo',
  'Blurring Faces & Sensitive Info',
  'Screen Recording Cleanup',
  'Slideshow Video Creation',
  'Video Compilation',

  // 2. Timeline, Sequencing & Advanced Cutting
  'Rough Cut',
  'Fine Cut',
  'Multi-track Editing',
  'Multicam Editing',
  'Timeline Management',
  'Sequencing',
  'Scene Assembly',
  'Jump Cuts',
  'J-Cuts & L-Cuts',
  'B-roll Selection',
  'Shot Selection',
  'Continuity Editing',
  'Pacing & Timing',
  'Storytelling & Flow',

  // 3. Speed, Motion & Transitions
  'Transitions',
  'Simple Crossfades',
  'Fade to Black / Fade In',
  'Scene Transitions',
  'Speed Ramping',
  'Velocity Editing',
  'Slow Motion',
  'Time Lapse',
  'Stop Motion',
  'Whip Pans',
  'Video Stabilization',

  // 4. Color & Visual Grading
  'Color Grading',
  'Color Correction',
  'Brightness & Contrast Fixes',
  'LUT Application',
  'HDR Color Grading',
  'Film Emulation',
  'Cinematic Look',
  'Exposure & Balance',

  // 5. Audio & Sound Design
  'Adding Background Music',
  'Muting Original Audio',
  'Audio Fade In & Fade Out',
  'Volume Balancing',
  'Audio Ducking',
  'Audio Editing',
  'Audio Mixing',
  'Audio Cleanup',
  'Audio Mastering',
  'Sound Design',
  'Sound Effects (SFX)',
  'Voiceover Sync',
  'Music Synchronization',
  'Beat Syncing',
  'Noise Reduction',
  'Dialogue Editing',
  'Loudness Normalization',

  // 6. Motion Graphics, Text & Captions
  'Adding Text',
  'Simple Subtitles',
  'Auto-Generated Captions',
  'Keyword Highlighting',
  'Call-to-Action (CTA) Overlays',
  'Title Cards & End Screens',
  'Chapter Markers & Timestamps',
  'Motion Graphics',
  'Motion Tracking',
  'Keyframing',
  'Masking',
  'Green Screen Removal',
  'Compositing',
  'Visual Effects (VFX)',
  'Kinetic Typography',
  'Animated Captions',
  'Dynamic Captions',
  'Lower Thirds',
  'Title Animation',
  'Logo Animation',
  'Text Overlays',
  'Closed Captions',

  // 7. Content Types & Deliverable Formats
  'Vertical Video (9:16)',
  'YouTube Video Editing',
  'YouTube Shorts Editing',
  'TikTok Video Editing',
  'Instagram Reels Editing',
  'Podcast Video Editing',
  'Gaming Montage',
  'Documentary Editing',
  'Travel Vlog Editing',
  'Wedding Video Editing',
  'Music Video Editing',
  'Commercial Video Editing',
  'Explainer Video Editing',
  'Product Ads Editing',
  'Talking Head Videos',
  'Interview Editing',
  'Anime Edit',
  'Course Video Editing',

  // 8. Export & Delivery
  'Video Compression & Resizing',
  'Format Conversion (MP4 / MOV)',
  'Exporting for Social Media',
  'Thumbnail Frame Selection',
];

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  const quotedCurated = CURATED_SKILLS.map((s) => `'${s.replace(/'/g, "''")}'`).join(', ');

  // 1. Remove references to deprecated / old tags from all junction tables
  pgm.sql(`
    DELETE FROM user_tags WHERE tag_id IN (
      SELECT tag_id FROM tags WHERE name NOT IN (${quotedCurated})
    );
    DELETE FROM job_tags WHERE tag_id IN (
      SELECT tag_id FROM tags WHERE name NOT IN (${quotedCurated})
    );
    DELETE FROM gig_tags WHERE tag_id IN (
      SELECT tag_id FROM tags WHERE name NOT IN (${quotedCurated})
    );
    DELETE FROM market_asset_tags WHERE tag_id IN (
      SELECT tag_id FROM tags WHERE name NOT IN (${quotedCurated})
    );

    -- Delete old / third-party / spam tags from tags table
    DELETE FROM tags WHERE name NOT IN (${quotedCurated});
  `);

  // 2. Insert curated video editing skills if they don't already exist
  pgm.sql(`
    INSERT INTO tags (tag_id, name, created_at, deleted_at)
    SELECT gen_random_uuid(), val, NOW(), NULL
    FROM unnest(ARRAY[${quotedCurated}]) AS val
    WHERE NOT EXISTS (
      SELECT 1 FROM tags t WHERE LOWER(t.name) = LOWER(val)
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  // Down migration restores previous state or no-op if destructive cleanup was intentional
  pgm.sql(`-- No-op: tag cleanup rollback`);
};
