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
    pgm.sql(`
        TRUNCATE TABLE
            project_yjs_updates,
            project_yjs_snapshots,
            block_yjs_updates,
            block_yjs_snapshots,
            yjs_updates,
            yjs_snapshots;
    `);

    pgm.dropConstraint("project_yjs_snapshots", "project_yjs_snapshots_yjs_snapshot_id_fkey");
    pgm.dropConstraint("project_yjs_updates", "project_yjs_updates_yjs_update_id_fkey");
    pgm.dropConstraint("block_yjs_snapshots", "block_yjs_snapshots_yjs_snapshot_id_fkey");
    pgm.dropConstraint("block_yjs_updates", "block_yjs_updates_yjs_update_id_fkey");

    // yjs_snapshots: uuid -> bigserial
    pgm.dropConstraint("yjs_snapshots", "yjs_snapshots_pkey");
    pgm.dropColumn("yjs_snapshots", "yjs_snapshot_id");
    pgm.addColumn("yjs_snapshots", {
        yjs_snapshot_id: { type: "bigserial", primaryKey: true },
    });

    // yjs_updates: uuid -> bigserial
    pgm.dropConstraint("yjs_updates", "yjs_updates_pkey");
    pgm.dropColumn("yjs_updates", "yjs_update_id");
    pgm.addColumn("yjs_updates", {
        yjs_update_id: { type: "bigserial", primaryKey: true },
    });

    // yjs_updates.session_activity_id: uuid -> bigint, now with a real FK
    pgm.dropColumn("yjs_updates", "session_activity_id");
    pgm.addColumn("yjs_updates", {
        session_activity_id: { type: "bigint", notNull: true },
    });
    pgm.addConstraint("yjs_updates", "yjs_updates_session_activity_id_fkey", {
        foreignKeys: {
            columns: "session_activity_id",
            references: "session_activities(session_activity_id)",
        },
    });

    // project_yjs_snapshots: yjs_snapshot_id uuid -> bigint
    pgm.dropConstraint("project_yjs_snapshots", "project_yjs_snapshots_pkey");
    pgm.dropColumn("project_yjs_snapshots", "yjs_snapshot_id");
    pgm.addColumn("project_yjs_snapshots", {
        yjs_snapshot_id: { type: "bigint", notNull: true },
    });
    pgm.addConstraint("project_yjs_snapshots", "project_yjs_snapshots_pkey", {
        primaryKey: ["yjs_snapshot_id", "project_id"],
    });
    pgm.addConstraint("project_yjs_snapshots", "project_yjs_snapshots_yjs_snapshot_id_fkey", {
        foreignKeys: {
            columns: "yjs_snapshot_id",
            references: "yjs_snapshots(yjs_snapshot_id)",
        },
    });

    // project_yjs_updates: yjs_update_id uuid -> bigint
    pgm.dropConstraint("project_yjs_updates", "project_yjs_updates_pkey");
    pgm.dropColumn("project_yjs_updates", "yjs_update_id");
    pgm.addColumn("project_yjs_updates", {
        yjs_update_id: { type: "bigint", notNull: true },
    });
    pgm.addConstraint("project_yjs_updates", "project_yjs_updates_pkey", {
        primaryKey: ["yjs_update_id", "project_id"],
    });
    pgm.addConstraint("project_yjs_updates", "project_yjs_updates_yjs_update_id_fkey", {
        foreignKeys: {
            columns: "yjs_update_id",
            references: "yjs_updates(yjs_update_id)",
        },
    });

    // block_yjs_snapshots: yjs_snapshot_id uuid -> bigint
    pgm.dropConstraint("block_yjs_snapshots", "block_yjs_snapshots_pkey");
    pgm.dropColumn("block_yjs_snapshots", "yjs_snapshot_id");
    pgm.addColumn("block_yjs_snapshots", {
        yjs_snapshot_id: { type: "bigint", notNull: true },
    });
    pgm.addConstraint("block_yjs_snapshots", "block_yjs_snapshots_pkey", {
        primaryKey: ["yjs_snapshot_id", "block_id"],
    });
    pgm.addConstraint("block_yjs_snapshots", "block_yjs_snapshots_yjs_snapshot_id_fkey", {
        foreignKeys: {
            columns: "yjs_snapshot_id",
            references: "yjs_snapshots(yjs_snapshot_id)",
        },
    });

    // block_yjs_updates: yjs_update_id uuid -> bigint
    pgm.dropConstraint("block_yjs_updates", "block_yjs_updates_pkey");
    pgm.dropColumn("block_yjs_updates", "yjs_update_id");
    pgm.addColumn("block_yjs_updates", {
        yjs_update_id: { type: "bigint", notNull: true },
    });
    pgm.addConstraint("block_yjs_updates", "block_yjs_updates_pkey", {
        primaryKey: ["yjs_update_id", "block_id"],
    });
    pgm.addConstraint("block_yjs_updates", "block_yjs_updates_yjs_update_id_fkey", {
        foreignKeys: {
            columns: "yjs_update_id",
            references: "yjs_updates(yjs_update_id)",
        },
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.sql(`
        TRUNCATE TABLE
            project_yjs_updates,
            project_yjs_snapshots,
            block_yjs_updates,
            block_yjs_snapshots,
            yjs_updates,
            yjs_snapshots;
    `);

    // block_yjs_updates: bigint -> uuid
    pgm.dropConstraint("block_yjs_updates", "block_yjs_updates_yjs_update_id_fkey");
    pgm.dropConstraint("block_yjs_updates", "block_yjs_updates_pkey");
    pgm.dropColumn("block_yjs_updates", "yjs_update_id");
    pgm.addColumn("block_yjs_updates", {
        yjs_update_id: { type: "uuid", notNull: true },
    });
    pgm.addConstraint("block_yjs_updates", "block_yjs_updates_pkey", {
        primaryKey: ["yjs_update_id", "block_id"],
    });

    // block_yjs_snapshots: bigint -> uuid
    pgm.dropConstraint("block_yjs_snapshots", "block_yjs_snapshots_yjs_snapshot_id_fkey");
    pgm.dropConstraint("block_yjs_snapshots", "block_yjs_snapshots_pkey");
    pgm.dropColumn("block_yjs_snapshots", "yjs_snapshot_id");
    pgm.addColumn("block_yjs_snapshots", {
        yjs_snapshot_id: { type: "uuid", notNull: true },
    });
    pgm.addConstraint("block_yjs_snapshots", "block_yjs_snapshots_pkey", {
        primaryKey: ["yjs_snapshot_id", "block_id"],
    });

    // project_yjs_updates: bigint -> uuid
    pgm.dropConstraint("project_yjs_updates", "project_yjs_updates_yjs_update_id_fkey");
    pgm.dropConstraint("project_yjs_updates", "project_yjs_updates_pkey");
    pgm.dropColumn("project_yjs_updates", "yjs_update_id");
    pgm.addColumn("project_yjs_updates", {
        yjs_update_id: { type: "uuid", notNull: true },
    });
    pgm.addConstraint("project_yjs_updates", "project_yjs_updates_pkey", {
        primaryKey: ["yjs_update_id", "project_id"],
    });

    // project_yjs_snapshots: bigint -> uuid
    pgm.dropConstraint("project_yjs_snapshots", "project_yjs_snapshots_yjs_snapshot_id_fkey");
    pgm.dropConstraint("project_yjs_snapshots", "project_yjs_snapshots_pkey");
    pgm.dropColumn("project_yjs_snapshots", "yjs_snapshot_id");
    pgm.addColumn("project_yjs_snapshots", {
        yjs_snapshot_id: { type: "uuid", notNull: true },
    });
    pgm.addConstraint("project_yjs_snapshots", "project_yjs_snapshots_pkey", {
        primaryKey: ["yjs_snapshot_id", "project_id"],
    });

    // yjs_updates.session_activity_id: bigint -> uuid, drop FK
    pgm.dropConstraint("yjs_updates", "yjs_updates_session_activity_id_fkey");
    pgm.dropColumn("yjs_updates", "session_activity_id");
    pgm.addColumn("yjs_updates", {
        session_activity_id: { type: "uuid", notNull: true },
    });

    // yjs_updates: bigserial -> uuid
    pgm.dropConstraint("yjs_updates", "yjs_updates_pkey");
    pgm.dropColumn("yjs_updates", "yjs_update_id");
    pgm.addColumn("yjs_updates", {
        yjs_update_id: { type: "uuid", notNull: true, default: pgm.func("gen_random_uuid()"), primaryKey: true },
    });

    // yjs_snapshots: bigserial -> uuid
    pgm.dropConstraint("yjs_snapshots", "yjs_snapshots_pkey");
    pgm.dropColumn("yjs_snapshots", "yjs_snapshot_id");
    pgm.addColumn("yjs_snapshots", {
        yjs_snapshot_id: { type: "uuid", notNull: true, default: pgm.func("gen_random_uuid()"), primaryKey: true },
    });

    pgm.addConstraint("project_yjs_snapshots", "project_yjs_snapshots_yjs_snapshot_id_fkey", {
        foreignKeys: { columns: "yjs_snapshot_id", references: "yjs_snapshots(yjs_snapshot_id)" },
    });
    pgm.addConstraint("project_yjs_updates", "project_yjs_updates_yjs_update_id_fkey", {
        foreignKeys: { columns: "yjs_update_id", references: "yjs_updates(yjs_update_id)" },
    });
    pgm.addConstraint("block_yjs_snapshots", "block_yjs_snapshots_yjs_snapshot_id_fkey", {
        foreignKeys: { columns: "yjs_snapshot_id", references: "yjs_snapshots(yjs_snapshot_id)" },
    });
    pgm.addConstraint("block_yjs_updates", "block_yjs_updates_yjs_update_id_fkey", {
        foreignKeys: { columns: "yjs_update_id", references: "yjs_updates(yjs_update_id)" },
    });
};