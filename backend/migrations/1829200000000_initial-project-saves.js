exports.up = pgm => {
  pgm.sql(`
    ALTER TABLE project_saves ADD COLUMN is_initial boolean NOT NULL DEFAULT false;
    CREATE UNIQUE INDEX project_saves_one_initial ON project_saves (project_id) WHERE is_initial;

    CREATE FUNCTION record_initial_project_save() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM project_yjs_snapshots
        WHERE project_id = NEW.project_id AND yjs_snapshot_id <> NEW.yjs_snapshot_id
      ) THEN
        INSERT INTO project_saves (project_id, yjs_snapshot_id, created_at, is_initial)
        SELECT NEW.project_id, yjs_snapshot_id, created_at, true FROM yjs_snapshots
        WHERE yjs_snapshot_id = NEW.yjs_snapshot_id
        ON CONFLICT (project_id) WHERE is_initial DO NOTHING;
      END IF;
      RETURN NEW;
    END;
    $$;
    CREATE TRIGGER project_snapshot_initial_save AFTER INSERT ON project_yjs_snapshots
      FOR EACH ROW EXECUTE FUNCTION record_initial_project_save();

    WITH first_snapshot AS (
      SELECT DISTINCT ON (link.project_id) link.project_id, snap.yjs_snapshot_id, snap.created_at
      FROM project_yjs_snapshots link
      JOIN yjs_snapshots snap USING (yjs_snapshot_id)
      ORDER BY link.project_id, snap.created_at, snap.yjs_snapshot_id
    )
    INSERT INTO project_saves (project_id, yjs_snapshot_id, created_at, is_initial)
    SELECT f.project_id, f.yjs_snapshot_id, f.created_at, true FROM first_snapshot f
    WHERE NOT EXISTS (
      SELECT 1 FROM project_saves s WHERE s.project_id = f.project_id AND s.yjs_snapshot_id = f.yjs_snapshot_id
    );
  `);
};

exports.down = pgm => {
  pgm.sql(`
    DROP TRIGGER project_snapshot_initial_save ON project_yjs_snapshots;
    DROP FUNCTION record_initial_project_save();
    DELETE FROM project_saves WHERE is_initial;
    ALTER TABLE project_saves DROP COLUMN is_initial;
  `);
};
