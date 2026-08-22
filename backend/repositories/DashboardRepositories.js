const pool = require('../lib/Database').pool;
//jp
async function getDashboardTasks(accountId) {
    const query = `
        SELECT 
            c.contract_id,
            c.contract_type,
            c.status as contract_status,
            c.rate_credits as contract_value,
            c.revision_price_credits as revision_price_credits,
            j.title as job_title,
            j.job_id as job_id,
            j.experience_level as job_difficulty,
            (SELECT f.path FROM job_attachments ja JOIN files f ON ja.file_id = f.file_id WHERE ja.job_id = j.job_id ORDER BY ja.index ASC LIMIT 1) as job_banner,
            (SELECT t.name FROM job_tags jt JOIN tags t ON jt.tag_id = t.tag_id WHERE jt.job_id = j.job_id LIMIT 1) as job_category,
            client_acc.display_name as client_name,
            client_acc.account_id as client_account_id,
            client_f.path as client_avatar,
            free_acc.display_name as freelancer_name,
            free_acc.account_id as freelancer_account_id,
            free_f.path as freelancer_avatar,
            (
                SELECT json_agg(json_build_object(
                    'id', cm.contract_milestone_id,
                    'index', cm.index,
                    'name', cm.name,
                    'status', cm.status,
                    'credits', cm.credits,
                    'revisions_max', cm.no_of_revisions_max,
                    'deadline', cm.deadline
                ) ORDER BY cm.index ASC)
                FROM contract_milestones cm 
                WHERE cm.contract_id = c.contract_id
            ) as milestones,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = j.client_account_id LIMIT 1) as client_rating,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = p.freelancer_account_id LIMIT 1) as freelancer_rating
        FROM contracts c
        JOIN job_contracts jc ON c.contract_id = jc.contract_id
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        JOIN jobs j ON p.job_id = j.job_id
        JOIN accounts client_acc ON j.client_account_id = client_acc.account_id
        LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
        JOIN accounts free_acc ON p.freelancer_account_id = free_acc.account_id
        LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
        WHERE (j.client_account_id = $1 OR p.freelancer_account_id = $1)
          AND LOWER(c.status) IN ('active', 'waiting', 'done', 'completed')
        
        UNION ALL
        
        SELECT 
            c.contract_id,
            c.contract_type,
            c.status as contract_status,
            c.rate_credits as contract_value,
            c.revision_price_credits as revision_price_credits,
            g.title as job_title,
            g.gig_id as job_id,
            'N/A' as job_difficulty,
            (SELECT f.path FROM gig_attachments ga JOIN files f ON ga.file_id = f.file_id WHERE ga.gig_id = g.gig_id ORDER BY ga.index ASC LIMIT 1) as job_banner,
            (SELECT t.name FROM gig_tags gt JOIN tags t ON gt.tag_id = t.tag_id WHERE gt.gig_id = g.gig_id LIMIT 1) as job_category,
            client_acc.display_name as client_name,
            client_acc.account_id as client_account_id,
            client_f.path as client_avatar,
            free_acc.display_name as freelancer_name,
            free_acc.account_id as freelancer_account_id,
            free_f.path as freelancer_avatar,
            (
                SELECT json_agg(json_build_object(
                    'id', cm.contract_milestone_id,
                    'index', cm.index,
                    'name', cm.name,
                    'status', cm.status,
                    'credits', cm.credits,
                    'revisions_max', cm.no_of_revisions_max,
                    'deadline', cm.deadline
                ) ORDER BY cm.index ASC)
                FROM contract_milestones cm 
                WHERE cm.contract_id = c.contract_id
            ) as milestones,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = gr.client_account_id LIMIT 1) as client_rating,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = g.freelancer_account_id LIMIT 1) as freelancer_rating
        FROM contracts c
        JOIN gig_contracts gc ON c.contract_id = gc.contract_id
        JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
        JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
        JOIN gigs g ON gt.gig_id = g.gig_id
        JOIN accounts client_acc ON gr.client_account_id = client_acc.account_id
        LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
        JOIN accounts free_acc ON g.freelancer_account_id = free_acc.account_id
        LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
        WHERE (gr.client_account_id = $1 OR g.freelancer_account_id = $1)
          AND LOWER(c.status) IN ('active', 'waiting', 'done', 'completed')
        
        ORDER BY contract_id DESC
    `;
    const result = await pool.query(query, [accountId]);
    return result.rows;
}

