exports.up = pgm => {
  pgm.sql(`
    ALTER TABLE project_yjs_snapshots
      DROP COLUMN legacy_save_ids,
      DROP COLUMN saved_by_user_id;
  `);
};

exports.down = pgm => {
  pgm.sql(`
    ALTER TABLE project_yjs_snapshots
      ADD COLUMN legacy_save_ids uuid[],
      ADD COLUMN saved_by_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL;
    CREATE INDEX project_snapshot_legacy_save_ids
      ON project_yjs_snapshots USING gin (legacy_save_ids)
      WHERE legacy_save_ids IS NOT NULL;
  `);
};
