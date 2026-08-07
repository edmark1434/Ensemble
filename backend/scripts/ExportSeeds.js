const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: parseInt(process.env.DB_PORT || '5432')
});

function escapeSqlString(str) {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
}

async function run() {
    const client = await pool.connect();
    try {
        const jobsRes = await client.query('SELECT * FROM jobs');
        const proposalsRes = await client.query('SELECT * FROM proposals');
        const milestonesRes = await client.query('SELECT * FROM proposal_milestones');

        let migrationContent = `/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
`;

        if (jobsRes.rows.length > 0) {
            const jobValues = jobsRes.rows.map(row => {
                return `(
                    ${escapeSqlString(row.job_id)}, 
                    ${escapeSqlString(row.client_account_id)}, 
                    ${escapeSqlString(row.title)}, 
                    ${escapeSqlString(row.description)}, 
                    ${escapeSqlString(row.category)}, 
                    ${escapeSqlString(row.experience_level)}, 
                    ${row.no_of_hires !== null ? row.no_of_hires : 'NULL'}, 
                    ${row.rate_credits_min !== null ? row.rate_credits_min : 'NULL'}, 
                    ${row.rate_credits_max !== null ? row.rate_credits_max : 'NULL'}, 
                    ${row.timeline_min !== null ? row.timeline_min : 'NULL'}, 
                    ${row.timeline_max !== null ? row.timeline_max : 'NULL'}, 
                    ${escapeSqlString(row.posted_as)}, 
                    ${escapeSqlString(row.team_id)}, 
                    ${escapeSqlString(row.payment_type)}, 
                    ${escapeSqlString(row.status)}
                )`;
            }).join(',\n');
            
            migrationContent += `
  pgm.sql(\`
    INSERT INTO jobs (
      job_id, client_account_id, title, description, category, experience_level, 
      no_of_hires, rate_credits_min, rate_credits_max, timeline_min, timeline_max, 
      posted_as, team_id, payment_type, status
    ) VALUES 
    ${jobValues}
    ON CONFLICT (job_id) DO NOTHING;
  \`);\n`;
        }

        if (proposalsRes.rows.length > 0) {
            const propValues = proposalsRes.rows.map(row => {
                return `(
                    ${escapeSqlString(row.proposal_id)}, 
                    ${escapeSqlString(row.job_id)}, 
                    ${escapeSqlString(row.freelancer_account_id)}, 
                    ${row.rate_credits !== null ? row.rate_credits : 'NULL'}, 
                    ${row.revision_price_credits !== null ? row.revision_price_credits : 'NULL'}, 
                    ${escapeSqlString(row.letter)}, 
                    ${escapeSqlString(row.terms_id)}, 
                    ${escapeSqlString(row.status)},
                    ${escapeSqlString(row.reject_reason)}
                )`;
            }).join(',\n');
            
            migrationContent += `
  pgm.sql(\`
    INSERT INTO proposals (
      proposal_id, job_id, freelancer_account_id, rate_credits, 
      revision_price_credits, letter, terms_id, status, reject_reason
    ) VALUES 
    ${propValues}
    ON CONFLICT (proposal_id) DO NOTHING;
  \`);\n`;
        }

        if (milestonesRes.rows.length > 0) {
            const msValues = milestonesRes.rows.map(row => {
                return `(
                    ${escapeSqlString(row.proposal_milestone_id)}, 
                    ${escapeSqlString(row.proposal_id)}, 
                    ${escapeSqlString(row.name)}, 
                    ${escapeSqlString(row.description)}, 
                    ${row.duration_hrs !== null ? row.duration_hrs : 'NULL'}, 
                    ${row.no_of_revisions_max !== null ? row.no_of_revisions_max : 'NULL'}, 
                    ${row.index !== null ? row.index : 'NULL'}
                )`;
            }).join(',\n');
            
            migrationContent += `
  pgm.sql(\`
    INSERT INTO proposal_milestones (
      proposal_milestone_id, proposal_id, name, description, 
      duration_hrs, no_of_revisions_max, index
    ) VALUES 
    ${msValues}
    ON CONFLICT (proposal_milestone_id) DO NOTHING;
  \`);\n`;
        }

        migrationContent += `};\n`;

        migrationContent += `
/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
  // Skipping deletion in down migration as these are seeds
};
`;

        const outPath = path.join(__dirname, '../migrations/1785562512346_insert-jobs-proposals-seeds.js');
        fs.writeFileSync(outPath, migrationContent, 'utf-8');
        console.log('Seed migration file created at:', outPath);

    } catch (err) {
        console.error("Failed:", err);
    } finally {
        client.release();
        pool.end();
    }
}

run();
