/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * Add deadline_at timestamp to contracts table.
 *
 * For jobs: initialized from rough_deadline or starts_at + (timeline_max days).
 * For gigs: initialized from starts_at + (delivery_days).
 * When extending deadline: the contract deadline_at is extended directly (e.g. + 3 days),
 * along with the active milestone's deadline_at.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.addColumns('contracts', {
        deadline_at: {
            type: 'timestamp without time zone',
            notNull: false,
        },
    });

    // Backfill job contracts
    pgm.sql(`
        UPDATE contracts c
        SET deadline_at = COALESCE(
            j.rough_deadline,
            c.starts_at + (COALESCE(j.timeline_max, 7) * interval '1 day')
        )
        FROM job_contracts jc
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        JOIN jobs j ON p.job_id = j.job_id
        WHERE c.contract_id = jc.contract_id
          AND c.deadline_at IS NULL;
    `);

    // Backfill gig contracts
    pgm.sql(`
        UPDATE contracts c
        SET deadline_at = c.starts_at + (COALESCE(gt.delivery_days, 3) * interval '1 day')
        FROM gig_contracts gc
        JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
        JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
        WHERE c.contract_id = gc.contract_id
          AND c.deadline_at IS NULL;
    `);

    // Fallback for any standalone/sample contracts
    pgm.sql(`
        UPDATE contracts
        SET deadline_at = starts_at + interval '7 days'
        WHERE deadline_at IS NULL;
    `);

    pgm.createIndex('contracts', ['deadline_at'], {
        name: 'idx_contracts_deadline_at',
        ifNotExists: true,
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.dropIndex('contracts', ['deadline_at'], {
        name: 'idx_contracts_deadline_at',
        ifExists: true,
    });
    pgm.dropColumns('contracts', ['deadline_at']);
};
