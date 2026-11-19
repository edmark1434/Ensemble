exports.up = pgm => {
  pgm.sql(`
    LOCK TABLE project_yjs_snapshots IN SHARE ROW EXCLUSIVE MODE;
    ALTER TABLE project_saves ADD COLUMN uses_historical_scenes boolean NOT NULL DEFAULT false;
    CREATE INDEX project_saves_project_snapshot_idx ON project_saves (project_id, yjs_snapshot_id);

    INSERT INTO project_saves (project_id, yjs_snapshot_id, created_at, uses_historical_scenes)
    SELECT link.project_id, link.yjs_snapshot_id, snapshot.created_at, true
    FROM project_yjs_snapshots link JOIN yjs_snapshots snapshot USING (yjs_snapshot_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM project_saves s
      WHERE s.project_id = link.project_id AND s.yjs_snapshot_id = link.yjs_snapshot_id
    );

    -- Older writers can still checkpoint during a rolling deployment. Wait for
    -- the transaction to finish linking any explicitly captured scene versions.
    CREATE FUNCTION record_unpaired_checkpoint() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      INSERT INTO project_saves (project_id, yjs_snapshot_id, created_at, uses_historical_scenes)
      SELECT NEW.project_id, snapshot.yjs_snapshot_id, snapshot.created_at, true
      FROM yjs_snapshots snapshot WHERE snapshot.yjs_snapshot_id = NEW.yjs_snapshot_id
        AND NOT EXISTS (
          SELECT 1 FROM project_saves s
          WHERE s.project_id = NEW.project_id AND s.yjs_snapshot_id = NEW.yjs_snapshot_id
        );
      RETURN NULL;
    END;
    $$;
    CREATE CONSTRAINT TRIGGER checkpoint_save_uuid AFTER INSERT ON project_yjs_snapshots
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION record_unpaired_checkpoint();
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP TRIGGER checkpoint_save_uuid ON project_yjs_snapshots;
    DROP FUNCTION record_unpaired_checkpoint();
    DELETE FROM project_saves WHERE uses_historical_scenes;
    DROP INDEX project_saves_project_snapshot_idx;
    ALTER TABLE project_saves DROP COLUMN uses_historical_scenes;
  `);
};
