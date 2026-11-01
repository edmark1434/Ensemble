exports.up = (pgm) => {
  pgm.addColumns('media_assets', {
    trashed_at: { type: 'timestamp without time zone' },
  });
  pgm.createIndex('media_assets', ['owner_user_id', 'trashed_at'], {
    name: 'media_assets_trash_owner_date_idx',
    where: 'trashed_at IS NOT NULL AND deleted_at IS NULL',
  });
  pgm.addColumns('projects', { trashed_at: { type: 'timestamp without time zone' } });
};

exports.down = (pgm) => {
  pgm.dropIndex('media_assets', ['owner_user_id', 'trashed_at'], { name: 'media_assets_trash_owner_date_idx' });
  pgm.dropColumns('media_assets', ['trashed_at']);
  pgm.dropColumns('projects', ['trashed_at']);
};
