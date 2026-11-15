exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO features (feature_key, name, description)
    VALUES ('video_upload_resolution', 'Video Upload Resolution', 'Maximum video upload quality');

    INSERT INTO plan_features (plan_id, feature_id, value)
    SELECT p.plan_id, f.feature_id, limits.value
    FROM plans p
    JOIN (VALUES ('free', '1080p'), ('premium', '1080p'), ('business', '4K'), ('studio', '4K'))
      AS limits(plan_name, value) ON LOWER(p.name) = limits.plan_name
    CROSS JOIN features f
    WHERE f.feature_key = 'video_upload_resolution';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM plan_features WHERE feature_id IN (
      SELECT feature_id FROM features WHERE feature_key = 'video_upload_resolution'
    );
    DELETE FROM features WHERE feature_key = 'video_upload_resolution';
  `);
};
