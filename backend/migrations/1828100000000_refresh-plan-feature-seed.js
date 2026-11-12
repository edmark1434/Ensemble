exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO features (feature_id, feature_key, name, description)
    VALUES ('ad9810a7-2825-424e-9521-6fbbc05bc6ea', 'render_workers', 'Render Workers', 'Lambda workers used per video export');

    INSERT INTO plan_features (plan_id, feature_id, value)
    VALUES
      ('44541c21-0811-421f-8ad5-0e85f5cffea0', 'ad9810a7-2825-424e-9521-6fbbc05bc6ea', '2'),
      ('4613a2ba-8fe3-4b9f-aa93-8dc2f09cbd28', 'ad9810a7-2825-424e-9521-6fbbc05bc6ea', '21'),
      ('a010fbca-bf0f-4e87-9e52-c9ffc35821e2', 'ad9810a7-2825-424e-9521-6fbbc05bc6ea', '40');

    INSERT INTO configuration
      (configuration_key, name, description, current_value_literal, default_value_literal)
    VALUES
      ('rendering.stillsAudioBudget', 'Image and audio render budget',
       'Lambda invocations reserved for image and audio exports. Image costs 1, audio costs 2.', '50', '50'),
      ('rendering.freeOverflowBudget', 'Free overflow render budget',
       'Lambda invocations reserved for free video exports that overflow from the render server. Each export costs free workers + 1.', '48', '48');

    UPDATE plan_features pf
    SET value = CASE f.feature_key WHEN 'export_resolution' THEN '4K' ELSE 'Unlimited' END
    FROM features f, plans p
    WHERE pf.feature_id = f.feature_id AND pf.plan_id = p.plan_id
      AND LOWER(p.name) IN ('business', 'studio')
      AND f.feature_key IN ('export_resolution', 'projects');

    INSERT INTO features (feature_key, name, description)
    VALUES
      ('export_frame_rate', 'Export Frame Rate', 'Maximum export frame rate'),
      ('personal_upload_storage', 'Personal Upload Storage', 'Personal upload storage limit');

    INSERT INTO plan_features (plan_id, feature_id, value)
    SELECT p.plan_id, f.feature_id,
      CASE f.feature_key
        WHEN 'export_frame_rate' THEN CASE WHEN LOWER(p.name) = 'free' THEN '30 fps' ELSE '60 fps' END
        ELSE CASE LOWER(p.name) WHEN 'free' THEN '5GB' WHEN 'premium' THEN '100GB' ELSE '1TB' END
      END
    FROM plans p CROSS JOIN features f
    WHERE LOWER(p.name) IN ('free', 'premium', 'business', 'studio')
      AND f.feature_key IN ('export_frame_rate', 'personal_upload_storage');

    DELETE FROM plan_features WHERE feature_id IN (
      SELECT feature_id FROM features WHERE feature_key IN ('tools', 'export_speed', 'render_queue')
    );
    DELETE FROM features WHERE feature_key IN ('tools', 'export_speed', 'render_queue');
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM configuration
    WHERE configuration_key IN ('rendering.stillsAudioBudget', 'rendering.freeOverflowBudget');
    DELETE FROM plan_features WHERE feature_id = 'ad9810a7-2825-424e-9521-6fbbc05bc6ea';
    DELETE FROM features WHERE feature_id = 'ad9810a7-2825-424e-9521-6fbbc05bc6ea';

    DELETE FROM plan_features WHERE feature_id IN (
      SELECT feature_id FROM features WHERE feature_key IN ('export_frame_rate', 'personal_upload_storage')
    );
    DELETE FROM features WHERE feature_key IN ('export_frame_rate', 'personal_upload_storage');

    UPDATE plan_features pf
    SET value = CASE f.feature_key WHEN 'export_resolution' THEN '2K-4K' ELSE '20' END
    FROM features f, plans p
    WHERE pf.feature_id = f.feature_id AND pf.plan_id = p.plan_id
      AND LOWER(p.name) IN ('business', 'studio')
      AND f.feature_key IN ('export_resolution', 'projects');

    -- Restore the previous seed defaults.
    INSERT INTO features (feature_key, name, description)
    VALUES
      ('tools', 'Tools', 'Available editing tools'),
      ('export_speed', 'Export Speed', 'Rendering/export speed'),
      ('render_queue', 'Render Queue Priority', 'Priority in render queue');

    INSERT INTO plan_features (plan_id, feature_id, value)
    SELECT p.plan_id, f.feature_id,
      CASE f.feature_key
        WHEN 'tools' THEN CASE WHEN LOWER(p.name) = 'free' THEN 'Basic' ELSE 'Premium + AI' END
        WHEN 'export_speed' THEN CASE LOWER(p.name) WHEN 'free' THEN 'Standard' WHEN 'premium' THEN 'Accelerated' ELSE 'Maximum' END
        ELSE CASE LOWER(p.name) WHEN 'free' THEN 'Low' WHEN 'premium' THEN 'Priority' ELSE 'Top' END
      END
    FROM plans p CROSS JOIN features f
    WHERE LOWER(p.name) IN ('free', 'premium', 'business', 'studio')
      AND f.feature_key IN ('tools', 'export_speed', 'render_queue');
  `);
};