async function getTaskById(contractId, accountId) {
    const query = `
        SELECT 
            c.contract_id,
            c.contract_type,
            c.status as contract_status,
            c.rate_credits as contract_value,
            c.revision_price_credits as revision_price_credits,
            j.title as job_title,
            j.job_id as job_id,
            client_acc.display_name as client_name,
            client_acc.account_id as client_account_id,
            client_f.path as client_avatar,
            free_acc.display_name as freelancer_name,
            free_acc.account_id as freelancer_account_id,
            free_f.path as freelancer_avatar,
            (
                SELECT json_agg(
                    json_build_object(
                        'id', cm.contract_milestone_id,
                        'index', cm.index,
                        'name', cm.name,
                        'status', cm.status,
                        'credits', cm.credits,
                        'revisions_max', cm.no_of_revisions_max,
                        'deadline', cm.deadline,
                        'submissions', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', ms.milestone_submit_id,
                                    'message', ms.message,
                                    'attachments', ms.attachments,
                                    'status', ms.status,
                                    'submitted_at', ms.submitted_at
                                ) ORDER BY ms.submitted_at DESC
                            )
                            FROM milestone_submits ms
                            WHERE ms.contract_milestone_id = cm.contract_milestone_id
                        )
                    ) ORDER BY cm.index ASC
                )
                FROM contract_milestones cm 
                WHERE cm.contract_id = c.contract_id
            ) as milestones,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = j.client_account_id LIMIT 1) as client_rating,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = p.freelancer_account_id LIMIT 1) as freelancer_rating
        FROM contracts c
        JOIN job_contracts jc ON c.contract_id = jc.contract_id
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        JOIN jobs j ON p.job_id = j.job_id
        JOIN accounts client_acc ON j.client_account_id = client_acc.account_id
        LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
        JOIN accounts free_acc ON p.freelancer_account_id = free_acc.account_id
        LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
        WHERE c.contract_id = $1 AND (j.client_account_id = $2 OR p.freelancer_account_id = $2)
        
        UNION ALL
        
        SELECT 
            c.contract_id,
            c.contract_type,
            c.status as contract_status,
            c.rate_credits as contract_value,
            c.revision_price_credits as revision_price_credits,
            g.title as job_title,
            g.gig_id as job_id,
            client_acc.display_name as client_name,
            client_acc.account_id as client_account_id,
            client_f.path as client_avatar,
            free_acc.display_name as freelancer_name,
            free_acc.account_id as freelancer_account_id,
            free_f.path as freelancer_avatar,
            (
                SELECT json_agg(
                    json_build_object(
                        'id', cm.contract_milestone_id,
                        'index', cm.index,
                        'name', cm.name,
                        'status', cm.status,
                        'credits', cm.credits,
                        'revisions_max', cm.no_of_revisions_max,
                        'deadline', cm.deadline,
                        'submissions', (
                            SELECT json_agg(
                                json_build_object(
                                    'id', ms.milestone_submit_id,
                                    'message', ms.message,
                                    'attachments', ms.attachments,
                                    'status', ms.status,
                                    'submitted_at', ms.submitted_at
                                ) ORDER BY ms.submitted_at DESC
                            )
                            FROM milestone_submits ms
                            WHERE ms.contract_milestone_id = cm.contract_milestone_id
                        )
                    ) ORDER BY cm.index ASC
                )
                FROM contract_milestones cm 
                WHERE cm.contract_id = c.contract_id
            ) as milestones,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = gr.client_account_id LIMIT 1) as client_rating,
            (SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback, 'created_at', r.created_at) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = g.freelancer_account_id LIMIT 1) as freelancer_rating
        FROM contracts c
        JOIN gig_contracts gc ON c.contract_id = gc.contract_id
        JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
        JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
        JOIN gigs g ON gt.gig_id = g.gig_id
        JOIN accounts client_acc ON gr.client_account_id = client_acc.account_id
        LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
        JOIN accounts free_acc ON g.freelancer_account_id = free_acc.account_id
        LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
        WHERE c.contract_id = $1 AND (gr.client_account_id = $2 OR g.freelancer_account_id = $2)
    `;
    const result = await pool.query(query, [contractId, accountId]);
    return result.rows[0];
}

