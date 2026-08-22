const pool = require('./lib/Database').pool;

async function fix() {
    try {
        console.log("Fetching contracts...");
        const cRes = await pool.query(`
            SELECT c.contract_id, jc.proposal_id 
            FROM contracts c 
            JOIN job_contracts jc ON c.contract_id = jc.contract_id
        `);
        
        for (const contract of cRes.rows) {
            console.log(`Fixing milestones for contract ${contract.contract_id}...`);
            const pRes = await pool.query('SELECT * FROM proposal_milestones WHERE proposal_id = $1 ORDER BY index ASC', [contract.proposal_id]);
            
            for (const [idx, m] of pRes.rows.entries()) {
                const status = idx === 0 ? 'active' : 'locked';
                await pool.query(`
                    INSERT INTO contract_milestones (contract_id, index, name, description, status, credits, no_of_revisions_max, deadline)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [contract.contract_id, m.index, m.name, m.description || '', status, 0, m.no_of_revisions_max || 0, m.duration_hrs || 0]);
            }
        }
        
        console.log("Done fixing milestones.");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
fix();
