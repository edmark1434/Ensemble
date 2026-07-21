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
  // INSERT TAGS (66 video editing related tags)
  // ============================================
  pgm.sql(`
    INSERT INTO tags (
      tag_id,
      name,
      created_at,
      deleted_at
    ) VALUES 
    (gen_random_uuid(), 'Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Avid Media Composer', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Color Grading', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Color Correction', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'LUT Creation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'HDR Color Grading', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Motion Graphics', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Kinetic Typography', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Logo Animation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Title Animation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Lower Third Design', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Visual Effects (VFX)', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Compositing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Green Screen Removal', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Rotoscoping', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Motion Tracking', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), '3D Camera Tracking', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Audio Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Audio Mixing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Sound Design', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Noise Reduction', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Voice Sync', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Music Synchronization', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'YouTube Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'YouTube Shorts Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'TikTok Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Instagram Reels Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Facebook Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Podcast Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Short-Form Content Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Long-Form Content Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Documentary Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Corporate Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Commercial Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Wedding Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Real Estate Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Event Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Interview Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Course Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Subtitling', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Closed Captions', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Caption Animation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), '2D Animation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), '3D Animation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Character Animation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Explainer Videos', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Storyboarding', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Video Production', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Post-Production', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Video Compression', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Video Encoding', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Media Management', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Drone Footage Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Multicam Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Highlight Reels', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Trailer Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Promo Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Social Media Content Creation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Adobe Creative Cloud', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Adobe Audition', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Photoshop for Video', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'Illustrator for Motion Graphics', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'AI Video Editing', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'AI Voice Cleanup', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'AI Subtitle Generation', '2026-06-18 04:00:45.624595', NULL),
    (gen_random_uuid(), 'AI Video Upscaling', '2026-06-18 04:00:45.624595', NULL);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // ============================================
  // DELETE TAGS
  // ============================================
  pgm.sql(`
    DELETE FROM tags 
    WHERE name IN (
      'Video Editing',
      'Avid Media Composer',
      'Color Grading',
      'Color Correction',
      'LUT Creation',
      'HDR Color Grading',
      'Motion Graphics',
      'Kinetic Typography',
      'Logo Animation',
      'Title Animation',
      'Lower Third Design',
      'Visual Effects (VFX)',
      'Compositing',
      'Green Screen Removal',
      'Rotoscoping',
      'Motion Tracking',
      '3D Camera Tracking',
      'Audio Editing',
      'Audio Mixing',
      'Sound Design',
      'Noise Reduction',
      'Voice Sync',
      'Music Synchronization',
      'YouTube Video Editing',
      'YouTube Shorts Editing',
      'TikTok Video Editing',
      'Instagram Reels Editing',
      'Facebook Video Editing',
      'Podcast Video Editing',
      'Short-Form Content Editing',
      'Long-Form Content Editing',
      'Documentary Editing',
      'Corporate Video Editing',
      'Commercial Video Editing',
      'Wedding Video Editing',
      'Real Estate Video Editing',
      'Event Video Editing',
      'Interview Editing',
      'Course Video Editing',
      'Subtitling',
      'Closed Captions',
      'Caption Animation',
      '2D Animation',
      '3D Animation',
      'Character Animation',
      'Explainer Videos',
      'Storyboarding',
      'Video Production',
      'Post-Production',
      'Video Compression',
      'Video Encoding',
      'Media Management',
      'Drone Footage Editing',
      'Multicam Editing',
      'Highlight Reels',
      'Trailer Editing',
      'Promo Video Editing',
      'Social Media Content Creation',
      'Adobe Creative Cloud',
      'Adobe Audition',
      'Photoshop for Video',
      'Illustrator for Motion Graphics',
      'AI Video Editing',
      'AI Voice Cleanup',
      'AI Subtitle Generation',
      'AI Video Upscaling'
    );
  `);
};
