/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Add deadline-tracking columns to contract_milestones.
 *
 * started_at  — when the milestone became 'active'. Combined with the
 *               existing integer `deadline` (stored as hours), the real
 *               due date is: started_at + (deadline * interval '1 hour').
 *
 * overdue_at  — set by the background cron once the real due date has
 *               passed and the milestone still has no accepted submission.
 *               NULL means the milestone is on time or already resolved.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.addColumns('contract_milestones', {
        started_at: {
            type: 'timestamp without time zone',
            notNull: false,
        },
        overdue_at: {
            type: 'timestamp without time zone',
            notNull: false,
        },
    });

    // Used by both the overdue-detector and auto-approve cron queries.
    pgm.createIndex('contract_milestones', ['status', 'started_at'], {
        name: 'idx_contract_milestones_status_started_at',
        ifNotExists: true,
    });

    pgm.createIndex('contract_milestones', ['status', 'overdue_at'], {
        name: 'idx_contract_milestones_status_overdue_at',
        ifNotExists: true,
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.dropIndex('contract_milestones', ['status', 'overdue_at'], {
        name: 'idx_contract_milestones_status_overdue_at',
        ifExists: true,
    });
    pgm.dropIndex('contract_milestones', ['status', 'started_at'], {
        name: 'idx_contract_milestones_status_started_at',
        ifExists: true,
    });
    pgm.dropColumns('contract_milestones', ['started_at', 'overdue_at']);
};
