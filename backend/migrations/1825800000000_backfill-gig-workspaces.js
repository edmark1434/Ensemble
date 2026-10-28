/**
 * Migration to ensure all existing gig contracts have a contractual workspace provisioned.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.shorthands = undefined;

exports.up = async (pgm) => {
  const { ensureContractualGigWorkspace } = require('../repositories/TeamProjectRepositories');
  const contractsRes = await pgm.db.query(`
    SELECT c.contract_id, c.status,
           gc.gig_request_id, gr.client_account_id, g.freelancer_account_id,
           gr.gig_tier_id, gt.gig_id, gr.linked_project_id
    FROM contracts c
    JOIN gig_contracts gc ON gc.contract_id = c.contract_id
    JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
    JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
    JOIN gigs g ON g.gig_id = gt.gig_id
    LEFT JOIN team_contract_workspaces tcw ON tcw.contract_id = c.contract_id
    WHERE tcw.team_id IS NULL AND c.status != 'Cancelled'
  `);

  for (const row of contractsRes.rows) {
    try {
      await ensureContractualGigWorkspace(pgm.db, {
        orderId: row.gig_request_id,
        gigId: row.gig_id,
        clientAccountId: row.client_account_id,
        contractId: row.contract_id,
        freelancerAccountId: row.freelancer_account_id,
        linkedProjectId: row.linked_project_id,
      });
    } catch (err) {
      console.warn(`[migration 1825800000000] Error backfilling gig workspace for contract ${row.contract_id}:`, err.message);
    }
  }
};

exports.down = async (pgm) => {
  // Down migration is intentionally a no-op as deleting user workspaces could cause data loss
};
