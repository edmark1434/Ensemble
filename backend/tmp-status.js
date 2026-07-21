require('dotenv').config();
const { pool } = require('./lib/database');

(async () => {
  const queries = {
    job_status: "SELECT status, COUNT(*) FROM jobs GROUP BY status",
    gig_status: "SELECT status, COUNT(*) FROM gigs GROUP BY status",
    proposal_status: "SELECT status, COUNT(*) FROM proposals GROUP BY status",
    gig_request_status: "SELECT status, COUNT(*) FROM gig_requests GROUP BY status",
    contract_status: "SELECT status, COUNT(*) FROM contracts GROUP BY status",
    contract_type: "SELECT contract_type, COUNT(*) FROM contracts GROUP BY contract_type",
    payment_types: "SELECT payment_type, COUNT(*) FROM jobs GROUP BY payment_type",
    experience: "SELECT experience_level, COUNT(*) FROM jobs GROUP BY experience_level",
    milestone_status: "SELECT status, COUNT(*) FROM contract_milestones GROUP BY status",
    counts: `SELECT
      (SELECT COUNT(*) FROM jobs) jobs, (SELECT COUNT(*) FROM gigs) gigs,
      (SELECT COUNT(*) FROM proposals) proposals, (SELECT COUNT(*) FROM gig_requests) gig_requests,
      (SELECT COUNT(*) FROM contracts) contracts, (SELECT COUNT(*) FROM gig_tiers) gig_tiers,
      (SELECT COUNT(*) FROM ratings) ratings, (SELECT COUNT(*) FROM job_tags) job_tags,
      (SELECT COUNT(*) FROM gig_tags) gig_tags, (SELECT COUNT(*) FROM interviews) interviews,
      (SELECT COUNT(*) FROM contract_milestones) contract_milestones`,
  };
  for (const [name, sql] of Object.entries(queries)) {
    const r = await pool.query(sql);
    console.log(`--- ${name}`);
    r.rows.forEach((row) => console.log(JSON.stringify(row)));
  }
  process.exit(0);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
