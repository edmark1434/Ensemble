const { pool } = require('../lib/Database');
const NotificationRepositories = require('./NotificationRepositories');

async function sendJobOffer(clientId, proposalId, rateCredits, startsAt) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify proposal exists and belongs to a job owned by this client
        const proposalRes = await client.query(`
            SELECT p.freelancer_account_id, j.job_id, j.title
            FROM proposals p
            JOIN jobs j ON p.job_id = j.job_id
            WHERE p.proposal_id = $1 AND j.client_account_id = $2 AND p.deleted_at IS NULL
        `, [proposalId, clientId]);

        if (proposalRes.rows.length === 0) {
            throw new Error("Proposal not found or unauthorized");
        }

        const { freelancer_account_id, job_id, title } = proposalRes.rows[0];

        // 2. Check client's wallet balance
        const walletRes = await client.query(`
            SELECT w.wallet_id, w.balance_credits 
            FROM wallets w
            JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
            WHERE aw.account_id = $1 AND w.type = 'account wallets'
            FOR UPDATE
        `, [clientId]);

        if (walletRes.rows.length === 0) {
            throw new Error("Client wallet not found");
        }

        const wallet = walletRes.rows[0];
        if (wallet.balance_credits < rateCredits) {
            throw new Error("Insufficient balance for escrow funding");
        }else{
            const updateWalletRes = await client.query(`
                UPDATE wallets
                SET balance_credits = balance_credits - $1
                WHERE wallet_id = $2
            `, [rateCredits, wallet.wallet_id]);
            const updateEscrowWallet = await client.query(`
                UPDATE wallets AS w
                SET balance_credits = w.balance_credits + $1
                FROM account_wallets AS aw
                WHERE aw.wallet_id = w.wallet_id
                  AND aw.account_id = $2
                  AND w.type = 'escrow wallets'
                RETURNING w.wallet_id, w.balance_credits
            `, [rateCredits, clientId]);

            if (updateEscrowWallet.rows.length === 0) {
                throw new Error("Client escrow wallet not found");
            }
        }

        // 4. Create Contract
        const contractRes = await client.query(`
            INSERT INTO contracts (contract_type, payment_type, starts_at, rate_credits, revision_price_credits, status)
            VALUES ('job', 'fixed', $1, $2, 0, 'Pending Signature')
            RETURNING contract_id
        `, [startsAt || new Date(), rateCredits]);

        const contractId = contractRes.rows[0].contract_id;

        // 5. Link Contract to Proposal
        await client.query(`
            INSERT INTO job_contracts (contract_id, proposal_id)
            VALUES ($1, $2)
        `, [contractId, proposalId]);

        // 7. Update Proposal Status
        await client.query(`
            UPDATE proposals
            SET status = 'Approved'
            WHERE proposal_id = $1
        `, [proposalId]);

        // 8. Send Notification to Freelancer
        await NotificationRepositories.createNotification({
            account_id: freelancer_account_id,
            message: `You have received an offer for the job: ${title}`,
            reference_table: 'contracts',
            reference_prefix: 'CON',
            reference_path: `/jobs/proposals/sent/${proposalId}/offer/${contractId}`,
            reference_id: contractId
        });

        await client.query('COMMIT');
        return { contract_id: contractId };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in sendJobOffer transaction:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function acceptJobOffer(freelancerId, contractId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify contract belongs to a proposal owned by this freelancer
        const contractRes = await client.query(`
            SELECT c.contract_id, c.starts_at, c.rate_credits, p.proposal_id,
                   j.job_id, j.no_of_hires, j.title, j.client_account_id
            FROM contracts c
            JOIN job_contracts jc ON c.contract_id = jc.contract_id
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
            WHERE c.contract_id = $1 AND p.freelancer_account_id = $2 AND c.status = 'Pending Signature'
            FOR UPDATE OF c
        `, [contractId, freelancerId]);

        if (contractRes.rows.length === 0) {
            throw new Error("Contract not found or not pending signature for this user");
        }

        const { starts_at, proposal_id, job_id, no_of_hires, title, client_account_id } = contractRes.rows[0];
        const transferAmount = Number(contractRes.rows[0].rate_credits);
        if (!Number.isSafeInteger(transferAmount) || transferAmount <= 0) {
            throw new Error("Contract has an invalid rate");
        }

        const escrowWalletsRes = await client.query(`
            SELECT aw.account_id, w.wallet_id, w.balance_credits, w.status
            FROM account_wallets aw
            JOIN wallets w ON w.wallet_id = aw.wallet_id
            WHERE aw.account_id = ANY($1::uuid[])
              AND w.type = 'escrow wallets'
            ORDER BY w.wallet_id
            FOR UPDATE OF w
        `, [[client_account_id, freelancerId]]);

        const clientEscrow = escrowWalletsRes.rows.find(
            (row) => String(row.account_id) === String(client_account_id)
        );
        const freelancerEscrow = escrowWalletsRes.rows.find(
            (row) => String(row.account_id) === String(freelancerId)
        );

        if (!clientEscrow) throw new Error("Client escrow wallet not found");
        if (!freelancerEscrow) throw new Error("Freelancer escrow wallet not found");
        if (clientEscrow.status !== 'active' || freelancerEscrow.status !== 'active') {
            throw new Error("Escrow wallet is not active");
        }

        const debitClientEscrowRes = await client.query(`
            UPDATE wallets
            SET balance_credits = balance_credits - $1
            WHERE wallet_id = $2 AND balance_credits >= $1
            RETURNING balance_credits
        `, [transferAmount, clientEscrow.wallet_id]);

        if (debitClientEscrowRes.rows.length === 0) {
            throw new Error("Client escrow balance is insufficient");
        }

        const creditFreelancerEscrowRes = await client.query(`
            UPDATE wallets
            SET balance_credits = balance_credits + $1
            WHERE wallet_id = $2
            RETURNING balance_credits
        `, [transferAmount, freelancerEscrow.wallet_id]);

        await client.query(`
            INSERT INTO credit_transactions (
                type, amount_credits, status, source_wallet_id,
                destination_wallet_id, reference_table, reference_id
            ) VALUES ('Fund Transfer', $1, 'completed', $2, $3, 'contracts', $4)
        `, [transferAmount, clientEscrow.wallet_id, freelancerEscrow.wallet_id, contractId]);

        // 2. Determine new contract status based on starts_at
        const now = new Date();
        const contractStatus = new Date(starts_at) > now ? 'Waiting' : 'Active';

        // 3. Update Contract Status
        await client.query(`
            UPDATE contracts
            SET status = $1
            WHERE contract_id = $2
        `, [contractStatus, contractId]);

        // 3.5. Copy proposal_milestones to contract_milestones and allocate credits
        const pMilestonesRes = await client.query(`
            SELECT * FROM proposal_milestones WHERE proposal_id = $1 ORDER BY index ASC
        `, [proposal_id]);
        
        if (pMilestonesRes.rows.length > 0) {
            const milestones = pMilestonesRes.rows;
            const contractRes2 = await client.query('SELECT rate_credits FROM contracts WHERE contract_id = $1', [contractId]);
            const totalCredits = parseFloat(contractRes2.rows[0].rate_credits) || 0;
            const creditsPerMilestone = Math.floor(totalCredits / milestones.length);
            let remainingCredits = totalCredits - (creditsPerMilestone * milestones.length);

            for (let i = 0; i < milestones.length; i++) {
                const m = milestones[i];
                // Add any remainder to the first milestone
                let mCredits = creditsPerMilestone;
                if (i === 0) {
                    mCredits += remainingCredits;
                }
                await client.query(`
                    INSERT INTO contract_milestones (
                        contract_id, index, name, description, deadline, no_of_revisions_max, status, credits
                    ) VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)
                `, [
                    contractId, m.index, m.name, m.description, m.duration_hrs || 0, m.no_of_revisions_max || 0, mCredits
                ]);
            }
        }

        // 4. Update Proposal Status to Hired
        await client.query(`
            UPDATE proposals
            SET status = 'Hired'
            WHERE proposal_id = $1
        `, [proposal_id]);

        // 5. Notify the Client
        await NotificationRepositories.createNotification({
            account_id: client_account_id,
            message: `Your offer for ${title} has been accepted!`,
            reference_table: 'contracts',
            reference_prefix: 'CON',
            reference_path: `/contracts/${contractId}`,
            reference_id: contractId
        });

        // 6. Check Positions Filled Quota
        const hiredCountRes = await client.query(`
            SELECT COUNT(*) as hired_count
            FROM proposals
            WHERE job_id = $1 AND status = 'Hired' AND deleted_at IS NULL
        `, [job_id]);

        const hiredCount = parseInt(hiredCountRes.rows[0].hired_count, 10);

        if (hiredCount >= no_of_hires) {
            // Auto-close job
            await client.query(`
                UPDATE jobs
                SET status = 'Closed'
                WHERE job_id = $1
            `, [job_id]);

            // Archive remaining pending proposals
            const pendingProposalsRes = await client.query(`
                UPDATE proposals
                SET status = 'Archived'
                WHERE job_id = $1 AND status IN ('Pending', 'Approved') AND deleted_at IS NULL
                RETURNING freelancer_account_id
            `, [job_id]);

            // Notify those freelancers
            for (const row of pendingProposalsRes.rows) {
                await NotificationRepositories.createNotification({
                    account_id: row.freelancer_account_id,
                    message: `The job '${title}' has been closed and filled.`,
                    reference_table: 'jobs',
                    reference_prefix: 'JOB',
                    reference_path: `/jobs/${job_id}`,
                    reference_id: job_id
                });
            }
        }

        await client.query('COMMIT');
        return {
            contract_id: contractId,
            status: contractStatus,
            hired_count: hiredCount,
            job_closed: hiredCount >= no_of_hires,
            amount_credits: transferAmount,
            client_escrow_balance: Number(debitClientEscrowRes.rows[0].balance_credits),
            freelancer_escrow_balance: Number(creditFreelancerEscrowRes.rows[0].balance_credits),
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in acceptJobOffer transaction:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function rejectJobOffer(freelancerId, contractId, reason) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify contract belongs to a proposal owned by this freelancer
        const contractRes = await client.query(`
            SELECT c.contract_id, p.proposal_id, j.title, j.client_account_id
            FROM contracts c
            JOIN job_contracts jc ON c.contract_id = jc.contract_id
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
            WHERE c.contract_id = $1 AND p.freelancer_account_id = $2 AND c.status = 'Pending Signature'
            FOR UPDATE OF c
        `, [contractId, freelancerId]);

        if (contractRes.rows.length === 0) {
            throw new Error("Contract not found or not pending signature for this user");
        }

        const { proposal_id, title, client_account_id } = contractRes.rows[0];

        // 2. Update Contract Status
        await client.query(`
            UPDATE contracts
            SET status = 'Rejected'
            WHERE contract_id = $1
        `, [contractId]);

        // 3. Update Proposal Status
        await client.query(`
            UPDATE proposals
            SET status = 'Pending', reject_reason = $1
            WHERE proposal_id = $2
        `, [reason || 'Applicant rejected the contract offer.', proposal_id]);

        // 4. Notify the Client
        await NotificationRepositories.createNotification({
            account_id: client_account_id,
            message: `Your contract offer for ${title} was rejected. Reason: ${reason || 'No reason provided.'}`,
            reference_table: 'proposals',
            reference_prefix: 'PRP',
            reference_path: `/jobs/proposals/incoming/${proposal_id}`,
            reference_id: proposal_id
        });

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in rejectJobOffer transaction:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function getContractsByUserId(accountId) {
    const query = `
        SELECT 
            c.contract_id,
            c.contract_type,
            c.starts_at,
            c.rate_credits,
            c.status,
            c.created_at,
            p.proposal_id,
            j.job_id,
            j.title as job_title,
            j.description as job_description,
            j.rough_deadline as job_deadline,
            j.rate_credits_min,
            j.rate_credits_max,
            p.revision_price_credits as additional_work_rate,
            client_acc.display_name as client_name,
            client_acc.handle as client_handle,
            client_f.path as client_avatar,
            j.client_account_id,
            free_acc.display_name as freelancer_name,
            free_acc.handle as freelancer_handle,
            free_f.path as freelancer_avatar,
            p.freelancer_account_id,
            t.terms_title,
            t.terms_description as terms_content,
            COALESCE(
                (SELECT json_agg(json_build_object('id', cm.contract_milestone_id, 'name', cm.name, 'status', cm.status, 'revisions', cm.no_of_revisions_max, 'deadline', cm.deadline, 'credits', cm.credits)) FROM contract_milestones cm WHERE cm.contract_id = c.contract_id),
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max, 'status', 'Locked')) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id)
            ) as milestones
        FROM contracts c
        JOIN job_contracts jc ON c.contract_id = jc.contract_id
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        JOIN jobs j ON p.job_id = j.job_id
        JOIN accounts client_acc ON j.client_account_id = client_acc.account_id
        LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
        JOIN accounts free_acc ON p.freelancer_account_id = free_acc.account_id
        LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
        LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
        WHERE j.client_account_id = $1 OR p.freelancer_account_id = $1

        UNION ALL

        SELECT 
            c.contract_id,
            c.contract_type,
            c.starts_at,
            c.rate_credits,
            c.status,
            c.created_at,
            gr.gig_request_id as proposal_id,
            g.gig_id as job_id,
            g.title as job_title,
            g.description as job_description,
            NULL as job_deadline,
            gt.rate_credits as rate_credits_min,
            gt.rate_credits as rate_credits_max,
            c.revision_price_credits as additional_work_rate,
            client_acc.display_name as client_name,
            client_acc.handle as client_handle,
            client_f.path as client_avatar,
            gr.client_account_id as client_account_id,
            free_acc.display_name as freelancer_name,
            free_acc.handle as freelancer_handle,
            free_f.path as freelancer_avatar,
            g.freelancer_account_id as freelancer_account_id,
            'Gig Terms' as terms_title,
            'Standard terms from gig' as terms_content,
            COALESCE(
                (SELECT json_agg(json_build_object('id', cm.contract_milestone_id, 'name', cm.name, 'status', cm.status, 'revisions', cm.no_of_revisions_max, 'deadline', cm.deadline, 'credits', cm.credits)) FROM contract_milestones cm WHERE cm.contract_id = c.contract_id),
                '[]'::json
            ) as milestones
        FROM contracts c
        JOIN gig_contracts gc ON c.contract_id = gc.contract_id
        JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
        JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
        JOIN gigs g ON gt.gig_id = g.gig_id
        JOIN accounts client_acc ON gr.client_account_id = client_acc.account_id
        LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
        JOIN accounts free_acc ON g.freelancer_account_id = free_acc.account_id
        LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
        WHERE gr.client_account_id = $1 OR g.freelancer_account_id = $1
        ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [accountId]);
    return res.rows;
}

module.exports = {
    sendJobOffer,
    acceptJobOffer,
    rejectJobOffer,
    getContractsByUserId
};
