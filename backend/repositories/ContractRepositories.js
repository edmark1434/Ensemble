const { pool } = require('../lib/Database');
const { normalizeDisputePriority } = require('../lib/DisputeEnums');
const NotificationRepositories = require('./NotificationRepositories');
const TeamProjectRepositories = require('./TeamProjectRepositories');

async function sendJobOffer(clientIds, proposalId, rateCredits, startsAt, customMilestones = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify proposal exists and belongs to a job owned by this client
        const proposalRes = await client.query(`
            SELECT p.freelancer_account_id, COALESCE(p.revision_price_credits, 0) AS revision_price_credits, 
                   j.job_id, j.title, j.client_account_id, j.hiring_type, j.no_of_hires
            FROM proposals p
            JOIN jobs j ON p.job_id = j.job_id
            WHERE p.proposal_id = $1 AND j.client_account_id = ANY($2::uuid[]) AND p.deleted_at IS NULL
        `, [proposalId, clientIds]);

        if (proposalRes.rows.length === 0) {
            throw new Error("Proposal not found or unauthorized");
        }

        const { freelancer_account_id, revision_price_credits, job_id, title, client_account_id: clientId, hiring_type, no_of_hires } = proposalRes.rows[0];

        // 2. Check client's wallet balance
        const walletRes = await client.query(`
            SELECT w.wallet_id, w.balance_credits, w.status
            FROM wallets w
            JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
            WHERE aw.account_id = $1 AND w.type = 'account wallets'
            FOR UPDATE
        `, [clientId]);

        if (walletRes.rows.length === 0) {
            throw new Error("Client wallet not found");
        }

        const wallet = walletRes.rows[0];
        if (wallet.status !== 'active') {
            throw new Error("Client wallet is not active");
        }
        let clientEscrowWallet;
        if (wallet.balance_credits < rateCredits) {
            throw new Error("Insufficient balance for escrow funding");
        }else{
            const updateWalletRes = await client.query(`
                UPDATE wallets
                SET balance_credits = balance_credits - $1
                WHERE wallet_id = $2 AND balance_credits >= $1
                RETURNING balance_credits
            `, [rateCredits, wallet.wallet_id]);
            if (updateWalletRes.rows.length === 0) {
                throw new Error("Insufficient balance for escrow funding");
            }
            const updateEscrowWallet = await client.query(`
                UPDATE wallets AS w
                SET balance_credits = w.balance_credits + $1
                FROM account_wallets AS aw
                WHERE aw.wallet_id = w.wallet_id
                  AND aw.account_id = $2
                  AND w.type = 'escrow wallets'
                  AND w.status = 'active'
                RETURNING w.wallet_id, w.balance_credits
            `, [rateCredits, clientId]);

            if (updateEscrowWallet.rows.length === 0) {
                throw new Error("Client escrow wallet not found");
            }
            clientEscrowWallet = updateEscrowWallet.rows[0];
        }

        // 4. Create Contract
        const contractRes = await client.query(`
            INSERT INTO contracts (contract_type, payment_type, starts_at, rate_credits, revision_price_credits, status)
            VALUES ('job', 'fixed', $1, $2, $3, 'Pending Signature')
            RETURNING contract_id
        `, [startsAt || new Date(), rateCredits, revision_price_credits]);

        const contractId = contractRes.rows[0].contract_id;

        await client.query(`
            INSERT INTO credit_transactions (
                type, amount_credits, status, source_wallet_id,
                destination_wallet_id, reference_table, reference_id
            ) VALUES ('Escrow Hold', $1, 'completed', $2, $3, 'contracts', $4)
        `, [rateCredits, wallet.wallet_id, clientEscrowWallet.wallet_id, contractId]);

        // 5. Link Contract to Proposal
        await client.query(`
            INSERT INTO job_contracts (contract_id, proposal_id)
            VALUES ($1, $2)
        `, [contractId, proposalId]);

        // 6. Optional: Update milestones if customized by client
        if (Array.isArray(customMilestones) && customMilestones.length > 0) {
            await client.query(`DELETE FROM proposal_milestones WHERE proposal_id = $1`, [proposalId]);
            for (let i = 0; i < customMilestones.length; i++) {
                const m = customMilestones[i];
                if (!m) continue;
                const mName = String(m.name || m.title || `Milestone ${i + 1}`).trim().slice(0, 50);
                const mDesc = String(m.description || '').trim();
                const mDuration = Math.max(1, parseInt(m.duration_hrs || m.hours) || 24);
                const mMaxRev = Math.max(0, parseInt(m.no_of_revisions_max || m.revisions) || 0);

                await client.query(
                    `INSERT INTO proposal_milestones (proposal_id, index, name, description, duration_hrs, no_of_revisions_max)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [proposalId, i, mName, mDesc, mDuration, mMaxRev]
                );
            }
        }

        // 7. Update Proposal Status
        await client.query(`
            UPDATE proposals
            SET status = 'Approved', rate_credits = $2
            WHERE proposal_id = $1
        `, [proposalId, rateCredits]);

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
        return { contract_id: contractId, client_account_id: clientId, freelancer_account_id };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error in sendJobOffer transaction:", error);
        throw error;
    } finally {
        client.release();
    }
}

async function acceptJobOffer(freelancerIds, contractId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify contract belongs to a proposal owned by this freelancer
        const contractRes = await client.query(`
            SELECT c.contract_id, c.starts_at, c.rate_credits, p.proposal_id, p.freelancer_account_id,
                   j.job_id, j.no_of_hires, j.hiring_type, j.title, j.client_account_id,
                   j.timeline_min, j.timeline_max, j.rough_deadline, j.rough_duration_hrs
            FROM contracts c
            JOIN job_contracts jc ON c.contract_id = jc.contract_id
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
            WHERE c.contract_id = $1 AND p.freelancer_account_id = ANY($2::uuid[]) AND c.status = 'Pending Signature'
            FOR UPDATE OF c
        `, [contractId, freelancerIds]);

        if (contractRes.rows.length === 0) {
            throw new Error("Contract not found or not pending signature for this user");
        }

        const {
            starts_at, proposal_id, job_id, no_of_hires, hiring_type, title, client_account_id,
            freelancer_account_id: freelancerId, timeline_min, timeline_max,
            rough_deadline, rough_duration_hrs
        } = contractRes.rows[0];
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
            ) VALUES ('Escrow Hold', $1, 'completed', $2, $3, 'contracts', $4)
        `, [transferAmount, clientEscrow.wallet_id, freelancerEscrow.wallet_id, contractId]);

        // 2. Determine new contract status based on starts_at and compute overall deadline_at
        const now = new Date();
        const contractStatus = new Date(starts_at) > now ? 'Waiting' : 'Active';
        const minDays = Math.max(1, Number(timeline_min) || 1);
        const maxDays = Math.max(minDays, Number(timeline_max) || minDays);
        const totalContractHours = maxDays * 24;
        const contractDeadlineAt = new Date(new Date(starts_at).getTime() + totalContractHours * 3600 * 1000);

        // 3. Update Contract Status and deadline_at
        await client.query(`
            UPDATE contracts
            SET status = $1, deadline_at = $2
            WHERE contract_id = $3
        `, [contractStatus, contractDeadlineAt, contractId]);

        // 3.5. Copy proposal_milestones to contract_milestones, allocate credits, and dynamically divide deadline
        const pMilestonesRes = await client.query(`
            SELECT * FROM proposal_milestones WHERE proposal_id = $1 ORDER BY index ASC
        `, [proposal_id]);
        
        if (pMilestonesRes.rows.length > 0) {
            const milestones = pMilestonesRes.rows;
            const contractRes2 = await client.query('SELECT rate_credits FROM contracts WHERE contract_id = $1', [contractId]);
            const totalCredits = parseFloat(contractRes2.rows[0].rate_credits) || 0;
            const creditsPerMilestone = Math.floor(totalCredits / milestones.length);
            let remainingCredits = totalCredits - (creditsPerMilestone * milestones.length);

            // Dynamic deadline division based on min and max days:
            // Total contract hours (maxDays * 24) are divided across the milestones
            const totalProposedHours = milestones.reduce((sum, m) => sum + (Number(m.duration_hrs) || 0), 0);
            const milestoneHoursList = [];
            let sumAllocatedHours = 0;

            for (let i = 0; i < milestones.length; i++) {
                let h;
                if (i === milestones.length - 1) {
                    h = Math.max(1, totalContractHours - sumAllocatedHours);
                } else if (totalProposedHours > 0) {
                    h = Math.max(1, Math.round(((Number(milestones[i].duration_hrs) || 0) / totalProposedHours) * totalContractHours));
                } else {
                    h = Math.max(1, Math.floor(totalContractHours / milestones.length));
                }
                sumAllocatedHours += h;
                milestoneHoursList.push(h);
            }

            for (let i = 0; i < milestones.length; i++) {
                const m = milestones[i];
                // Add any remainder to the first milestone
                let mCredits = creditsPerMilestone;
                if (i === 0) {
                    mCredits += remainingCredits;
                }
                const isFirstActive = (i === 0 && contractStatus === 'Active');
                const durationHrs = milestoneHoursList[i];
                const startedAt = isFirstActive ? new Date() : null;
                let deadlineAt = null;
                if (isFirstActive && durationHrs > 0) {
                    deadlineAt = new Date(startedAt.getTime() + durationHrs * 3600 * 1000);
                }
                await client.query(`
                    INSERT INTO contract_milestones (
                        contract_id, index, name, description, deadline, no_of_revisions_max, status, credits, started_at, deadline_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `, [
                    contractId, m.index, m.name, m.description, durationHrs, m.no_of_revisions_max || 0,
                    isFirstActive ? 'active' : 'pending',
                    mCredits,
                    startedAt,
                    deadlineAt,
                ]);
            }
        }

        // 4. Update Proposal Status to Hired
        await client.query(`
            UPDATE proposals
            SET status = 'Hired'
            WHERE proposal_id = $1
        `, [proposal_id]);

        // 4b. Ensure Contractual Team Project workspace and membership are synchronized
        if (job_id) {
            await TeamProjectRepositories.ensureContractualTeamProject(client, {
                jobId: job_id,
                clientAccountId: client_account_id,
                contractId,
                proposalId: proposal_id,
                freelancerAccountId: freelancerId,
            });
        }

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

async function rejectJobOffer(freelancerIds, contractId, reason) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify contract belongs to a proposal owned by this freelancer
        const contractRes = await client.query(`
            SELECT c.contract_id, p.proposal_id, p.freelancer_account_id, j.title, j.client_account_id
            FROM contracts c
            JOIN job_contracts jc ON c.contract_id = jc.contract_id
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
            WHERE c.contract_id = $1 AND p.freelancer_account_id = ANY($2::uuid[]) AND c.status = 'Pending Signature'
            FOR UPDATE OF c
        `, [contractId, freelancerIds]);

        if (contractRes.rows.length === 0) {
            throw new Error("Contract not found or not pending signature for this user");
        }

        const { proposal_id, title, client_account_id, rate_credits } = contractRes.rows[0];

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

        // 3b. Refund Client Escrow Hold back to Personal Wallet
        const transferAmount = Number(rate_credits);
        if (transferAmount > 0) {
            const escrowWalletRes = await client.query(`
                SELECT w.wallet_id FROM account_wallets aw JOIN wallets w ON aw.wallet_id = w.wallet_id
                WHERE aw.account_id = $1 AND w.type = 'escrow wallets' FOR UPDATE OF w
            `, [client_account_id]);
            const personalWalletRes = await client.query(`
                SELECT w.wallet_id FROM account_wallets aw JOIN wallets w ON aw.wallet_id = w.wallet_id
                WHERE aw.account_id = $1 AND w.type = 'account_wallets' FOR UPDATE OF w
            `, [client_account_id]);

            if (escrowWalletRes.rows[0] && personalWalletRes.rows[0]) {
                await client.query(`
                    UPDATE wallets
                    SET balance_credits = balance_credits - $1
                    WHERE wallet_id = $2 AND balance_credits >= $1
                `, [transferAmount, escrowWalletRes.rows[0].wallet_id]);

                await client.query(`
                    UPDATE wallets
                    SET balance_credits = balance_credits + $1
                    WHERE wallet_id = $2
                `, [transferAmount, personalWalletRes.rows[0].wallet_id]);

                await client.query(`
                    INSERT INTO credit_transactions (
                        type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
                    ) VALUES ('Escrow Refund', $1, 'completed', $2, $3, 'contracts', $4)
                `, [transferAmount, escrowWalletRes.rows[0].wallet_id, personalWalletRes.rows[0].wallet_id, contractId]);
            }
        }

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

async function openDisputesForContracts(contractIds, viewerAccountIds) {
    const map = new Map();
    const ids = [...new Set((contractIds || []).filter(Boolean).map(String))];
    if (!ids.length) return map;

    const column = await pool.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'disputes'
          AND column_name = 'contract_id'
    `);
    if (!column.rows.length) return map;

    const viewers = new Set((viewerAccountIds || []).map(String));
    const result = await pool.query(`
        SELECT DISTINCT ON (contract_id)
            dispute_id,
            dispute_number,
            contract_id,
            status,
            visibility,
            by_account_id
        FROM disputes
        WHERE contract_id = ANY($1::uuid[])
          AND deleted_at IS NULL
          AND lower(COALESCE(status, '')) <> 'closed'
        ORDER BY contract_id, opened_at DESC NULLS LAST, created_at DESC
    `, [ids]);

    for (const row of result.rows) {
        const filedByViewer = viewers.has(String(row.by_account_id));
        if (!filedByViewer && !row.visibility) continue;
        map.set(String(row.contract_id), {
            id: row.dispute_id,
            number: row.dispute_number || null,
            visibility: Boolean(row.visibility),
            status: row.status,
        });
    }
    return map;
}

async function getContractsByUserId(accountIds) {
    const query = `
        SELECT 
            c.contract_id,
            c.contract_type,
            c.starts_at,
            c.deadline_at,
            c.rate_credits,
            c.status,
            c.created_at,
            p.proposal_id,
            j.job_id,
            j.title as job_title,
            j.description as job_description,
            j.hiring_type as job_hiring_type,
            jm.title as target_milestone_title,
            jm.description as target_milestone_description,
            COALESCE(jm.tasks, '[]'::jsonb) as target_milestone_tasks,
            (SELECT json_agg(json_build_object(
                'id', all_jm.job_milestone_id,
                'title', all_jm.title,
                'description', all_jm.description,
                'tasks', COALESCE(all_jm.tasks, '[]'::jsonb),
                'credits', all_jm.budget_credits
            ) ORDER BY all_jm.order_index ASC) FROM job_milestones all_jm WHERE all_jm.job_id = j.job_id) as job_all_milestones,
            COALESCE(c.deadline_at, j.rough_deadline) as job_deadline,
            j.rate_credits_min,
            j.rate_credits_max,
            COALESCE(c.revision_price_credits, p.revision_price_credits, 0) as additional_work_rate,
            client_acc.display_name as client_name,
            client_acc.handle as client_handle,
            client_f.path as client_avatar,
            j.client_account_id,
            free_acc.display_name as freelancer_name,
            free_acc.handle as freelancer_handle,
            free_f.path as freelancer_avatar,
            p.freelancer_account_id,
            COALESCE(t.terms_title, global_t.terms_title, 'Ensemble Standard Job Terms') as terms_title,
            COALESCE(t.terms_description, global_t.terms_description, 'Standard terms from job') as terms_content,
            COALESCE(j.initiator_role, 'freelancer') as initiator_role,
            COALESCE(j.is_existing_project, false) as is_existing_project,
            j.existing_project_id,
            COALESCE(j.require_nda, false) as require_nda,
            COALESCE(j.portfolio_use_allowed, false) as portfolio_use_allowed,
            j.portfolio_use_duration_seconds,
            (SELECT json_build_object('rating', r.stars_out_of_five) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = p.freelancer_account_id LIMIT 1) as client_rating,
            (SELECT json_build_object('rating', r.stars_out_of_five) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = j.client_account_id LIMIT 1) as freelancer_rating,
            COALESCE(
                (SELECT json_agg(json_build_object('id', cm.contract_milestone_id, 'name', cm.name, 'status', cm.status, 'revisions', cm.no_of_revisions_max, 'deadline', cm.deadline, 'deadline_at', cm.deadline_at, 'started_at', cm.started_at, 'credits', cm.credits)) FROM contract_milestones cm WHERE cm.contract_id = c.contract_id),
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max, 'status', 'Locked')) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id)
            ) as milestones
        FROM contracts c
        JOIN job_contracts jc ON c.contract_id = jc.contract_id
        JOIN proposals p ON jc.proposal_id = p.proposal_id
        JOIN jobs j ON p.job_id = j.job_id
        LEFT JOIN job_milestones jm ON p.job_milestone_id = jm.job_milestone_id
        JOIN accounts client_acc ON j.client_account_id = client_acc.account_id
        LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
        JOIN accounts free_acc ON p.freelancer_account_id = free_acc.account_id
        LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
        LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
        LEFT JOIN LATERAL (SELECT terms_title, terms_description FROM terms_of_service WHERE account_id IS NULL AND terms_type = 'jobs' LIMIT 1) global_t ON true
        WHERE j.client_account_id = ANY($1::uuid[]) OR p.freelancer_account_id = ANY($1::uuid[])

        UNION ALL

        SELECT 
            c.contract_id,
            c.contract_type,
            c.starts_at,
            c.deadline_at,
            c.rate_credits,
            c.status,
            c.created_at,
            gr.gig_request_id as proposal_id,
            g.gig_id as job_id,
            g.title as job_title,
            g.description as job_description,
            'gig' as job_hiring_type,
            gt.title as target_milestone_title,
            gt.description as target_milestone_description,
            '[]'::jsonb as target_milestone_tasks,
            '[]'::json as job_all_milestones,
            c.deadline_at as job_deadline,
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
            COALESCE(t.terms_title, global_t.terms_title, 'Ensemble Standard Gig Terms') as terms_title,
            COALESCE(t.terms_description, global_t.terms_description, 'Standard terms from gig') as terms_content,
            COALESCE(gr.initiator_role, 'client') as initiator_role,
            CASE WHEN gr.linked_project_id IS NOT NULL THEN true ELSE false END as is_existing_project,
            gr.linked_project_id as existing_project_id,
            false as require_nda,
            true as portfolio_use_allowed,
            60 as portfolio_use_duration_seconds,
            (SELECT json_build_object('rating', r.stars_out_of_five) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = g.freelancer_account_id LIMIT 1) as client_rating,
            (SELECT json_build_object('rating', r.stars_out_of_five) FROM ratings r WHERE r.contract_id = c.contract_id AND r.account_id = gr.client_account_id LIMIT 1) as freelancer_rating,
            COALESCE(
                (SELECT json_agg(json_build_object('id', cm.contract_milestone_id, 'name', cm.name, 'status', cm.status, 'revisions', cm.no_of_revisions_max, 'deadline', cm.deadline, 'deadline_at', cm.deadline_at, 'started_at', cm.started_at, 'credits', cm.credits)) FROM contract_milestones cm WHERE cm.contract_id = c.contract_id),
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
        LEFT JOIN LATERAL (SELECT terms_title, terms_description FROM terms_of_service WHERE account_id = g.freelancer_account_id AND terms_type = 'gigs' AND is_default = true LIMIT 1) t ON true
        LEFT JOIN LATERAL (SELECT terms_title, terms_description FROM terms_of_service WHERE account_id IS NULL AND terms_type = 'gigs' LIMIT 1) global_t ON true
        WHERE gr.client_account_id = ANY($1::uuid[]) OR g.freelancer_account_id = ANY($1::uuid[])
        ORDER BY created_at DESC
    `;
    const res = await pool.query(query, [accountIds]);
    const rows = res.rows;
    const disputes = await openDisputesForContracts(rows.map((row) => row.contract_id), accountIds);
    return rows.map((row) => ({
        ...row,
        active_dispute: disputes.get(String(row.contract_id)) || null,
    }));
}

async function createContractDispute(accountIds, contractId, { reason, details }) {
    const contractQ = await pool.query(`
        SELECT 
            c.contract_id,
            c.rate_credits,
            COALESCE(jc_info.client_account_id, gc_info.client_account_id) AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Contract') AS contract_title
        FROM contracts c
        LEFT JOIN (
            SELECT jc.contract_id, j.client_account_id, p.freelancer_account_id, j.title
            FROM job_contracts jc
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
        ) jc_info ON c.contract_id = jc_info.contract_id
        LEFT JOIN (
            SELECT gc.contract_id, gr.client_account_id, g.freelancer_account_id, g.title
            FROM gig_contracts gc
            JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
            JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
            JOIN gigs g ON gt.gig_id = g.gig_id
        ) gc_info ON c.contract_id = gc_info.contract_id
        WHERE c.contract_id = $1
    `, [contractId]);

    if (!contractQ.rows.length) {
        throw new Error('Contract not found');
    }

    const contract = contractQ.rows[0];
    const userAccId = accountIds.find(id => 
        String(id) === String(contract.client_account_id) || 
        String(id) === String(contract.freelancer_account_id)
    );

    if (!userAccId) {
        throw new Error('Unauthorized: You are not a party to this contract');
    }

    const respondentId = String(userAccId) === String(contract.client_account_id)
        ? contract.freelancer_account_id
        : contract.client_account_id;

    const disputeNumber = `DIS-${Date.now().toString().slice(-6)}`;
    const creditAmount = Math.max(0, parseInt(contract.rate_credits, 10) || 0);
    const openDisputeError = () => {
        const error = new Error('This contract already has an open dispute.');
        error.statusCode = 409;
        return error;
    };

    const client = await pool.connect();
    let createdDispute;
    try {
        await client.query('BEGIN');
        await client.query(
            'SELECT pg_advisory_xact_lock(hashtext($1::text)::bigint)',
            [String(contractId)]
        );

        const existing = await client.query(`
            SELECT dispute_id
            FROM disputes
            WHERE contract_id = $1
              AND deleted_at IS NULL
              AND lower(COALESCE(status, '')) <> 'closed'
            LIMIT 1
        `, [contractId]);
        if (existing.rows.length) throw openDisputeError();

        const disputeRes = await client.query(`
            INSERT INTO disputes (
                dispute_number,
                type,
                title,
                description,
                status,
                priority,
                by_account_id,
                for_account_id,
                credit_amount_involved,
                opened_at,
                visibility,
                created_at,
                updated_at,
                contract_id
            ) VALUES (
                $1, 'Contract', $2, $3, 'pending_review', $4, $5, $6, $7, NOW(), false, NOW(), NOW(), $8
            ) RETURNING *
        `, [
            disputeNumber,
            `Contract Dispute: ${reason || contract.contract_title}`.slice(0, 255),
            details || reason || 'Dispute opened by contract participant.',
            normalizeDisputePriority('medium'),
            userAccId,
            respondentId,
            creditAmount,
            contractId,
        ]);
        await client.query('COMMIT');
        createdDispute = disputeRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        if (err.code === '23505') throw openDisputeError();
        throw err;
    } finally {
        client.release();
    }

    const { applyDisputeAutomations } = require('../lib/ModerationPolicy');
    const enrichedDispute = await applyDisputeAutomations(createdDispute);

    return enrichedDispute || createdDispute;
}

async function getContractWithParties(contractId) {
    const res = await pool.query(`
        SELECT 
            c.contract_id,
            c.contract_type,
            c.starts_at,
            c.deadline_at,
            c.status,
            c.rate_credits,
            COALESCE(jc_info.client_account_id, gc_info.client_account_id) AS client_account_id,
            COALESCE(jc_info.freelancer_account_id, gc_info.freelancer_account_id) AS freelancer_account_id,
            COALESCE(jc_info.title, gc_info.title, 'Contract') AS contract_title
        FROM contracts c
        LEFT JOIN (
            SELECT jc.contract_id, j.client_account_id, p.freelancer_account_id, j.title
            FROM job_contracts jc
            JOIN proposals p ON jc.proposal_id = p.proposal_id
            JOIN jobs j ON p.job_id = j.job_id
        ) jc_info ON c.contract_id = jc_info.contract_id
        LEFT JOIN (
            SELECT gc.contract_id, gr.client_account_id, g.freelancer_account_id, g.title
            FROM gig_contracts gc
            JOIN gig_requests gr ON gc.gig_request_id = gr.gig_request_id
            JOIN gig_tiers gt ON gr.gig_tier_id = gt.gig_tier_id
            JOIN gigs g ON gt.gig_id = g.gig_id
        ) gc_info ON c.contract_id = gc_info.contract_id
        WHERE c.contract_id = $1
    `, [contractId]);
    return res.rows[0] || null;
}

async function getContractSubcontractTeam(contractId) {
    const contract = await getContractWithParties(contractId);
    if (!contract) return null;

    const membersRes = await pool.query(`
        SELECT 
            cs.contract_id,
            cs.account_id,
            cs.role_title,
            cs.agreed_credits,
            cs.notes,
            cs.created_at,
            a.display_name,
            a.handle,
            f.path as avatar_url,
            COALESCE(dist.total_distributed, 0)::int AS total_received_credits
        FROM contract_subcontractors cs
        JOIN accounts a ON a.account_id = cs.account_id
        LEFT JOIN files f ON a.avatar_file_id = f.file_id
        LEFT JOIN (
            SELECT recipient_account_id, contract_id, SUM(amount_credits) AS total_distributed
            FROM contract_subcontract_distributions
            WHERE contract_id = $1
            GROUP BY recipient_account_id, contract_id
        ) dist ON dist.recipient_account_id = cs.account_id AND dist.contract_id = cs.contract_id
        WHERE cs.contract_id = $1
        ORDER BY cs.created_at ASC
    `, [contractId]);

    const distRes = await pool.query(`
        SELECT 
            csd.distribution_id,
            csd.contract_id,
            csd.distributed_by_account_id,
            csd.recipient_account_id,
            csd.amount_credits,
            csd.notes,
            csd.created_at,
            a.display_name AS recipient_name,
            a.handle AS recipient_handle,
            rf.path AS recipient_avatar,
            d.display_name AS distributor_name,
            d.handle AS distributor_handle
        FROM contract_subcontract_distributions csd
        JOIN accounts a ON a.account_id = csd.recipient_account_id
        LEFT JOIN files rf ON a.avatar_file_id = rf.file_id
        JOIN accounts d ON d.account_id = csd.distributed_by_account_id
        WHERE csd.contract_id = $1
        ORDER BY csd.created_at DESC
    `, [contractId]);

    const releasedRes = await pool.query(`
        SELECT COALESCE(SUM(ct.amount_credits), 0)::int AS released_credits
        FROM credit_transactions ct
        WHERE ct.type = 'Escrow Release'
          AND LOWER(ct.status) = 'completed'
          AND (
            (ct.reference_table = 'contracts' AND ct.reference_id = $1)
            OR ct.reference_id IN (SELECT contract_milestone_id FROM contract_milestones WHERE contract_id = $1)
            OR ct.source_wallet_id IN (SELECT wallet_id FROM escrow_wallets WHERE contract_id = $1)
          )
    `, [contractId]);

    const releasedCredits = Number(releasedRes.rows[0]?.released_credits || 0);
    const distributedCredits = distRes.rows.reduce((sum, d) => sum + Number(d.amount_credits || 0), 0);
    const remainingDistributableCredits = Math.max(0, releasedCredits - distributedCredits);

    return {
        contract,
        members: membersRes.rows,
        distributions: distRes.rows,
        budget: {
            total_rate_credits: Number(contract.rate_credits || 0),
            released_credits: releasedCredits,
            distributed_credits: distributedCredits,
            remaining_distributable_credits: remainingDistributableCredits,
        },
    };
}

async function addContractSubcontractor({ contractId, accountId, roleTitle = 'Video Editor', agreedCredits = null, notes = null }) {
    const res = await pool.query(`
        INSERT INTO contract_subcontractors (contract_id, account_id, role_title, agreed_credits, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (contract_id, account_id)
        DO UPDATE SET 
            role_title = EXCLUDED.role_title,
            agreed_credits = EXCLUDED.agreed_credits,
            notes = EXCLUDED.notes
        RETURNING *
    `, [contractId, accountId, roleTitle.trim() || 'Video Editor', agreedCredits ? Number(agreedCredits) : null, notes ? String(notes).trim() : null]);
    return res.rows[0];
}

async function removeContractSubcontractor(contractId, accountId) {
    const res = await pool.query(`
        DELETE FROM contract_subcontractors
        WHERE contract_id = $1 AND account_id = $2
        RETURNING *
    `, [contractId, accountId]);
    return res.rows[0] || null;
}

async function distributeContractSubcontractFunds({ contractId, distributorAccountId, recipients, notes = null }) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const senderWalletRes = await client.query(`
            SELECT aw.account_id, w.wallet_id, w.balance_credits, w.status, a.display_name, a.handle
            FROM account_wallets aw
            JOIN wallets w ON w.wallet_id = aw.wallet_id
            JOIN accounts a ON a.account_id = aw.account_id
            WHERE aw.account_id = $1 AND w.type = 'account wallets'
            FOR UPDATE OF w
        `, [distributorAccountId]);
        const senderWallet = senderWalletRes.rows[0];
        if (!senderWallet) throw new Error('Distributor account wallet not found');
        if (String(senderWallet.status).toLowerCase() !== 'active') throw new Error('Distributor wallet is not active');

        const releasedRes = await client.query(`
            SELECT COALESCE(SUM(ct.amount_credits), 0)::int AS released_credits
            FROM credit_transactions ct
            WHERE ct.type = 'Escrow Release'
              AND LOWER(ct.status) = 'completed'
              AND (
                (ct.reference_table = 'contracts' AND ct.reference_id = $1)
                OR ct.reference_id IN (SELECT contract_milestone_id FROM contract_milestones WHERE contract_id = $1)
                OR ct.source_wallet_id IN (SELECT wallet_id FROM escrow_wallets WHERE contract_id = $1)
              )
        `, [contractId]);
        const releasedCredits = Number(releasedRes.rows[0]?.released_credits || 0);

        const distRes = await client.query(`
            SELECT COALESCE(SUM(amount_credits), 0)::int AS distributed_credits
            FROM contract_subcontract_distributions
            WHERE contract_id = $1
        `, [contractId]);
        const distributedCredits = Number(distRes.rows[0]?.distributed_credits || 0);

        const remainingCredits = Math.max(0, releasedCredits - distributedCredits);
        const totalRequested = recipients.reduce((sum, r) => sum + Number(r.amount_credits || 0), 0);

        if (releasedCredits <= 0) {
            throw new Error('Contract funds have not been released from client escrow yet.');
        }
        if (totalRequested > remainingCredits) {
            throw new Error(`Total distribution (${totalRequested} credits) exceeds remaining contract budget (${remainingCredits} credits).`);
        }
        if (Number(senderWallet.balance_credits) < totalRequested) {
            throw new Error(`Insufficient available balance in your account wallet.`);
        }

        const recipientAccountIds = recipients.map((r) => r.account_id);
        const recipientWalletsRes = await client.query(`
            SELECT aw.account_id, w.wallet_id, w.balance_credits, w.status, a.display_name, a.handle
            FROM account_wallets aw
            JOIN wallets w ON w.wallet_id = aw.wallet_id
            JOIN accounts a ON a.account_id = aw.account_id
            WHERE aw.account_id = ANY($1::uuid[]) AND w.type = 'account wallets'
            ORDER BY w.wallet_id
            FOR UPDATE OF w
        `, [recipientAccountIds]);

        const recipientMap = new Map(recipientWalletsRes.rows.map((r) => [String(r.account_id), r]));
        for (const r of recipients) {
            const row = recipientMap.get(String(r.account_id));
            if (!row) throw new Error(`Recipient ${r.account_id} does not have an active account wallet.`);
            if (String(row.status).toLowerCase() !== 'active') throw new Error(`Recipient @${row.handle} account wallet is not active.`);
        }

        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits - $1 WHERE wallet_id = $2
        `, [totalRequested, senderWallet.wallet_id]);

        const createdDistributions = [];
        for (const item of recipients) {
            const target = recipientMap.get(String(item.account_id));
            const amount = Number(item.amount_credits);
            const itemNotes = item.notes ? String(item.notes).trim() : notes;

            await client.query(`
                UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2
            `, [amount, target.wallet_id]);

            const txRes = await client.query(`
                INSERT INTO credit_transactions (
                    type, amount_credits, status, source_wallet_id, destination_wallet_id,
                    reference_table, reference_id
                ) VALUES ('Fund Transfer', $1, 'completed', $2, $3, 'contracts', $4)
                RETURNING credit_transaction_id
            `, [amount, senderWallet.wallet_id, target.wallet_id, contractId]);

            const distInsert = await client.query(`
                INSERT INTO contract_subcontract_distributions (
                    contract_id, distributed_by_account_id, recipient_account_id,
                    amount_credits, notes, credit_transaction_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [contractId, distributorAccountId, item.account_id, amount, itemNotes, txRes.rows[0].credit_transaction_id]);

            createdDistributions.push({
                ...distInsert.rows[0],
                recipient_handle: target.handle,
                recipient_name: target.display_name,
            });
        }

        await client.query('COMMIT');
        return {
            distributions: createdDistributions,
            total_distributed: totalRequested,
            distributor: senderWallet,
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    sendJobOffer,
    acceptJobOffer,
    rejectJobOffer,
    getContractsByUserId,
    createContractDispute,
    getContractWithParties,
    getContractSubcontractTeam,
    addContractSubcontractor,
    removeContractSubcontractor,
    distributeContractSubcontractFunds,
};