async function verifyFreelancer(contractId, accountId) {
    const query = `
        SELECT 1 
        FROM contracts c
        JOIN job_contracts jc ON c.contract_id = jc.contract_id
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        WHERE c.contract_id = $1 AND p.freelancer_account_id = $2
        UNION ALL
        SELECT 1
        FROM contracts c
        JOIN gig_contracts gc ON c.contract_id = gc.contract_id
        JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
        JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
        JOIN gigs g ON gt.gig_id = g.gig_id
        WHERE c.contract_id = $1 AND g.freelancer_account_id = $2
    `;
    const res = await pool.query(query, [contractId, accountId]);
    return res.rowCount > 0;
}

async function verifyClient(contractId, accountId) {
    const query = `
        SELECT 1 
        FROM contracts c
        JOIN job_contracts jc ON c.contract_id = jc.contract_id
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        JOIN jobs j ON p.job_id = j.job_id
        WHERE c.contract_id = $1 AND j.client_account_id = $2
        UNION ALL
        SELECT 1
        FROM contracts c
        JOIN gig_contracts gc ON c.contract_id = gc.contract_id
        JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
        WHERE c.contract_id = $1 AND gr.client_account_id = $2
    `;
    const res = await pool.query(query, [contractId, accountId]);
    return res.rowCount > 0;
}

async function addMilestoneSubmission(milestoneId, message, attachments, status) {
    const query = `
        INSERT INTO milestone_submits (contract_milestone_id, index, message, attachments, status)
        VALUES (
            $1, 
            COALESCE((SELECT MAX(index) + 1 FROM milestone_submits WHERE contract_milestone_id = $1), 1),
            $2, 
            $3, 
            $4
        )
        RETURNING *
    `;
    const res = await pool.query(query, [milestoneId, message, JSON.stringify(attachments || []), status]);
    return res.rows[0];
}

async function updateMilestoneStatus(milestoneId, status) {
    const query = `
        UPDATE contract_milestones
        SET status = $2
        WHERE contract_milestone_id = $1
    `;
    await pool.query(query, [milestoneId, status]);
}

async function unlockNextMilestone(contractId, currentMilestoneId) {
    // Find the next milestone that is 'locked' and set it to 'active'
    const query = `
        UPDATE contract_milestones
        SET status = 'active'
        WHERE contract_milestone_id = (
            SELECT contract_milestone_id 
            FROM contract_milestones 
            WHERE contract_id = $1 AND status = 'locked' 
            ORDER BY index ASC 
            LIMIT 1
        )
    `;
    await pool.query(query, [contractId]);
}

async function submitContractReview(contractId, accountId, stars, feedback) {
    const query = `
        INSERT INTO ratings (contract_id, account_id, stars_out_of_five, feedback)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const result = await pool.query(query, [contractId, accountId, stars, feedback]);
    return result.rows[0];
}

async function buyRevision(contractId, milestoneId, priceCredits) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // DEV MODE: Simulate wallet deduction by skipping actual wallet transactions
        
        // 1. Update milestone: increment credits, increment no_of_revisions_max
        await client.query(`
            UPDATE contract_milestones
            SET credits = credits + $1,
                no_of_revisions_max = no_of_revisions_max + 1
            WHERE contract_milestone_id = $2
        `, [priceCredits, milestoneId]);

        // 2. Update contract: increment rate_credits (which acts as the total escrowed amount)
        await client.query(`
            UPDATE contracts
            SET rate_credits = rate_credits + $1
            WHERE contract_id = $2
        `, [priceCredits, contractId]);

        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    getDashboardTasks,
    getTaskById,
    verifyFreelancer,
    verifyClient,
    addMilestoneSubmission,
    updateMilestoneStatus,
    unlockNextMilestone,
    submitContractReview,
    buyRevision
};
