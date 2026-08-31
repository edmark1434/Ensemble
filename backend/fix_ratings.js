const { pool } = require('./lib/Database');

async function fix() {
  try {
    const res = await pool.query(`
      UPDATE ratings r
      SET account_id = g.freelancer_account_id
      FROM contracts c
      JOIN gig_contracts gc ON c.contract_id = gc.contract_id
      JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id
      JOIN gig_tiers tier ON req.gig_tier_id = tier.gig_tier_id
      JOIN gigs g ON tier.gig_id = g.gig_id
      WHERE r.contract_id = c.contract_id
      AND r.account_id = req.client_account_id;
    `);
    console.log('Fixed', res.rowCount, 'ratings');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
