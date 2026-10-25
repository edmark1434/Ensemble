// backend/repositories/JobRepositories.js
const { pool } = require('../lib/Database');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function createJobRepositories(jobData) {
    const client = await pool.connect();
    try {
                await client.query('BEGIN');
        
        // 0. Deduct Job Posting Fee (50 Credits)
        // Prefer actor wallet if it has >= 50 credits, otherwise fall back to the authenticated user's personal wallet
        const actorAccountId = jobData.client_account_id;
        const payerAccountId = jobData.payer_account_id || actorAccountId;
        const fee = 50;

        const walletCandidates = Array.from(new Set([actorAccountId, payerAccountId].filter(Boolean)));
        const walletRes = await client.query(`
            SELECT aw.account_id, w.wallet_id, w.balance_credits 
            FROM wallets w
            JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
            WHERE aw.account_id = ANY($1::uuid[]) AND w.type = 'account wallets'
            FOR UPDATE
        `, [walletCandidates]);

        if (walletRes.rows.length === 0) {
            const err = new Error('Wallet not found');
            err.statusCode = 404;
            throw err;
        }

        const actorWallet = walletRes.rows.find((r) => String(r.account_id) === String(actorAccountId));
        const personalWallet = walletRes.rows.find((r) => String(r.account_id) === String(payerAccountId));
        const chosenWallet =
            personalWallet && Number(personalWallet.balance_credits) >= fee
                ? personalWallet
                : actorWallet && Number(actorWallet.balance_credits) >= fee
                ? actorWallet
                : personalWallet || actorWallet || walletRes.rows[0];

        if (Number(chosenWallet.balance_credits) < fee) {
            const err = new Error('Insufficient funds. You need 50 Credits to post a job.');
            err.statusCode = 402;
            throw err;
        }

        const platformRes = await client.query(`
            SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1 FOR UPDATE
        `);
        const platformWalletId = platformRes.rows[0].wallet_id;
        const userWalletId = chosenWallet.wallet_id;

        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits - $1 WHERE wallet_id = $2
        `, [fee, userWalletId]);

        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2
        `, [fee, platformWalletId]);
        
        await client.query(`
            INSERT INTO credit_transactions (
                type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table
            ) VALUES (
                'Job Posting Fee', $1, 'Completed', $2, $3, 'jobs'
            )
        `, [fee, userWalletId, platformWalletId]);

        // 1. Insert Job
        let applicationDeadline = jobData.application_deadline || jobData.applicationDeadline;
        if (!applicationDeadline && jobData.application_window_hours) {
            const hrs = parseInt(jobData.application_window_hours, 10);
            if (!isNaN(hrs) && hrs > 0) {
                applicationDeadline = new Date(Date.now() + hrs * 60 * 60 * 1000);
            }
        }
        if (!applicationDeadline) {
            applicationDeadline = jobData.deadline || jobData.rough_deadline;
        }
        if (!applicationDeadline) {
            // Default 7 days
            applicationDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        }

        const isUrgent = Boolean(
            jobData.is_urgent || 
            jobData.isUrgent || 
            (jobData.application_window_hours && parseInt(jobData.application_window_hours, 10) <= 24)
        );
        const hardDeadline = jobData.hard_deadline || jobData.hardDeadline || null;
        const postingFeeCredits = fee; // 50

        let deadline = hardDeadline || applicationDeadline;

        const jobQuery = `
            INSERT INTO jobs (
                client_account_id, title, description, category, payment_type, 
                experience_level, no_of_hires, rate_credits_min, rate_credits_max,
                timeline_min, timeline_max, posted_as, team_id, status,
                rough_deadline, rough_no_of_revisions,
                portfolio_use_allowed, portfolio_use_duration_seconds,
                is_existing_project, existing_project_id, initiator_role, require_nda,
                hiring_type, screening_questions,
                application_deadline, is_urgent, hard_deadline, posting_fee_credits
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                $15, 0,
                $16, $17, $18, $19, $20, $21,
                $22, $23,
                $24, $25, $26, $27
            ) RETURNING job_id;
        `;

        const jobValues = [
            jobData.client_account_id, jobData.title, jobData.description, 
            jobData.category, jobData.payment_type, jobData.experience_level, 
            jobData.no_of_hires || 1, jobData.rate_credits_min, (jobData.rate_credits_max ? parseInt(jobData.rate_credits_max, 10) : null),
            jobData.timeline_min, jobData.timeline_max, jobData.posted_as, 
            jobData.team_id || null, jobData.status || 'Open',
            deadline,
            jobData.portfolio_use_allowed || false,
            jobData.portfolio_use_duration_seconds || null,
            jobData.is_existing_project || false,
            jobData.existing_project_id || null,
            jobData.initiator_role || null,
            jobData.require_nda || false,
            jobData.hiring_type || 'single',
            JSON.stringify(Array.isArray(jobData.screening_questions) ? jobData.screening_questions : []),
            applicationDeadline,
            isUrgent,
            hardDeadline,
            postingFeeCredits
        ];
        
        const res = await client.query(jobQuery, jobValues);
        const jobId = res.rows[0].job_id;

        // 2. Insert Thumbnail & Additional Brief Attachments
        if (jobData.file_id) {
            await client.query(
                `INSERT INTO job_attachments (job_id, file_id, index) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [jobId, jobData.file_id, 0]
            );
        }
        if (Array.isArray(jobData.file_ids) && jobData.file_ids.length > 0) {
            for (let i = 0; i < jobData.file_ids.length; i++) {
                const fId = jobData.file_ids[i];
                if (fId && fId !== jobData.file_id) {
                    await client.query(
                        `INSERT INTO job_attachments (job_id, file_id, index) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                        [jobId, fId, i + 1]
                    );
                }
            }
        }

        // 3. Insert Tags
        if (jobData.tags && jobData.tags.length > 0) {
            for (const tagName of jobData.tags) {
                // Ignore empty tags
                if (!tagName || typeof tagName !== 'string') continue;

                let tagId;
                const tagRes = await client.query(`SELECT tag_id FROM tags WHERE LOWER(name) = LOWER($1) LIMIT 1`, [tagName]);
                if (tagRes.rows.length > 0) {
                    tagId = tagRes.rows[0].tag_id;
                } else {
                    const newTagRes = await client.query(`INSERT INTO tags (name) VALUES ($1) RETURNING tag_id`, [tagName]);
                    tagId = newTagRes.rows[0].tag_id;
                }

                await client.query(
                    `INSERT INTO job_tags (job_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [jobId, tagId]
                );
            }
        }

        // 4. Insert Milestones (for team/multi-hire jobs)
        if (jobData.milestones && Array.isArray(jobData.milestones) && jobData.milestones.length > 0) {
            for (let i = 0; i < jobData.milestones.length; i++) {
                const m = jobData.milestones[i];
                if (!m || !m.title) continue;

                const tasksJson = JSON.stringify(Array.isArray(m.tasks) ? m.tasks : []);
                const budgetPercentage = Number(m.budget_percentage) || 0;
                const budgetCredits = Number(m.budget_credits) || 0;
                const slotsCount = Math.max(1, parseInt(m.slots_count) || 1);
                const durationHours = Math.max(1, parseInt(m.duration_hours) || 24);

                await client.query(
                    `INSERT INTO job_milestones (
                        job_id, title, description, tasks, budget_percentage, budget_credits, slots_count, duration_hours, order_index
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [jobId, m.title.trim(), m.description || '', tasksJson, budgetPercentage, budgetCredits, slotsCount, durationHours, i]
                );
            }
        }

        await client.query('COMMIT');
        return jobId;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in createJobRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getAllJobsRepositories(filters = {}, accountId = null, actorIds = [], affiliatedAccountIds = actorIds) {
    try {
        let query = `
            SELECT 
                j.*,
                a.display_name as client_name,
                a.handle as client_handle,
                (SELECT f.path FROM files f WHERE f.file_id = a.avatar_file_id LIMIT 1) as client_avatar_path,
                COALESCE((SELECT ROUND(AVG(r.stars_out_of_five)::numeric, 1) FROM ratings r WHERE r.account_id = j.client_account_id), 0) as client_rating,
                (SELECT COUNT(*) FROM ratings r WHERE r.account_id = j.client_account_id) as client_rating_count,
                (SELECT COUNT(*) FROM proposals p WHERE p.job_id = j.job_id AND p.deleted_at IS NULL) as applicant_count,
                (SELECT COUNT(*) FROM proposals p WHERE p.job_id = j.job_id AND p.status = 'Hired' AND p.deleted_at IS NULL) as hired_count,
                (SELECT COUNT(*) FROM job_saves js WHERE js.job_id = j.job_id) as saves_count,
                CASE WHEN $1::uuid IS NOT NULL THEN (SELECT EXISTS(SELECT 1 FROM job_saves js WHERE js.job_id = j.job_id AND js.account_id = $1)) ELSE FALSE END as is_saved,
                CASE WHEN cardinality($2::uuid[]) > 0 THEN (SELECT EXISTS(SELECT 1 FROM proposals p WHERE p.job_id = j.job_id AND p.freelancer_account_id = ANY($2::uuid[]) AND p.deleted_at IS NULL)) ELSE FALSE END as has_proposed,
                CASE WHEN cardinality($2::uuid[]) > 0 THEN (SELECT p.proposal_id FROM proposals p WHERE p.job_id = j.job_id AND p.freelancer_account_id = ANY($2::uuid[]) AND p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT 1) ELSE NULL END as my_proposal_id,
                j.client_account_id = ANY($3::uuid[]) AS is_own_post,
                j.client_account_id = ANY($2::uuid[]) AS is_manageable_post,
                j.client_account_id = $1::uuid AS is_personal_post,
                (SELECT f.path FROM job_attachments ja JOIN files f ON ja.file_id = f.file_id WHERE ja.job_id = j.job_id AND ja.index = 0 LIMIT 1) as thumbnail_path,
                (SELECT ARRAY_AGG(t.name) FROM job_tags jt JOIN tags t ON jt.tag_id = t.tag_id WHERE jt.job_id = j.job_id) as tags,
                COALESCE(j.team_id, tm.team_id) as team_id,
                tm.visibility as team_visibility,
                (j.posted_as = 'Team' OR j.team_id IS NOT NULL OR tm.team_id IS NOT NULL) as is_team,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'job_milestone_id', jm.job_milestone_id,
                                'title', jm.title,
                                'description', jm.description,
                                'tasks', jm.tasks,
                                'budget_percentage', jm.budget_percentage,
                                'budget_credits', jm.budget_credits,
                                'slots_count', jm.slots_count,
                                'duration_hours', jm.duration_hours,
                                'order_index', jm.order_index,
                                'applicant_count', (SELECT COUNT(*) FROM proposals p WHERE p.job_milestone_id = jm.job_milestone_id AND p.deleted_at IS NULL),
                                'hired_count', (SELECT COUNT(*) FROM proposals p WHERE p.job_milestone_id = jm.job_milestone_id AND p.status = 'Hired' AND p.deleted_at IS NULL)
                            ) ORDER BY jm.order_index ASC
                        ),
                        '[]'::json
                    )
                    FROM job_milestones jm
                    WHERE jm.job_id = j.job_id
                ) as milestones,
                COALESCE(j.screening_questions, '[]'::jsonb) as screening_questions,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'file_id', ja.file_id,
                                'name', f.name,
                                'path', f.path,
                                'mime_type', f.mime_type,
                                'size_bytes', f.size_bytes,
                                'index', ja.index
                            ) ORDER BY ja.index ASC
                        ),
                        '[]'::json
                    )
                    FROM job_attachments ja
                    JOIN files f ON ja.file_id = f.file_id
                    WHERE ja.job_id = j.job_id AND ja.index > 0
                ) as attachments,
                (SELECT COUNT(*) FROM proposals p WHERE p.job_id = j.job_id AND p.status = 'Shortlisted' AND p.deleted_at IS NULL) as shortlisted_count,
                (
                    SELECT CASE 
                        WHEN COUNT(*) = 0 THEN 100 
                        ELSE ROUND((COUNT(*) FILTER (WHERE p.status = 'Hired')::numeric / COUNT(*)::numeric) * 100) 
                    END
                    FROM jobs j2
                    JOIN proposals p ON j2.job_id = p.job_id
                    WHERE j2.client_account_id = j.client_account_id AND j2.deleted_at IS NULL
                ) as client_hire_rate,
                COALESCE(j.updated_at, j.created_at) as client_last_active
            FROM jobs j
            LEFT JOIN accounts a ON j.client_account_id = a.account_id
            LEFT JOIN teams tm ON (
                (j.team_id IS NOT NULL AND j.team_id = tm.team_id)
                OR (j.client_account_id = tm.account_id)
            ) AND tm.deleted_at IS NULL
            WHERE j.deleted_at IS NULL
        `;
        
        const values = [accountId, actorIds, affiliatedAccountIds];
        // Apply filters if needed (e.g. status)
        if (filters.status) {
            values.push(filters.status);
            query += ` AND j.status = $${values.length}`;
        }
        if (filters.jobId || filters.job_id) {
            values.push(filters.jobId || filters.job_id);
            query += ` AND j.job_id = $${values.length}`;
        }
        
        query += ` ORDER BY j.created_at DESC`;
        
        const res = await pool.query(query, values);
        return res.rows;
    } catch (err) {
        console.error('Error in getAllJobsRepositories:', err);
        throw err;
    }
}

async function updateJobRepositories(jobId, accountIds, jobData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const query = `
            UPDATE jobs
            SET title = COALESCE($1, title), description = COALESCE($2, description), category = COALESCE($3, category), experience_level = COALESCE($4, experience_level),
                portfolio_use_allowed = COALESCE($7, portfolio_use_allowed), portfolio_use_duration_seconds = COALESCE($8, portfolio_use_duration_seconds),
                is_existing_project = COALESCE($9, is_existing_project), existing_project_id = COALESCE($10, existing_project_id),
                initiator_role = COALESCE($11, initiator_role),
                require_nda = COALESCE($12, require_nda),
                status = COALESCE($13, status),
                updated_at = NOW()
            WHERE job_id = $5 AND client_account_id = ANY($6::uuid[])
            RETURNING *;
        `;
        const values = [
            jobData.title !== undefined ? jobData.title : null,
            jobData.description !== undefined ? jobData.description : null,
            jobData.category !== undefined ? jobData.category : null,
            jobData.experience_level !== undefined ? jobData.experience_level : null,
            jobId, accountIds,
            jobData.portfolio_use_allowed !== undefined ? jobData.portfolio_use_allowed : null, 
            jobData.portfolio_use_duration_seconds !== undefined ? jobData.portfolio_use_duration_seconds : null, 
            jobData.is_existing_project !== undefined ? jobData.is_existing_project : null, 
            jobData.existing_project_id !== undefined ? jobData.existing_project_id : null, 
            jobData.initiator_role !== undefined ? jobData.initiator_role : null,
            jobData.require_nda !== undefined ? jobData.require_nda : null,
            jobData.status !== undefined ? jobData.status : null
        ];
        const res = await client.query(query, values);
        const updatedJob = res.rows[0];

        if (!updatedJob) {
            await client.query('ROLLBACK');
            return null;
        }

        // Handle Tags
        if (jobData.tags) {
            await client.query(`DELETE FROM job_tags WHERE job_id = $1`, [jobId]);
            for (const tagName of jobData.tags) {
                if (!tagName || typeof tagName !== 'string') continue;
                let tagId;
                const tagRes = await client.query(`SELECT tag_id FROM tags WHERE LOWER(name) = LOWER($1) LIMIT 1`, [tagName]);
                if (tagRes.rows.length > 0) {
                    tagId = tagRes.rows[0].tag_id;
                } else {
                    const newTagRes = await client.query(`INSERT INTO tags (name) VALUES ($1) RETURNING tag_id`, [tagName]);
                    tagId = newTagRes.rows[0].tag_id;
                }
                await client.query(
                    `INSERT INTO job_tags (job_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [jobId, tagId]
                );
            }
        }

        // Handle Thumbnail
        if (jobData.file_id) {
            await client.query(`DELETE FROM job_attachments WHERE job_id = $1 AND index = 0`, [jobId]);
            await client.query(
                `INSERT INTO job_attachments (job_id, file_id, index) VALUES ($1, $2, $3)`,
                [jobId, jobData.file_id, 0]
            );
        }

        await client.query('COMMIT');
        return updatedJob;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in updateJobRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function deleteJobRepositories(jobId, accountIds) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check hired count
        const hiredCheck = await client.query(`
            SELECT COUNT(*) as hired_count 
            FROM proposals 
            WHERE job_id = $1 AND status = 'Hired' AND deleted_at IS NULL
        `, [jobId]);

        if (parseInt(hiredCheck.rows[0].hired_count) > 0) {
            throw new Error('Cannot delete a job post that already has positions filled.');
        }

        // Soft delete job
        const jobUpdate = await client.query(`
            UPDATE jobs
            SET deleted_at = NOW(), status = 'Deleted'
            WHERE job_id = $1 AND client_account_id = ANY($2::uuid[]) AND deleted_at IS NULL
            RETURNING *;
        `, [jobId, accountIds]);

        if (jobUpdate.rows.length === 0) {
            throw new Error('Job not found or unauthorized.');
        }

        // Refund 10 Credits Proposal Fee on abandoned job (0 hires)
        const platformWalletRes = await client.query(`
            SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1 FOR UPDATE
        `);
        const platformWalletId = platformWalletRes.rows[0]?.wallet_id;

        const deletedJob = jobUpdate.rows[0];

        const applicantsToRefund = await client.query(`
            SELECT p.proposal_id, p.freelancer_account_id, p.submission_fee_credits
            FROM proposals p
            WHERE p.job_id = $1 AND p.deleted_at IS NULL AND p.status IN ('Pending', 'Shortlisted', 'Interviewing')
        `, [jobId]);

        // If 0 proposals, refund 50-credit posting fee to client
        if (applicantsToRefund.rows.length === 0 && platformWalletId) {
            const clientWalletRes = await client.query(`
                SELECT w.wallet_id 
                FROM wallets w
                JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
                WHERE aw.account_id = $1 AND w.type = 'account wallets'
                FOR UPDATE
            `, [deletedJob.client_account_id]);

            if (clientWalletRes.rows.length > 0) {
                const clientWalletId = clientWalletRes.rows[0].wallet_id;
                const refundAmount = deletedJob.posting_fee_credits || 50;

                await client.query(`
                    UPDATE wallets SET balance_credits = balance_credits + $1, updated_at = NOW() WHERE wallet_id = $2
                `, [refundAmount, clientWalletId]);

                await client.query(`
                    UPDATE wallets SET balance_credits = GREATEST(0, balance_credits - $1), updated_at = NOW() WHERE wallet_id = $2
                `, [refundAmount, platformWalletId]);

                await client.query(`
                    INSERT INTO credit_transactions (
                        type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
                    ) VALUES (
                        'Job Posting Fee Refund', $1, 'Completed', $2, $3, 'jobs', $4
                    )
                `, [refundAmount, platformWalletId, clientWalletId, jobId]);
            }
        }

        for (const applicant of applicantsToRefund.rows) {
            const userWalletRes = await client.query(`
                SELECT w.wallet_id 
                FROM wallets w
                JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
                WHERE aw.account_id = $1 AND w.type = 'account wallets'
                FOR UPDATE
            `, [applicant.freelancer_account_id]);

            if (userWalletRes.rows.length > 0 && platformWalletId) {
                const userWalletId = userWalletRes.rows[0].wallet_id;
                // Credit user wallet +10
                await client.query(`
                    UPDATE wallets SET balance_credits = balance_credits + 10, updated_at = NOW() WHERE wallet_id = $1
                `, [userWalletId]);

                // Deduct platform wallet -10
                await client.query(`
                    UPDATE wallets SET balance_credits = GREATEST(0, balance_credits - 10), updated_at = NOW() WHERE wallet_id = $1
                `, [platformWalletId]);

                // Record transaction
                await client.query(`
                    INSERT INTO credit_transactions (
                        type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
                    ) VALUES (
                        'Proposal Fee Refund', 10, 'Completed', $1, $2, 'jobs', $3
                    )
                `, [platformWalletId, userWalletId, jobId]);
            }
        }

        // Archive non-hired proposals
        await client.query(`
            UPDATE proposals
            SET status = 'Archived', updated_at = NOW()
            WHERE job_id = $1 AND status != 'Hired' AND deleted_at IS NULL
        `, [jobId]);

        await client.query('COMMIT');
        return jobUpdate.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in deleteJobRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function createProposalRepositories(proposalData) {
    const client = await pool.connect();
    try {
                await client.query('BEGIN');

        // 0. Deduct Proposal Fee (10 Credits)
        // Prefer the authenticated user's personal wallet (which is shown in the Checkout Modal & FloatingCreditsPill),
        // or fall back to the acting team's wallet if it holds the funds.
        const actorAccountId = proposalData.freelancer_account_id;
        const payerAccountId = proposalData.payer_account_id || actorAccountId;
        const fee = 10;

        const walletCandidates = Array.from(new Set([payerAccountId, actorAccountId].filter(Boolean)));
        const walletRes = await client.query(`
            SELECT aw.account_id, w.wallet_id, w.balance_credits 
            FROM wallets w
            JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
            WHERE aw.account_id = ANY($1::uuid[]) AND w.type = 'account wallets'
            FOR UPDATE
        `, [walletCandidates]);

        if (walletRes.rows.length === 0) {
            const err = new Error('Wallet not found');
            err.statusCode = 404;
            throw err;
        }

        const personalWallet = walletRes.rows.find((r) => String(r.account_id) === String(payerAccountId));
        const actorWallet = walletRes.rows.find((r) => String(r.account_id) === String(actorAccountId));
        const chosenWallet =
            personalWallet && Number(personalWallet.balance_credits) >= fee
                ? personalWallet
                : actorWallet && Number(actorWallet.balance_credits) >= fee
                ? actorWallet
                : personalWallet || actorWallet || walletRes.rows[0];

        if (Number(chosenWallet.balance_credits) < fee) {
            const err = new Error('Insufficient funds. You need 10 Credits to submit a proposal.');
            err.statusCode = 402;
            throw err;
        }

        const platformRes = await client.query(`
            SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1 FOR UPDATE
        `);
        const platformWalletId = platformRes.rows[0].wallet_id;
        const userWalletId = chosenWallet.wallet_id;

        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits - $1 WHERE wallet_id = $2
        `, [fee, userWalletId]);

        await client.query(`
            UPDATE wallets SET balance_credits = balance_credits + $1 WHERE wallet_id = $2
        `, [fee, platformWalletId]);
        
        await client.query(`
            INSERT INTO credit_transactions (
                type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
            ) VALUES (
                'Proposal Fee', $1, 'Completed', $2, $3, 'jobs', $4
            )
        `, [fee, userWalletId, platformWalletId, proposalData.job_id]);

        const jobResult = await client.query(
            `SELECT client_account_id,
                    application_deadline,
                    client_account_id = ANY($2::uuid[]) AS is_affiliated_listing
             FROM jobs
             WHERE job_id = $1 AND deleted_at IS NULL AND status = 'Open'
             FOR UPDATE`,
            [proposalData.job_id, proposalData.prohibited_client_account_ids || []]
        );
        if (jobResult.rows[0]?.application_deadline && new Date(jobResult.rows[0].application_deadline).getTime() <= Date.now()) {
            const error = new Error('This job post has closed for new proposals.');
            error.statusCode = 400;
            throw error;
        }
        if (!jobResult.rows[0]) {
            const error = new Error('Job not found or is not accepting proposals');
            error.statusCode = 404;
            throw error;
        }
        if (jobResult.rows[0].is_affiliated_listing) {
            const error = new Error('You cannot submit a proposal to a job posted by your account or an active Team.');
            error.statusCode = 409;
            throw error;
        }
        const duplicate = await client.query(
            `SELECT 1 FROM proposals
             WHERE job_id = $1 AND freelancer_account_id = $2 AND deleted_at IS NULL
             LIMIT 1`,
            [proposalData.job_id, proposalData.freelancer_account_id]
        );
        if (duplicate.rows.length) {
            const error = new Error('This account has already submitted a proposal for the job');
            error.statusCode = 409;
            throw error;
        }

        // 0. Make a unique copy of the Terms of Service for this proposal
        let originalTitle = proposalData.tos_title || 'Custom Terms';
        let termsId = (typeof proposalData.terms_id === 'string' && UUID_REGEX.test(proposalData.terms_id.trim()))
            ? proposalData.terms_id.trim()
            : null;

        if (termsId) {
            const origRes = await client.query('SELECT terms_title FROM terms_of_service WHERE terms_id = $1', [termsId]);
            if (origRes.rows.length > 0) {
                originalTitle = origRes.rows[0].terms_title;
            }
        } else {
            // Fallback to default platform job terms if no valid terms ID provided
            const defRes = await client.query(
                `SELECT terms_id, terms_title, terms_description 
                 FROM terms_of_service 
                 WHERE terms_type = 'jobs' AND (account_id IS NULL OR account_id = $1)
                 ORDER BY is_default DESC, created_at ASC LIMIT 1`,
                [proposalData.freelancer_account_id]
            );
            if (defRes.rows.length > 0) {
                if (!proposalData.tos_title || proposalData.tos_title === 'Custom Terms') {
                    originalTitle = defRes.rows[0].terms_title;
                }
                if (!proposalData.tos_content) {
                    proposalData.tos_content = defRes.rows[0].terms_description;
                }
                termsId = defRes.rows[0].terms_id;
            }
        }

        if (proposalData.tos_content) {
            const tosRes = await client.query(
                `INSERT INTO terms_of_service (account_id, terms_title, terms_description, terms_type)
                 VALUES ($1, $2, $3, $4) RETURNING terms_id`,
                [proposalData.freelancer_account_id, `${originalTitle} (Proposal Copy)`, proposalData.tos_content, 'jobs']
            );
            termsId = tosRes.rows[0].terms_id;
        }

        let targetJobMilestoneId = (typeof proposalData.job_milestone_id === 'string' && UUID_REGEX.test(proposalData.job_milestone_id.trim())) 
            ? proposalData.job_milestone_id.trim() 
            : null;
        if (targetJobMilestoneId) {
            const milestoneCheck = await client.query(
                `SELECT jm.slots_count,
                        (SELECT COUNT(*) FROM proposals p WHERE p.job_milestone_id = jm.job_milestone_id AND p.status = 'Hired' AND p.deleted_at IS NULL) as hired_count
                 FROM job_milestones jm
                 WHERE jm.job_milestone_id = $1 AND jm.job_id = $2`,
                [targetJobMilestoneId, proposalData.job_id]
            );
            if (!milestoneCheck.rows[0]) {
                const error = new Error('The selected milestone role does not exist on this job.');
                error.statusCode = 400;
                throw error;
            }
            if (Number(milestoneCheck.rows[0].hired_count) >= Number(milestoneCheck.rows[0].slots_count)) {
                const error = new Error('All openings for this milestone role have already been filled.');
                error.statusCode = 409;
                throw error;
            }
        }

        // Normalize included team members (always include both the Team Leader/Owner AND the person proposing)
        const ownerRes = await client.query(
            `SELECT u.account_id
             FROM teams t
             JOIN team_members tm ON tm.team_id = t.team_id AND tm.status = 'Active' AND tm.role = 'Owner'
             JOIN users u ON u.user_id = tm.user_id
             WHERE t.account_id = $1 AND t.deleted_at IS NULL`,
            [proposalData.freelancer_account_id]
        );
        const teamOwnerIds = ownerRes.rows.map((r) => String(r.account_id));

        const rawIncludedIds = Array.isArray(proposalData.included_member_account_ids)
            ? proposalData.included_member_account_ids
            : [];
        const validIncludedIds = Array.from(
            new Set(
                [
                    ...teamOwnerIds,
                    ...(proposalData.proposed_by_account_id ? [String(proposalData.proposed_by_account_id)] : []),
                    ...rawIncludedIds.map((id) => String(id || '').trim()),
                ].filter((id) => UUID_REGEX.test(id))
            )
        );

        // 1. Insert Proposal
        const query = `
            INSERT INTO proposals (
                job_id, freelancer_account_id, letter, rate_credits, 
                revision_price_credits, terms_id, status, job_milestone_id, screening_answers,
                proposed_by_account_id, included_member_account_ids, submission_fee_credits
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
            ) RETURNING proposal_id;
        `;
        const values = [
            proposalData.job_id, proposalData.freelancer_account_id, proposalData.letter,
            proposalData.rate_credits, proposalData.revision_price_credits, 
            termsId, 'Pending', targetJobMilestoneId,
            JSON.stringify(Array.isArray(proposalData.screening_answers) ? proposalData.screening_answers : []),
            proposalData.proposed_by_account_id || proposalData.payer_account_id || null,
            JSON.stringify(validIncludedIds),
            fee
        ];
        const res = await client.query(query, values);
        const proposalId = res.rows[0].proposal_id;

        // 2. Insert Milestones
        if (proposalData.milestones && proposalData.milestones.length > 0) {
            for (let i = 0; i < proposalData.milestones.length; i++) {
                const m = proposalData.milestones[i];
                if (!m) continue;
                const mName = String(m.title || m.name || `Milestone ${i + 1}`).trim().slice(0, 50);
                const mDesc = String(m.description || '').trim();
                const mDuration = Math.max(1, parseInt(m.est_hrs || m.duration_hrs || m.hours) || 24);
                const mMaxRev = Math.max(0, parseInt(m.max_rev || m.no_of_revisions_max || m.revisions) || 0);

                const mTasks = Array.isArray(m.tasks) ? m.tasks : (typeof m.tasks === 'string' ? JSON.parse(m.tasks || '[]') : []);

                await client.query(
                    `INSERT INTO proposal_milestones (proposal_id, index, name, description, duration_hrs, no_of_revisions_max, tasks)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [proposalId, i, mName, mDesc, mDuration, mMaxRev, JSON.stringify(mTasks)]
                );
            }
        }

        // 3. Insert Proposal Attachments (Work samples, briefs, PDFs)
        if (Array.isArray(proposalData.attachment_file_ids) && proposalData.attachment_file_ids.length > 0) {
            for (const fileId of proposalData.attachment_file_ids) {
                if (fileId) {
                    await client.query(
                        `INSERT INTO proposal_attachments (proposal_id, file_id) VALUES ($1, $2)`,
                        [proposalId, fileId]
                    );
                }
            }
        }

        await client.query('COMMIT');
        return proposalId;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in createProposalRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getProposalsByJobIdRepositories(jobId, accountIds) {
    try {
        const query = `
            SELECT 
                p.*,
                a.display_name as freelancer_name,
                a.handle as freelancer_handle,
                a.type as freelancer_type,
                (SELECT f.path FROM files f WHERE f.file_id = a.avatar_file_id LIMIT 1) as freelancer_avatar_path,
                COALESCE(j.team_id, (SELECT ct.team_id FROM teams ct WHERE ct.account_id = j.client_account_id AND ct.deleted_at IS NULL LIMIT 1)) as client_team_id,
                (SELECT ct.visibility FROM teams ct WHERE (ct.team_id = j.team_id OR ct.account_id = j.client_account_id) AND ct.deleted_at IS NULL LIMIT 1) as client_team_visibility,
                (SELECT ft.team_id FROM teams ft WHERE ft.account_id = p.freelancer_account_id AND ft.deleted_at IS NULL LIMIT 1) as freelancer_team_id,
                (SELECT ft.visibility FROM teams ft WHERE ft.account_id = p.freelancer_account_id AND ft.deleted_at IS NULL LIMIT 1) as freelancer_team_visibility,
                (
                    SELECT COUNT(*)::int
                    FROM teams ft_c
                    JOIN team_members tm_c ON tm_c.team_id = ft_c.team_id AND tm_c.status = 'Active'
                    WHERE ft_c.account_id = p.freelancer_account_id AND ft_c.deleted_at IS NULL
                ) as total_team_member_count,
                (SELECT pa_acc.display_name FROM accounts pa_acc WHERE pa_acc.account_id = p.proposed_by_account_id LIMIT 1) as proposed_by_name,
                (SELECT pa_acc.handle FROM accounts pa_acc WHERE pa_acc.account_id = p.proposed_by_account_id LIMIT 1) as proposed_by_handle,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'account_id', u_tm.account_id,
                                'display_name', a_tm.display_name,
                                'handle', a_tm.handle,
                                'role', tm.role,
                                'avatar_path', f_tm.path,
                                'is_leader', (tm.role = 'Owner'),
                                'is_proposer', (p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id)
                            )
                            ORDER BY (
                                CASE
                                    WHEN tm.role = 'Owner' THEN 0
                                    WHEN p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id THEN 1
                                    ELSE 2
                                END
                            ), tm.joined_at ASC
                        ),
                        '[]'::json
                    )
                    FROM teams ft_m
                    JOIN team_members tm ON tm.team_id = ft_m.team_id AND tm.status = 'Active'
                    JOIN users u_tm ON u_tm.user_id = tm.user_id
                    JOIN accounts a_tm ON a_tm.account_id = u_tm.account_id
                    LEFT JOIN files f_tm ON f_tm.file_id = a_tm.avatar_file_id
                    WHERE ft_m.account_id = p.freelancer_account_id
                      AND ft_m.deleted_at IS NULL
                      AND (
                          tm.role = 'Owner'
                          OR (p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id)
                          OR jsonb_array_length(COALESCE(p.included_member_account_ids, '[]'::jsonb)) = 0
                          OR COALESCE(p.included_member_account_ids, '[]'::jsonb) ? (u_tm.account_id::text)
                      )
                ) as included_team_members,
                t.terms_title, t.terms_type,
                j.title as job_title,
                j.category as job_category,
                j.rate_credits_min as job_min_budget,
                j.rate_credits_max as job_max_budget,
                j.payment_type as job_budget_type,
                j.experience_level as job_experience_level,
                CASE
                    WHEN j.timeline_min IS NOT NULL AND j.timeline_max IS NOT NULL THEN CONCAT(j.timeline_min, ' - ', j.timeline_max, ' days')
                    WHEN j.timeline_min IS NOT NULL THEN CONCAT(j.timeline_min, ' days')
                    ELSE 'Flexible'
                END as job_timeline,
                COALESCE((SELECT ARRAY_AGG(t.name) FROM job_tags jt JOIN tags t ON jt.tag_id = t.tag_id WHERE jt.job_id = j.job_id), ARRAY[]::varchar[]) as job_skills,
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max, 'tasks', COALESCE(m.tasks, '[]'::jsonb))) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id) as milestones,
                jm.title as target_milestone_title,
                jm.budget_credits as target_milestone_budget,
                jm.slots_count as target_milestone_slots,
                jm.duration_hours as target_milestone_duration_hours,
                jm.order_index as target_milestone_order,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'file_id', pa.file_id,
                                'name', f.name,
                                'path', f.path,
                                'mime_type', f.mime_type,
                                'size_bytes', f.size_bytes
                            )
                        ),
                        '[]'::json
                    )
                    FROM proposal_attachments pa
                    JOIN files f ON pa.file_id = f.file_id
                    WHERE pa.proposal_id = p.proposal_id
                ) as attachments,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 5.0)::float
                    FROM ratings r
                    WHERE r.account_id = p.freelancer_account_id AND r.deleted_at IS NULL
                ) as freelancer_rating
            FROM proposals p
            LEFT JOIN accounts a ON p.freelancer_account_id = a.account_id
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
            LEFT JOIN job_milestones jm ON p.job_milestone_id = jm.job_milestone_id
            WHERE p.job_id = $1 AND j.client_account_id = ANY($2::uuid[]) AND p.deleted_at IS NULL AND p.status != 'Archived'
            ORDER BY p.created_at DESC
        `;
        const res = await pool.query(query, [jobId, accountIds]);
        return res.rows;
    } catch (err) {
        console.error('Error in getProposalsByJobIdRepositories:', err);
        throw err;
    }
}

async function getProposalsByFreelancerRepositories(accountIds) {
    try {
        const query = `
            SELECT 
                p.*,
                j.title as job_title,
                j.category as job_category,
                j.rate_credits_min as job_min_budget,
                j.rate_credits_max as job_max_budget,
                j.payment_type as job_budget_type,
                j.experience_level as job_experience_level,
                CASE
                    WHEN j.timeline_min IS NOT NULL AND j.timeline_max IS NOT NULL THEN CONCAT(j.timeline_min, ' - ', j.timeline_max, ' days')
                    WHEN j.timeline_min IS NOT NULL THEN CONCAT(j.timeline_min, ' days')
                    ELSE 'Flexible'
                END as job_timeline,
                COALESCE((SELECT ARRAY_AGG(t.name) FROM job_tags jt JOIN tags t ON jt.tag_id = t.tag_id WHERE jt.job_id = j.job_id), ARRAY[]::varchar[]) as job_skills,
                a.display_name as freelancer_name,
                a.handle as freelancer_handle,
                a.type as freelancer_type,
                (SELECT f.path FROM files f WHERE f.file_id = a.avatar_file_id LIMIT 1) as freelancer_avatar_path,
                COALESCE(j.team_id, (SELECT ct.team_id FROM teams ct WHERE ct.account_id = j.client_account_id AND ct.deleted_at IS NULL LIMIT 1)) as client_team_id,
                (SELECT ct.visibility FROM teams ct WHERE (ct.team_id = j.team_id OR ct.account_id = j.client_account_id) AND ct.deleted_at IS NULL LIMIT 1) as client_team_visibility,
                (SELECT ft.team_id FROM teams ft WHERE ft.account_id = p.freelancer_account_id AND ft.deleted_at IS NULL LIMIT 1) as freelancer_team_id,
                (SELECT ft.visibility FROM teams ft WHERE ft.account_id = p.freelancer_account_id AND ft.deleted_at IS NULL LIMIT 1) as freelancer_team_visibility,
                (
                    SELECT COUNT(*)::int
                    FROM teams ft_c
                    JOIN team_members tm_c ON tm_c.team_id = ft_c.team_id AND tm_c.status = 'Active'
                    WHERE ft_c.account_id = p.freelancer_account_id AND ft_c.deleted_at IS NULL
                ) as total_team_member_count,
                (SELECT pa_acc.display_name FROM accounts pa_acc WHERE pa_acc.account_id = p.proposed_by_account_id LIMIT 1) as proposed_by_name,
                (SELECT pa_acc.handle FROM accounts pa_acc WHERE pa_acc.account_id = p.proposed_by_account_id LIMIT 1) as proposed_by_handle,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'account_id', u_tm.account_id,
                                'display_name', a_tm.display_name,
                                'handle', a_tm.handle,
                                'role', tm.role,
                                'avatar_path', f_tm.path,
                                'is_leader', (tm.role = 'Owner'),
                                'is_proposer', (p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id)
                            )
                            ORDER BY (
                                CASE
                                    WHEN tm.role = 'Owner' THEN 0
                                    WHEN p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id THEN 1
                                    ELSE 2
                                END
                            ), tm.joined_at ASC
                        ),
                        '[]'::json
                    )
                    FROM teams ft_m
                    JOIN team_members tm ON tm.team_id = ft_m.team_id AND tm.status = 'Active'
                    JOIN users u_tm ON u_tm.user_id = tm.user_id
                    JOIN accounts a_tm ON a_tm.account_id = u_tm.account_id
                    LEFT JOIN files f_tm ON f_tm.file_id = a_tm.avatar_file_id
                    WHERE ft_m.account_id = p.freelancer_account_id
                      AND ft_m.deleted_at IS NULL
                      AND (
                          tm.role = 'Owner'
                          OR (p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id)
                          OR jsonb_array_length(COALESCE(p.included_member_account_ids, '[]'::jsonb)) = 0
                          OR COALESCE(p.included_member_account_ids, '[]'::jsonb) ? (u_tm.account_id::text)
                      )
                ) as included_team_members,
                c.display_name as client_name,
                c.handle as client_handle,
                (SELECT f.path FROM files f WHERE f.file_id = c.avatar_file_id LIMIT 1) as client_avatar_path,
                t.terms_title, t.terms_type,
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max, 'tasks', COALESCE(m.tasks, '[]'::jsonb))) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id) as milestones,
                jm.title as target_milestone_title,
                jm.budget_credits as target_milestone_budget,
                jm.slots_count as target_milestone_slots,
                jm.duration_hours as target_milestone_duration_hours,
                jm.order_index as target_milestone_order,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'file_id', pa.file_id,
                                'name', f.name,
                                'path', f.path,
                                'mime_type', f.mime_type,
                                'size_bytes', f.size_bytes
                            )
                        ),
                        '[]'::json
                    )
                    FROM proposal_attachments pa
                    JOIN files f ON pa.file_id = f.file_id
                    WHERE pa.proposal_id = p.proposal_id
                ) as attachments,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 5.0)::float
                    FROM ratings r
                    WHERE r.account_id = p.freelancer_account_id AND r.deleted_at IS NULL
                ) as freelancer_rating
            FROM proposals p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN accounts c ON j.client_account_id = c.account_id
            LEFT JOIN accounts a ON p.freelancer_account_id = a.account_id
            LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
            LEFT JOIN job_milestones jm ON p.job_milestone_id = jm.job_milestone_id
            WHERE (
                p.freelancer_account_id = ANY($1::uuid[])
                OR p.proposed_by_account_id = ANY($1::uuid[])
                OR EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(COALESCE(p.included_member_account_ids, '[]'::jsonb)) AS inc_id(val)
                    WHERE inc_id.val = ANY(SELECT unnest($1::uuid[])::text)
                )
            )
              AND p.deleted_at IS NULL
              AND p.status != 'Archived'
            ORDER BY p.created_at DESC
        `;
        const res = await pool.query(query, [accountIds]);
        return res.rows;
    } catch (err) {
        console.error('Error in getProposalsByFreelancerRepositories:', err);
        throw err;
    }
}

async function getProposalByIdRepositories(proposalId, accountIds) {
    try {
        const query = `
            SELECT 
                p.*,
                j.title as job_title,
                j.description as job_description,
                j.hiring_type as job_hiring_type,
                j.category as job_category,
                j.rate_credits_min as job_min_budget,
                j.rate_credits_max as job_max_budget,
                j.payment_type as job_budget_type,
                j.experience_level as job_experience_level,
                CASE
                    WHEN j.timeline_min IS NOT NULL AND j.timeline_max IS NOT NULL THEN CONCAT(j.timeline_min, ' - ', j.timeline_max, ' days')
                    WHEN j.timeline_min IS NOT NULL THEN CONCAT(j.timeline_min, ' days')
                    ELSE 'Flexible'
                END as job_timeline,
                COALESCE((SELECT ARRAY_AGG(t.name) FROM job_tags jt JOIN tags t ON jt.tag_id = t.tag_id WHERE jt.job_id = j.job_id), ARRAY[]::varchar[]) as job_skills,
                j.client_account_id as client_account_id,
                COALESCE(j.team_id, (SELECT ct.team_id FROM teams ct WHERE ct.account_id = j.client_account_id AND ct.deleted_at IS NULL LIMIT 1)) as client_team_id,
                (SELECT ct.visibility FROM teams ct WHERE (ct.team_id = j.team_id OR ct.account_id = j.client_account_id) AND ct.deleted_at IS NULL LIMIT 1) as client_team_visibility,
                (SELECT ft.team_id FROM teams ft WHERE ft.account_id = p.freelancer_account_id AND ft.deleted_at IS NULL LIMIT 1) as freelancer_team_id,
                (SELECT ft.visibility FROM teams ft WHERE ft.account_id = p.freelancer_account_id AND ft.deleted_at IS NULL LIMIT 1) as freelancer_team_visibility,
                (
                    SELECT COUNT(*)::int
                    FROM teams ft_c
                    JOIN team_members tm_c ON tm_c.team_id = ft_c.team_id AND tm_c.status = 'Active'
                    WHERE ft_c.account_id = p.freelancer_account_id AND ft_c.deleted_at IS NULL
                ) as total_team_member_count,
                (SELECT pa_acc.display_name FROM accounts pa_acc WHERE pa_acc.account_id = p.proposed_by_account_id LIMIT 1) as proposed_by_name,
                (SELECT pa_acc.handle FROM accounts pa_acc WHERE pa_acc.account_id = p.proposed_by_account_id LIMIT 1) as proposed_by_handle,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'account_id', u_tm.account_id,
                                'display_name', a_tm.display_name,
                                'handle', a_tm.handle,
                                'role', tm.role,
                                'avatar_path', f_tm.path,
                                'is_leader', (tm.role = 'Owner'),
                                'is_proposer', (p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id)
                            )
                            ORDER BY (
                                CASE
                                    WHEN tm.role = 'Owner' THEN 0
                                    WHEN p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id THEN 1
                                    ELSE 2
                                END
                            ), tm.joined_at ASC
                        ),
                        '[]'::json
                    )
                    FROM teams ft_m
                    JOIN team_members tm ON tm.team_id = ft_m.team_id AND tm.status = 'Active'
                    JOIN users u_tm ON u_tm.user_id = tm.user_id
                    JOIN accounts a_tm ON a_tm.account_id = u_tm.account_id
                    LEFT JOIN files f_tm ON f_tm.file_id = a_tm.avatar_file_id
                    WHERE ft_m.account_id = p.freelancer_account_id
                      AND ft_m.deleted_at IS NULL
                      AND (
                          tm.role = 'Owner'
                          OR (p.proposed_by_account_id IS NOT NULL AND u_tm.account_id = p.proposed_by_account_id)
                          OR jsonb_array_length(COALESCE(p.included_member_account_ids, '[]'::jsonb)) = 0
                          OR COALESCE(p.included_member_account_ids, '[]'::jsonb) ? (u_tm.account_id::text)
                      )
                ) as included_team_members,
                j.created_at as job_created_at,
                j.status as job_status,
                j.deleted_at as job_deleted_at,
                (SELECT f.path FROM job_attachments ja JOIN files f ON ja.file_id = f.file_id WHERE ja.job_id = j.job_id AND ja.index = 0 LIMIT 1) as job_thumbnail_path,
                c.display_name as client_name,
                c.handle as client_handle,
                (SELECT f.path FROM files f WHERE f.file_id = c.avatar_file_id LIMIT 1) as client_avatar_path,
                f_acc.display_name as freelancer_name,
                f_acc.handle as freelancer_handle,
                f_acc.type as freelancer_type,
                f_acc.description as freelancer_bio,
                f_acc.banner_preset as freelancer_banner_preset,
                (SELECT f.path FROM files f WHERE f.file_id = f_acc.avatar_file_id LIMIT 1) as freelancer_avatar_path,
                t.terms_title, t.terms_type, t.terms_description as terms_content,
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max, 'tasks', COALESCE(m.tasks, '[]'::jsonb))) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id) as milestones,
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
                jm.budget_credits as target_milestone_budget,
                jm.slots_count as target_milestone_slots,
                jm.duration_hours as target_milestone_duration_hours,
                jm.order_index as target_milestone_order,
                (
                    SELECT COALESCE(
                        json_agg(
                            json_build_object(
                                'file_id', pa.file_id,
                                'name', f.name,
                                'path', f.path,
                                'mime_type', f.mime_type,
                                'size_bytes', f.size_bytes
                            )
                        ),
                        '[]'::json
                    )
                    FROM proposal_attachments pa
                    JOIN files f ON pa.file_id = f.file_id
                    WHERE pa.proposal_id = p.proposal_id
                ) as attachments,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 5.0)::float
                    FROM ratings r
                    WHERE r.account_id = p.freelancer_account_id AND r.deleted_at IS NULL
                ) as freelancer_rating,
                (SELECT jc.contract_id FROM job_contracts jc JOIN contracts ct ON jc.contract_id = ct.contract_id WHERE jc.proposal_id = p.proposal_id ORDER BY ct.created_at DESC LIMIT 1) as contract_id,
                (
                    SELECT u_lead.account_id
                    FROM teams ft_lead
                    JOIN team_members tm_lead ON tm_lead.team_id = ft_lead.team_id AND tm_lead.status = 'Active' AND tm_lead.role = 'Owner'
                    JOIN users u_lead ON u_lead.user_id = tm_lead.user_id
                    WHERE ft_lead.account_id = p.freelancer_account_id AND ft_lead.deleted_at IS NULL
                    LIMIT 1
                ) as team_leader_account_id,
                (
                    SELECT a_lead.display_name
                    FROM teams ft_lead
                    JOIN team_members tm_lead ON tm_lead.team_id = ft_lead.team_id AND tm_lead.status = 'Active' AND tm_lead.role = 'Owner'
                    JOIN users u_lead ON u_lead.user_id = tm_lead.user_id
                    JOIN accounts a_lead ON a_lead.account_id = u_lead.account_id
                    WHERE ft_lead.account_id = p.freelancer_account_id AND ft_lead.deleted_at IS NULL
                    LIMIT 1
                ) as team_leader_name,
                (SELECT COUNT(*) FROM proposals p2 WHERE p2.job_id = p.job_id AND p2.deleted_at IS NULL AND p2.status != 'Archived') as total_applicants,
                (SELECT COALESCE(AVG(p2.rate_credits), 0) FROM proposals p2 WHERE p2.job_id = p.job_id AND p2.deleted_at IS NULL AND p2.status != 'Archived') as avg_bid,
                COALESCE(j.screening_questions, '[]'::jsonb) as job_screening_questions
            FROM proposals p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN accounts c ON j.client_account_id = c.account_id
            LEFT JOIN accounts f_acc ON p.freelancer_account_id = f_acc.account_id
            LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
            LEFT JOIN job_milestones jm ON p.job_milestone_id = jm.job_milestone_id
            WHERE p.proposal_id = $1
              AND p.deleted_at IS NULL
              AND (
                  p.freelancer_account_id = ANY($2::uuid[])
                  OR j.client_account_id = ANY($2::uuid[])
                  OR p.proposed_by_account_id = ANY($2::uuid[])
                  OR EXISTS (
                      SELECT 1
                      FROM jsonb_array_elements_text(COALESCE(p.included_member_account_ids, '[]'::jsonb)) AS inc_id(val)
                      WHERE inc_id.val = ANY(SELECT unnest($2::uuid[])::text)
                  )
              )
        `;
        const res = await pool.query(query, [proposalId, accountIds]);
        if (res.rows[0] && res.rows[0].client_account_id && accountIds.includes(res.rows[0].client_account_id)) {
            if (!res.rows[0].viewed_at) {
                await pool.query(`UPDATE proposals SET viewed_at = NOW() WHERE proposal_id = $1 AND viewed_at IS NULL`, [proposalId]);
                res.rows[0].viewed_at = new Date();
            }
        }
        return res.rows[0];
    } catch (err) {
        console.error('Error in getProposalByIdRepositories:', err);
        throw err;
    }
}

async function withdrawProposalRepositories(proposalId, accountIds) {
    try {
        const query = `
            UPDATE proposals
            SET deleted_at = NOW(), status = 'Withdrawn'
            WHERE proposal_id = $1 AND freelancer_account_id = ANY($2::uuid[]) AND deleted_at IS NULL
            RETURNING *;
        `;
        const res = await pool.query(query, [proposalId, accountIds]);
        return res.rows[0];
    } catch (err) {
        console.error('Error in withdrawProposalRepositories:', err);
        throw err;
    }
}

async function updateProposalStatusRepositories(proposalId, accountIds, status, rejectReason) {
    try {
        // This is mainly for Client updating status (Accept/Reject/Shortlist)
        const query = `
            UPDATE proposals p
            SET status = $1::varchar, 
                reject_reason = $2, 
                shortlisted_at = CASE 
                    WHEN $1::varchar = 'Shortlisted' THEN COALESCE(p.shortlisted_at, NOW()) 
                    WHEN $1::varchar = 'Pending' THEN NULL 
                    ELSE p.shortlisted_at 
                END,
                updated_at = NOW()
            FROM jobs j
            WHERE p.proposal_id = $3 AND p.job_id = j.job_id AND j.client_account_id = ANY($4::uuid[])
            RETURNING p.*, j.title as job_title, j.client_account_id;
        `;
        const res = await pool.query(query, [status, rejectReason || null, proposalId, accountIds]);
        return res.rows[0];
    } catch (err) {
        console.error('Error in updateProposalStatusRepositories:', err);
        throw err;
    }
}

async function getTermsOfServiceRepositories(type) {
    try {
        const query = `SELECT * FROM terms_of_service WHERE terms_type = $1 ORDER BY created_at ASC`;
        const res = await pool.query(query, [type]);
        return res.rows;
    } catch (err) {
        console.error('Error in getTermsOfServiceRepositories:', err);
        throw err;
    }
}

async function toggleJobSaveRepositories(jobId, accountId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const checkRes = await client.query('SELECT 1 FROM job_saves WHERE job_id = $1 AND account_id = $2', [jobId, accountId]);
        
        if (checkRes.rows.length > 0) {
            await client.query('DELETE FROM job_saves WHERE job_id = $1 AND account_id = $2', [jobId, accountId]);
            await client.query('COMMIT');
            return { saved: false };
        } else {
            await client.query('INSERT INTO job_saves (job_id, account_id) VALUES ($1, $2)', [jobId, accountId]);
            await client.query('COMMIT');
            return { saved: true };
        }
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in toggleJobSaveRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}


async function getActiveJobsByClientRepositories(clientAccountId) {
    const result = await pool.query(
        `SELECT job_id as id, title, payment_type, rate_credits_min, rate_credits_max, rough_deadline, status, created_at
         FROM jobs 
         WHERE client_account_id = $1  AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [clientAccountId]
    );
    return result.rows;
}

