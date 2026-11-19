exports.up = pgm => {
  pgm.sql(`
    LOCK TABLE project_yjs_snapshots, project_saves, project_save_blocks IN ACCESS EXCLUSIVE MODE;
    -- Stop before removing a mapping if this installation has a legacy save
    -- that cannot be reproduced from the project and scene snapshot history.
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM project_saves v WHERE NOT EXISTS (
          SELECT 1 FROM project_yjs_snapshots p
          WHERE p.project_id = v.project_id AND p.yjs_snapshot_id = v.yjs_snapshot_id
        )
      ) OR EXISTS (
        SELECT 1 FROM project_save_blocks b
        JOIN project_saves v USING (project_save_id)
        JOIN yjs_snapshots root ON root.yjs_snapshot_id = v.yjs_snapshot_id
        WHERE b.yjs_snapshot_id IS DISTINCT FROM (
          SELECT h.yjs_snapshot_id FROM block_yjs_snapshots h
          JOIN blocks block USING (block_id)
          JOIN yjs_snapshots s USING (yjs_snapshot_id)
          WHERE h.block_id = b.block_id AND block.project_id = v.project_id AND s.created_at <= root.created_at
          ORDER BY s.created_at DESC, s.yjs_snapshot_id DESC LIMIT 1
        )
      ) THEN
        RAISE EXCEPTION 'Legacy save mappings differ from timestamp history; cleanup cancelled';
      END IF;
    END $$;

    ALTER TABLE project_yjs_snapshots ADD COLUMN legacy_save_ids uuid[],
      ADD COLUMN saved_by_user_id uuid REFERENCES users(user_id) ON DELETE SET NULL;
    UPDATE project_yjs_snapshots p
    SET legacy_save_ids = old.ids, saved_by_user_id = old.author
    FROM (
      SELECT project_id, yjs_snapshot_id,
             array_agg(project_save_id ORDER BY created_at DESC, project_save_id) AS ids,
             (array_agg(created_by_user_id ORDER BY created_at DESC, project_save_id)
                FILTER (WHERE created_by_user_id IS NOT NULL))[1] AS author
      FROM project_saves GROUP BY project_id, yjs_snapshot_id
    ) old
    WHERE p.project_id = old.project_id AND p.yjs_snapshot_id = old.yjs_snapshot_id;
    CREATE INDEX project_snapshot_legacy_save_ids ON project_yjs_snapshots USING gin (legacy_save_ids)
      WHERE legacy_save_ids IS NOT NULL;

    DROP TRIGGER checkpoint_save_uuid ON project_yjs_snapshots;
    DROP TRIGGER project_snapshot_initial_save ON project_yjs_snapshots;
    DROP FUNCTION record_unpaired_checkpoint();
    DROP FUNCTION record_initial_project_save();
    DROP TABLE project_save_blocks;
    DROP TABLE project_saves;
  `);
};

exports.down = pgm => {
  require('./1829000000000_project-saves').up(pgm);
  require('./1829200000000_initial-project-saves').up(pgm);
  require('./1829300000000_checkpoint-save-uuids').up(pgm);
  pgm.sql(`
    -- Replace the freshly generated historical UUIDs with the retained ones.
    UPDATE project_saves s
    SET project_save_id = coalesce(p.legacy_save_ids[1], s.project_save_id),
        created_by_user_id = p.saved_by_user_id, uses_historical_scenes = true
    FROM project_yjs_snapshots p
    WHERE p.project_id = s.project_id AND p.yjs_snapshot_id = s.yjs_snapshot_id;
    INSERT INTO project_saves (project_save_id, project_id, yjs_snapshot_id, created_at, uses_historical_scenes)
    SELECT alias.id, p.project_id, p.yjs_snapshot_id, snapshot.created_at, true
    FROM project_yjs_snapshots p JOIN yjs_snapshots snapshot USING (yjs_snapshot_id)
    CROSS JOIN LATERAL unnest(p.legacy_save_ids) WITH ORDINALITY AS alias(id, position)
    WHERE alias.position > 1;
    ALTER TABLE project_yjs_snapshots DROP COLUMN legacy_save_ids, DROP COLUMN saved_by_user_id;
  `);
};
