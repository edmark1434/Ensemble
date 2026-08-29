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

async function recordMilestoneAction({
    contractId,
    milestoneId,
    message,
    attachments,
    submissionStatus,
    milestoneStatus,
    unlockNext = false,
    releaseOnContractCompletion = false,
    allowedCurrentStatuses = [],
}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const milestoneResult = await client.query(
            `SELECT contract_milestone_id, name, status
             FROM contract_milestones
             WHERE contract_milestone_id = $1 AND contract_id = $2
             FOR UPDATE`,
            [milestoneId, contractId]
        );
        const milestone = milestoneResult.rows[0];
        if (!milestone) {
            const error = new Error('Milestone not found for this contract');
            error.statusCode = 404;
            throw error;
        }
        if (
            allowedCurrentStatuses.length > 0 &&
            !allowedCurrentStatuses.includes(String(milestone.status).toLowerCase())
        ) {
            const error = new Error('Milestone is not in a valid state for this action');
            error.statusCode = 409;
            throw error;
        }

        const submissionResult = await client.query(
            `INSERT INTO milestone_submits (
                contract_milestone_id, index, message, attachments, status
             )
             VALUES (
                $1,
                COALESCE((
                    SELECT MAX(index) + 1
                    FROM milestone_submits
                    WHERE contract_milestone_id = $1
                ), 1),
                $2,
                $3,
                $4
             )
             RETURNING *`,
            [milestoneId, message, JSON.stringify(attachments || []), submissionStatus]
        );

        if (milestoneStatus) {
            await client.query(
                `UPDATE contract_milestones
                 SET status = $2
                 WHERE contract_milestone_id = $1`,
                [milestoneId, milestoneStatus]
            );
        }

        if (unlockNext) {
            await client.query(
                `UPDATE contract_milestones
                 SET status = 'active'
                 WHERE contract_milestone_id = (
                    SELECT contract_milestone_id
                    FROM contract_milestones
                    WHERE contract_id = $1 AND status = 'locked'
                    ORDER BY index ASC
                    LIMIT 1
                 )`,
                [contractId]
            );
        }

        let contractCompletion = null;
        if (releaseOnContractCompletion && milestoneStatus === 'completed') {
            const remainingResult = await client.query(
                `SELECT COUNT(*)::integer AS remaining
                 FROM contract_milestones
                 WHERE contract_id = $1
                   AND LOWER(status) <> 'completed'`,
                [contractId]
            );

            if (Number(remainingResult.rows[0].remaining) === 0) {
                const contractResult = await client.query(
                    `SELECT contract_id, contract_type, status, rate_credits
                     FROM contracts
                     WHERE contract_id = $1
                     FOR UPDATE`,
                    [contractId]
                );
                const contract = contractResult.rows[0];
                if (!contract) {
                    const error = new Error('Contract not found');
                    error.statusCode = 404;
                    throw error;
                }
                if (!['active', 'waiting'].includes(String(contract.status).toLowerCase())) {
                    const error = new Error('Contract is not in a valid state for completion');
                    error.statusCode = 409;
                    throw error;
                }

                const participantsResult = await client.query(
                    `SELECT p.freelancer_account_id, j.title AS listing_title
                     FROM job_contracts jc
                     JOIN proposals p ON p.proposal_id = jc.proposal_id
                     JOIN jobs j ON j.job_id = p.job_id
                     WHERE jc.contract_id = $1
                     UNION ALL
                     SELECT g.freelancer_account_id, g.title AS listing_title
                     FROM gig_contracts gc
                     JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
                     JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
                     JOIN gigs g ON g.gig_id = gt.gig_id
                     WHERE gc.contract_id = $1
                     LIMIT 1`,
                    [contractId]
                );
                const participants = participantsResult.rows[0];
                if (!participants) {
                    const error = new Error('Contract participants not found');
                    error.statusCode = 409;
                    throw error;
                }

                const releaseCredits = Number(contract.rate_credits);
                if (!Number.isSafeInteger(releaseCredits) || releaseCredits <= 0) {
                    const error = new Error('Contract has an invalid release amount');
                    error.statusCode = 409;
                    throw error;
                }

                const existingReleaseResult = await client.query(
                    `SELECT credit_transaction_id
                     FROM credit_transactions
                     WHERE type = 'Escrow Release'
                       AND reference_table = 'contracts'
                       AND reference_id = $1
                     LIMIT 1`,
                    [contractId]
                );
                if (existingReleaseResult.rows.length > 0) {
                    const error = new Error('Contract funds have already been released');
                    error.statusCode = 409;
                    throw error;
                }

                const walletsResult = await client.query(
                    `SELECT w.wallet_id, w.type, w.status, w.balance_credits
                     FROM account_wallets aw
                     JOIN wallets w ON w.wallet_id = aw.wallet_id
                     WHERE aw.account_id = $1
                       AND w.type IN ('account wallets', 'escrow wallets')
                     ORDER BY w.wallet_id
                     FOR UPDATE OF w`,
                    [participants.freelancer_account_id]
                );
                const accountWallet = walletsResult.rows.find(
                    (wallet) => wallet.type === 'account wallets'
                );
                const escrowWallet = walletsResult.rows.find(
                    (wallet) => wallet.type === 'escrow wallets'
                );
                if (!accountWallet || !escrowWallet) {
                    const error = new Error('Freelancer wallets are not available');
                    error.statusCode = 409;
                    throw error;
                }
                if (accountWallet.status !== 'active' || escrowWallet.status !== 'active') {
                    const error = new Error('A freelancer wallet is not active');
                    error.statusCode = 409;
                    throw error;
                }

                const heldResult = await client.query(
                    `SELECT COALESCE(SUM(ct.amount_credits), 0)::integer AS held_credits
                     FROM credit_transactions ct
                     WHERE ct.type = 'Escrow Hold'
                       AND ct.destination_wallet_id = $1
                       AND (
                           (
                               ct.reference_table = 'contracts'
                               AND ct.reference_id = $2
                           ) OR (
                               ct.reference_table = 'contract_milestone_revisions'
                               AND EXISTS (
                                   SELECT 1
                                   FROM contract_milestones cm
                                   WHERE cm.contract_milestone_id = ct.reference_id
                                     AND cm.contract_id = $2
                               )
                           )
                       )`,
                    [escrowWallet.wallet_id, contractId]
                );
                if (Number(heldResult.rows[0].held_credits) < releaseCredits) {
                    const error = new Error('Contract escrow funding is incomplete');
                    error.statusCode = 409;
                    throw error;
                }

                const debitResult = await client.query(
                    `UPDATE wallets
                     SET balance_credits = balance_credits - $1
                     WHERE wallet_id = $2
                       AND balance_credits >= $1
                     RETURNING balance_credits`,
                    [releaseCredits, escrowWallet.wallet_id]
                );
                if (debitResult.rows.length === 0) {
                    const error = new Error('Contract escrow balance is insufficient for release');
                    error.statusCode = 409;
                    throw error;
                }

                const creditResult = await client.query(
                    `UPDATE wallets
                     SET balance_credits = balance_credits + $1
                     WHERE wallet_id = $2
                     RETURNING balance_credits`,
                    [releaseCredits, accountWallet.wallet_id]
                );
                const transactionResult = await client.query(
                    `INSERT INTO credit_transactions (
                        type, amount_credits, status,
                        source_wallet_id, destination_wallet_id,
                        reference_table, reference_id
                     )
                     VALUES (
                        'Escrow Release', $1, 'completed',
                        $2, $3, 'contracts', $4
                     )
                     RETURNING *`,
                    [
                        releaseCredits,
                        escrowWallet.wallet_id,
                        accountWallet.wallet_id,
                        contractId,
                    ]
                );
                const notificationResult = await client.query(
                    `INSERT INTO notifications (
                        message, is_read, reference_table, reference_prefix,
                        reference_path, reference_id, account_id
                     )
                     VALUES (
                        $1, false, 'credit_transactions', 'CONTRACT_FUNDS_RELEASED',
                        $2, $3, $4
                     )
                     RETURNING *`,
                    [
                        `${releaseCredits} credits for "${participants.listing_title}" were released to your account wallet.`,
                        `/dashboard/tasks/${contractId}`,
                        transactionResult.rows[0].credit_transaction_id,
                        participants.freelancer_account_id,
                    ]
                );

                await client.query(
                    `UPDATE contracts
                     SET status = 'Completed'
                     WHERE contract_id = $1`,
                    [contractId]
                );

                contractCompletion = {
                    transaction: transactionResult.rows[0],
                    notification: notificationResult.rows[0],
                    freelancerAccountId: participants.freelancer_account_id,
                    releasedCredits: releaseCredits,
                    accountBalanceCredits: Number(creditResult.rows[0].balance_credits),
                    escrowBalanceCredits: Number(debitResult.rows[0].balance_credits),
                };
            }
        }

        await client.query('COMMIT');
        return {
            submission: submissionResult.rows[0],
            milestone,
            contractCompletion,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
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

async function buyRevision({
    clientAccountId,
    contractId,
    milestoneId,
    idempotencyKey,
}) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
            [idempotencyKey]
        );

        const contractResult = await client.query(
            `SELECT contract_id, status, revision_price_credits
             FROM contracts
             WHERE contract_id = $1
             FOR UPDATE`,
            [contractId]
        );
        const contract = contractResult.rows[0];
        if (!contract) {
            const error = new Error('Contract not found');
            error.statusCode = 404;
            throw error;
        }
        if (String(contract.status).toLowerCase() !== 'active') {
            const error = new Error('Additional revisions can only be purchased for an active contract');
            error.statusCode = 409;
            throw error;
        }

        const participantsResult = await client.query(
            `SELECT j.client_account_id, p.freelancer_account_id, j.title AS listing_title,
                    client_acc.display_name AS client_name
             FROM job_contracts jc
             JOIN proposals p ON p.proposal_id = jc.proposal_id
             JOIN jobs j ON j.job_id = p.job_id
             JOIN accounts client_acc ON client_acc.account_id = j.client_account_id
             WHERE jc.contract_id = $1
             UNION ALL
             SELECT gr.client_account_id, g.freelancer_account_id, g.title AS listing_title,
                    client_acc.display_name AS client_name
             FROM gig_contracts gc
             JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
             JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
             JOIN gigs g ON g.gig_id = gt.gig_id
             JOIN accounts client_acc ON client_acc.account_id = gr.client_account_id
             WHERE gc.contract_id = $1
             LIMIT 1`,
            [contractId]
        );
        const participants = participantsResult.rows[0];
        if (!participants || String(participants.client_account_id) !== String(clientAccountId)) {
            const error = new Error('Task not found or unauthorized');
            error.statusCode = 403;
            throw error;
        }

        const priceCredits = Number(contract.revision_price_credits);
        if (!Number.isSafeInteger(priceCredits) || priceCredits <= 0) {
            const error = new Error('The additional revision price is not configured');
            error.statusCode = 409;
            throw error;
        }

        const milestoneResult = await client.query(
            `SELECT cm.contract_milestone_id, cm.name, cm.status,
                    cm.no_of_revisions_max,
                    (
                        SELECT COUNT(*)::integer
                        FROM milestone_submits ms
                        WHERE ms.contract_milestone_id = cm.contract_milestone_id
                          AND ms.status = 'revision_request'
                    ) AS used_revisions
             FROM contract_milestones cm
             WHERE cm.contract_milestone_id = $1
               AND cm.contract_id = $2
             FOR UPDATE OF cm`,
            [milestoneId, contractId]
        );
        const milestone = milestoneResult.rows[0];
        if (!milestone) {
            const error = new Error('Milestone not found for this contract');
            error.statusCode = 404;
            throw error;
        }
        if (String(milestone.status).toLowerCase() !== 'submitted_for_review') {
            const error = new Error('The milestone is not awaiting client review');
            error.statusCode = 409;
            throw error;
        }

        const existingResult = await client.query(
            `SELECT ct.credit_transaction_id, ct.type, ct.amount_credits,
                    ct.source_wallet_id, ct.destination_wallet_id,
                    ct.reference_table, ct.reference_id,
                    source_aw.account_id AS source_account_id,
                    destination_aw.account_id AS destination_account_id,
                    source_wallet.type AS source_wallet_type,
                    destination_wallet.type AS destination_wallet_type
             FROM credit_transactions ct
             JOIN account_wallets source_aw
               ON source_aw.wallet_id = ct.source_wallet_id
             JOIN account_wallets destination_aw
               ON destination_aw.wallet_id = ct.destination_wallet_id
             JOIN wallets source_wallet
               ON source_wallet.wallet_id = ct.source_wallet_id
             JOIN wallets destination_wallet
               ON destination_wallet.wallet_id = ct.destination_wallet_id
             WHERE ct.credit_transaction_id = $1`,
            [idempotencyKey]
        );
        if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0];
            const isSamePurchase =
                existing.type === 'Escrow Hold' &&
                Number(existing.amount_credits) === priceCredits &&
                existing.reference_table === 'contract_milestone_revisions' &&
                String(existing.reference_id) === String(milestoneId) &&
                String(existing.source_account_id) === String(participants.client_account_id) &&
                String(existing.destination_account_id) === String(participants.freelancer_account_id) &&
                existing.source_wallet_type === 'account wallets' &&
                existing.destination_wallet_type === 'escrow wallets';
            if (!isSamePurchase) {
                const error = new Error('The idempotency key was already used for a different transaction');
                error.statusCode = 409;
                throw error;
            }
            await client.query('COMMIT');
            return {
                alreadyProcessed: true,
                transactionId: existing.credit_transaction_id,
                priceCredits,
                clientAccountId: participants.client_account_id,
                freelancerAccountId: participants.freelancer_account_id,
                listingTitle: participants.listing_title,
                milestoneName: milestone.name,
            };
        }

        if (Number(milestone.used_revisions) < Number(milestone.no_of_revisions_max)) {
            const error = new Error('The milestone still has an included revision available');
            error.statusCode = 409;
            throw error;
        }

        const walletsResult = await client.query(
            `SELECT aw.account_id, w.wallet_id, w.type, w.status, w.balance_credits
             FROM account_wallets aw
             JOIN wallets w ON w.wallet_id = aw.wallet_id
             WHERE (
                 aw.account_id = $1 AND w.type = 'account wallets'
             ) OR (
                 aw.account_id = $2 AND w.type = 'escrow wallets'
             )
             ORDER BY w.wallet_id
             FOR UPDATE OF w`,
            [participants.client_account_id, participants.freelancer_account_id]
        );
        const clientWallet = walletsResult.rows.find(
            (row) =>
                String(row.account_id) === String(participants.client_account_id) &&
                row.type === 'account wallets'
        );
        const freelancerEscrow = walletsResult.rows.find(
            (row) =>
                String(row.account_id) === String(participants.freelancer_account_id) &&
                row.type === 'escrow wallets'
        );
        if (!clientWallet) {
            const error = new Error('Client account wallet not found');
            error.statusCode = 409;
            throw error;
        }
        if (!freelancerEscrow) {
            const error = new Error('Freelancer escrow wallet not found');
            error.statusCode = 409;
            throw error;
        }
        if (clientWallet.status !== 'active' || freelancerEscrow.status !== 'active') {
            const error = new Error('A required wallet is not active');
            error.statusCode = 409;
            throw error;
        }

        const debitResult = await client.query(
            `UPDATE wallets
             SET balance_credits = balance_credits - $1
             WHERE wallet_id = $2
               AND balance_credits >= $1
             RETURNING balance_credits`,
            [priceCredits, clientWallet.wallet_id]
        );
        if (debitResult.rows.length === 0) {
            const error = new Error('Insufficient wallet balance for the additional revision');
            error.statusCode = 409;
            throw error;
        }

        const creditResult = await client.query(
            `UPDATE wallets
             SET balance_credits = balance_credits + $1
             WHERE wallet_id = $2
             RETURNING balance_credits`,
            [priceCredits, freelancerEscrow.wallet_id]
        );

        await client.query(
            `INSERT INTO credit_transactions (
                credit_transaction_id, type, amount_credits, status,
                source_wallet_id, destination_wallet_id,
                reference_table, reference_id
             )
             VALUES (
                $1, 'Escrow Hold', $2, 'completed', $3, $4,
                'contract_milestone_revisions', $5
             )`,
            [
                idempotencyKey,
                priceCredits,
                clientWallet.wallet_id,
                freelancerEscrow.wallet_id,
                milestoneId,
            ]
        );

        const notificationResult = await client.query(
            `INSERT INTO notifications (
                message, is_read, reference_table, reference_prefix,
                reference_path, reference_id, account_id
             ) VALUES ($1, false, 'credit_transactions',
                       'MILESTONE_REVISION_PURCHASED', $2, $3, $4)
             RETURNING *`,
            [
                `${participants.client_name} purchased an additional revision for "${milestone.name}" in "${participants.listing_title}". ${priceCredits} credits are now on hold.`,
                `/dashboard/tasks/${contractId}`,
                idempotencyKey,
                participants.freelancer_account_id,
            ]
        );

        await client.query(
            `UPDATE contract_milestones
             SET credits = credits + $1,
                 no_of_revisions_max = no_of_revisions_max + 1
             WHERE contract_milestone_id = $2`,
            [priceCredits, milestoneId]
        );
        await client.query(
            `UPDATE contracts
             SET rate_credits = rate_credits + $1
             WHERE contract_id = $2`,
            [priceCredits, contractId]
        );

        await client.query('COMMIT');
        return {
            alreadyProcessed: false,
            transactionId: idempotencyKey,
            priceCredits,
            clientAccountId: participants.client_account_id,
            freelancerAccountId: participants.freelancer_account_id,
            listingTitle: participants.listing_title,
            milestoneName: milestone.name,
            notification: notificationResult.rows[0],
            clientBalanceCredits: Number(debitResult.rows[0].balance_credits),
            freelancerEscrowBalanceCredits: Number(creditResult.rows[0].balance_credits),
        };
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
    recordMilestoneAction,
    updateMilestoneStatus,
    unlockNextMilestone,
    submitContractReview,
    buyRevision
};