async function createJobInvitationRepositories(jobId, clientAccountId, freelancerAccountId, message) {
    const result = await pool.query(
        `INSERT INTO job_invitations (job_id, client_account_id, freelancer_account_id, message, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [jobId, clientAccountId, freelancerAccountId, message]
    );
    return result.rows[0];
}

async function checkJobInvitationExistsRepositories(jobId, freelancerAccountId) {
    const result = await pool.query(
        `SELECT * FROM job_invitations WHERE job_id = $1 AND freelancer_account_id = $2`,
        [jobId, freelancerAccountId]
    );
    return result.rows[0];
}

async function getJobByIdRepositories(jobId, accountId = null, actorIds = [], affiliatedAccountIds = actorIds) {
    const jobs = await getAllJobsRepositories({ jobId }, accountId, actorIds, affiliatedAccountIds);
    return jobs[0] || null;
}


async function extendApplicationWindowRepositories(jobId, accountIds, durationHours) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const jobRes = await client.query(`
            SELECT job_id, client_account_id, status, application_deadline, free_extension_count,
                   (SELECT COUNT(*) FROM proposals p WHERE p.job_id = $1 AND p.deleted_at IS NULL) as applicant_count
            FROM jobs
            WHERE job_id = $1 AND client_account_id = ANY($2::uuid[]) AND deleted_at IS NULL
            FOR UPDATE
        `, [jobId, accountIds]);

        if (jobRes.rows.length === 0) {
            throw new Error('Job not found or unauthorized.');
        }

        const job = jobRes.rows[0];
        if (job.status !== 'Open') {
            throw new Error(`Cannot extend a job with status "${job.status}". Only open jobs can be extended.`);
        }

        const hoursToAdd = Math.max(12, parseInt(durationHours, 10) || 72);
        
        const currentDeadline = job.application_deadline ? new Date(job.application_deadline) : new Date();
        const baseTime = currentDeadline.getTime() > Date.now() ? currentDeadline.getTime() : Date.now();
        const newDeadline = new Date(baseTime + hoursToAdd * 60 * 60 * 1000);

        const updateRes = await client.query(`
            UPDATE jobs
            SET application_deadline = $1,
                application_extended_at = NOW(),
                free_extension_count = free_extension_count + 1,
                updated_at = NOW()
            WHERE job_id = $2
            RETURNING *;
        `, [newDeadline, jobId]);

        await client.query('COMMIT');
        return updateRes.rows[0];
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in extendApplicationWindowRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function expireJobImmediatelyRepositories(jobId, accountIds) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const jobRes = await client.query(`
            SELECT j.*,
                   (SELECT COUNT(*) FROM proposals p WHERE p.job_id = j.job_id AND p.deleted_at IS NULL) as applicant_count
            FROM jobs j
            WHERE j.job_id = $1 AND j.client_account_id = ANY($2::uuid[]) AND j.deleted_at IS NULL
            FOR UPDATE
        `, [jobId, accountIds]);

        if (jobRes.rows.length === 0) {
            throw new Error('Job not found or unauthorized.');
        }

        const job = jobRes.rows[0];
        if (job.status !== 'Open') {
            throw new Error(`Cannot expire a job with status "${job.status}". Only open jobs can be expired.`);
        }

        let refundedAmount = 0;
        if (parseInt(job.applicant_count, 10) === 0) {
            const platformWalletRes = await client.query(`
                SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1 FOR UPDATE
            `);
            const platformWalletId = platformWalletRes.rows[0]?.wallet_id;

            const clientWalletRes = await client.query(`
                SELECT w.wallet_id 
                FROM wallets w
                JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
                WHERE aw.account_id = $1 AND w.type = 'account wallets'
                FOR UPDATE
            `, [job.client_account_id]);

            if (clientWalletRes.rows.length > 0 && platformWalletId) {
                const clientWalletId = clientWalletRes.rows[0].wallet_id;
                refundedAmount = job.posting_fee_credits || 50;

                await client.query(`
                    UPDATE wallets SET balance_credits = balance_credits + $1, updated_at = NOW() WHERE wallet_id = $2
                `, [refundAmount, clientWalletId]);

                await client.query(`
                    UPDATE wallets SET balance_credits = GREATEST(0, balance_credits - $1), updated_at = NOW() WHERE wallet_id = $2
                `, [refundAmount, platformWalletId]);

                await client.query(`
                    INSERT INTO credit_transactions (
                        type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
                    ) VALUES (
                        'Job Posting Fee Refund', $1, 'Completed', $2, $3, 'jobs', $4
                    )
                `, [refundAmount, platformWalletId, clientWalletId, jobId]);
            }
        }

        const updateRes = await client.query(`
            UPDATE jobs
            SET status = 'Expired',
                updated_at = NOW()
            WHERE job_id = $1
            RETURNING *;
        `, [jobId]);

        await client.query('COMMIT');
        return { job: updateRes.rows[0], refundedAmount };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in expireJobImmediatelyRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function autoExpireJobsRepositories() {
    const client = await pool.connect();
    const expiredJobs = [];
    try {
        await client.query('BEGIN');

        const candidates = await client.query(`
            SELECT j.job_id, j.client_account_id, j.title, j.posting_fee_credits
            FROM jobs j
            WHERE j.status = 'Open'
              AND j.application_deadline IS NOT NULL
              AND j.application_deadline <= NOW()
              AND j.deleted_at IS NULL
            FOR UPDATE SKIP LOCKED
        `);

        if (candidates.rows.length === 0) {
            await client.query('COMMIT');
            return { count: 0, expiredJobs: [] };
        }

        const platformWalletRes = await client.query(`
            SELECT wallet_id FROM wallets WHERE type = 'platform wallets' LIMIT 1 FOR UPDATE
        `);
        const platformWalletId = platformWalletRes.rows[0]?.wallet_id;

        for (const job of candidates.rows) {
            const jobId = job.job_id;

            const proposalsRes = await client.query(`
                SELECT p.proposal_id, p.freelancer_account_id, p.submission_fee_credits, p.status
                FROM proposals p
                WHERE p.job_id = $1 AND p.deleted_at IS NULL AND p.status IN ('Pending', 'Shortlisted')
                FOR UPDATE
            `, [jobId]);

            if (proposalsRes.rows.length === 0) {
                if (platformWalletId) {
                    const clientWalletRes = await client.query(`
                        SELECT w.wallet_id 
                        FROM wallets w
                        JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
                        WHERE aw.account_id = $1 AND w.type = 'account wallets'
                        FOR UPDATE
                    `, [job.client_account_id]);

                    if (clientWalletRes.rows.length > 0) {
                        const clientWalletId = clientWalletRes.rows[0].wallet_id;
                        const refundAmount = job.posting_fee_credits || 50;

                        await client.query(`
                            UPDATE wallets SET balance_credits = balance_credits + $1, updated_at = NOW() WHERE wallet_id = $2
                        `, [refundAmount, clientWalletId]);

                        await client.query(`
                            UPDATE wallets SET balance_credits = GREATEST(0, balance_credits - $1), updated_at = NOW() WHERE wallet_id = $2
                        `, [refundAmount, platformWalletId]);

                        await client.query(`
                            INSERT INTO credit_transactions (
                                type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
                            ) VALUES (
                                'Job Posting Fee Refund', $1, 'Completed', $2, $3, 'jobs', $4
                            )
                        `, [refundAmount, platformWalletId, clientWalletId, jobId]);
                    }
                }

                await client.query(`
                    INSERT INTO notifications (recipient_account_id, actor_account_id, type, title, message, reference_table, reference_id)
                    VALUES ($1, $1, 'system', 'Job Posting Expired', $2, 'jobs', $3)
                `, [job.client_account_id, `Your job "${job.title}" has expired with no applicants. Your 50-credit posting fee has been fully refunded to your wallet.`, jobId]);

            } else {
                for (const prop of proposalsRes.rows) {
                    const refundAmount = prop.submission_fee_credits || 10;
                    if (platformWalletId) {
                        const userWalletRes = await client.query(`
                            SELECT w.wallet_id 
                            FROM wallets w
                            JOIN account_wallets aw ON w.wallet_id = aw.wallet_id
                            WHERE aw.account_id = $1 AND w.type = 'account wallets'
                            FOR UPDATE
                        `, [prop.freelancer_account_id]);

                        if (userWalletRes.rows.length > 0) {
                            const userWalletId = userWalletRes.rows[0].wallet_id;

                            await client.query(`
                                UPDATE wallets SET balance_credits = balance_credits + $1, updated_at = NOW() WHERE wallet_id = $2
                            `, [refundAmount, userWalletId]);

                            await client.query(`
                                UPDATE wallets SET balance_credits = GREATEST(0, balance_credits - $1), updated_at = NOW() WHERE wallet_id = $2
                            `, [refundAmount, platformWalletId]);

                            await client.query(`
                                INSERT INTO credit_transactions (
                                    type, amount_credits, status, source_wallet_id, destination_wallet_id, reference_table, reference_id
                                ) VALUES (
                                    'Proposal Fee Refund', $1, 'Completed', $2, $3, 'jobs', $4
                                )
                            `, [refundAmount, platformWalletId, userWalletId, jobId]);
                        }
                    }

                    await client.query(`
                        UPDATE proposals SET status = 'Closed', updated_at = NOW() WHERE proposal_id = $1
                    `, [prop.proposal_id]);

                    await client.query(`
                        INSERT INTO notifications (recipient_account_id, actor_account_id, type, title, message, reference_table, reference_id)
                        VALUES ($1, $1, 'system', 'Proposal Fee Refunded', $2, 'jobs', $3)
                    `, [prop.freelancer_account_id, `The application window for "${job.title}" has closed without a hire. Your proposal submission fee of ${refundAmount} credits has been refunded.`, jobId]);
                }
            }

            await client.query(`
                UPDATE jobs SET status = 'Expired', updated_at = NOW() WHERE job_id = $1
            `, [jobId]);

            expiredJobs.push(jobId);
        }

        await client.query('COMMIT');
        return { count: expiredJobs.length, expiredJobs };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in autoExpireJobsRepositories:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    getActiveJobsByClientRepositories,
    createJobInvitationRepositories,
    checkJobInvitationExistsRepositories,
    createJobRepositories,
    getAllJobsRepositories,
    getJobByIdRepositories,
    updateJobRepositories,
    createProposalRepositories,
    getProposalsByJobIdRepositories,
    getProposalsByFreelancerRepositories,
    getProposalByIdRepositories,
    withdrawProposalRepositories,
    updateProposalStatusRepositories,
    extendApplicationWindowRepositories,
    expireJobImmediatelyRepositories,
    autoExpireJobsRepositories,
    getTermsOfServiceRepositories,
    toggleJobSaveRepositories,
    deleteJobRepositories
};
