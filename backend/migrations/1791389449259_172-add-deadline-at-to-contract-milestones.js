/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Add deadline_at timestamp to contract_milestones.
 *
 * deadline_at — exact expiration timestamp calculated when a milestone starts:
 *               started_at + (deadline * interval '1 hour').
 *               For extensions, deadline_at is extended directly (e.g. + 3 days).
 *               Overdue checks become: status = 'active' AND NOW() > deadline_at.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.addColumns('contract_milestones', {
        deadline_at: {
            type: 'timestamp without time zone',
            notNull: false,
        },
    });

    // Backfill any existing milestones with started_at
    pgm.sql(`
        UPDATE contract_milestones
        SET deadline_at = started_at + (deadline * interval '1 hour')
        WHERE started_at IS NOT NULL
          AND deadline IS NOT NULL
          AND deadline > 0
          AND deadline_at IS NULL;
    `);

    pgm.createIndex('contract_milestones', ['status', 'deadline_at'], {
        name: 'idx_contract_milestones_status_deadline_at',
        ifNotExists: true,
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.dropIndex('contract_milestones', ['status', 'deadline_at'], {
        name: 'idx_contract_milestones_status_deadline_at',
        ifExists: true,
    });
    pgm.dropColumns('contract_milestones', ['deadline_at']);
};
