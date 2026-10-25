exports.up = (pgm) => {
  pgm.alterColumn('media_assets', 'proxy_file_id', { notNull: false });
  pgm.alterColumn('media_assets', 'thumbnail_file_id', { notNull: false });
  pgm.dropConstraint('media_asset_jobs', 'media_asset_jobs_kind_check');
  pgm.addConstraint('media_asset_jobs', 'media_asset_jobs_kind_check', {
    check: "kind IN ('image', 'video', 'audio')",
  });
};

exports.down = (pgm) => {
  // Fail rather than substitute protected originals or delete pending media.
  pgm.sql(`DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM media_assets WHERE proxy_file_id IS NULL OR thumbnail_file_id IS NULL)
      OR EXISTS (SELECT 1 FROM media_asset_jobs WHERE kind = 'image') THEN
      RAISE EXCEPTION 'Cannot revert while nullable derivatives or image jobs exist';
    END IF;
  END $$;`);
  pgm.dropConstraint('media_asset_jobs', 'media_asset_jobs_kind_check');
  pgm.addConstraint('media_asset_jobs', 'media_asset_jobs_kind_check', {
    check: "kind IN ('video', 'audio')",
  });
  pgm.alterColumn('media_assets', 'proxy_file_id', { notNull: true });
  pgm.alterColumn('media_assets', 'thumbnail_file_id', { notNull: true });
};
