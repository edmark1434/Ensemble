// backend/repositories/JobRepositories.js
const { pool } = require('../lib/Database');

async function createJobRepositories(jobData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Insert Job
        const jobQuery = `
            INSERT INTO jobs (
                client_account_id, title, description, category, payment_type, 
                experience_level, no_of_hires, rate_credits_min, rate_credits_max,
                timeline_min, timeline_max, posted_as, team_id, status,
                rough_deadline, rough_no_of_revisions
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                NOW() + interval '1 day' * COALESCE($11::int, 30), 0
            ) RETURNING job_id;
        `;
        const jobValues = [
            jobData.client_account_id, jobData.title, jobData.description, 
            jobData.category, jobData.payment_type, jobData.experience_level, 
            jobData.no_of_hires || 1, jobData.rate_credits_min, jobData.rate_credits_max,
            jobData.timeline_min, jobData.timeline_max, jobData.posted_as, 
            jobData.team_id || null, jobData.status || 'Open'
        ];
        
        const res = await client.query(jobQuery, jobValues);
        const jobId = res.rows[0].job_id;

        // 2. Insert Thumbnail (Attachment)
        if (jobData.file_id) {
            await client.query(
                `INSERT INTO job_attachments (job_id, file_id, index) VALUES ($1, $2, $3)`,
                [jobId, jobData.file_id, 0]
            );
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

async function getAllJobsRepositories(filters = {}, accountId = null) {
    try {
        let query = `
            SELECT 
                j.*,
                a.display_name as client_name,
                a.handle as client_handle,
                (SELECT f.path FROM files f WHERE f.file_id = a.avatar_file_id LIMIT 1) as client_avatar_path,
                (SELECT COUNT(*) FROM proposals p WHERE p.job_id = j.job_id AND p.deleted_at IS NULL) as applicant_count,
                (SELECT COUNT(*) FROM proposals p WHERE p.job_id = j.job_id AND p.status = 'Hired' AND p.deleted_at IS NULL) as hired_count,
                (SELECT COUNT(*) FROM job_saves js WHERE js.job_id = j.job_id) as saves_count,
                CASE WHEN $1::uuid IS NOT NULL THEN (SELECT EXISTS(SELECT 1 FROM job_saves js WHERE js.job_id = j.job_id AND js.account_id = $1)) ELSE FALSE END as is_saved,
                CASE WHEN $1::uuid IS NOT NULL THEN (SELECT EXISTS(SELECT 1 FROM proposals p WHERE p.job_id = j.job_id AND p.freelancer_account_id = $1 AND p.deleted_at IS NULL)) ELSE FALSE END as has_proposed,
                CASE WHEN $1::uuid IS NOT NULL THEN (SELECT p.proposal_id FROM proposals p WHERE p.job_id = j.job_id AND p.freelancer_account_id = $1 AND p.deleted_at IS NULL LIMIT 1) ELSE NULL END as my_proposal_id,
                (SELECT f.path FROM job_attachments ja JOIN files f ON ja.file_id = f.file_id WHERE ja.job_id = j.job_id AND ja.index = 0 LIMIT 1) as thumbnail_path,
                (SELECT ARRAY_AGG(t.name) FROM job_tags jt JOIN tags t ON jt.tag_id = t.tag_id WHERE jt.job_id = j.job_id) as tags
            FROM jobs j
            LEFT JOIN accounts a ON j.client_account_id = a.account_id
            WHERE j.deleted_at IS NULL
        `;
        
        const values = [accountId];
        // Apply filters if needed (e.g. status)
        if (filters.status) {
            values.push(filters.status);
            query += ` AND j.status = $${values.length}`;
        }
        
        query += ` ORDER BY j.created_at DESC`;
        
        const res = await pool.query(query, values);
        return res.rows;
    } catch (err) {
        console.error('Error in getAllJobsRepositories:', err);
        throw err;
    }
}

async function updateJobRepositories(jobId, accountId, jobData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const query = `
            UPDATE jobs
            SET title = $1, description = $2, category = $3, experience_level = $4,
                updated_at = NOW()
            WHERE job_id = $5 AND client_account_id = $6
            RETURNING *;
        `;
        const values = [
            jobData.title, jobData.description, jobData.category, jobData.experience_level,
            jobId, accountId
        ];
        const res = await client.query(query, values);
        const updatedJob = res.rows[0];

        if (!updatedJob) {
            throw new Error('Job not found or unauthorized');
        }

        // Update tags if provided
        if (jobData.tags) {
            await client.query(`DELETE FROM job_tags WHERE job_id = $1`, [jobId]);
            if (jobData.tags.length > 0) {
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
        }

        // Update thumbnail attachment if provided
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

async function deleteJobRepositories(jobId, accountId) {
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
            WHERE job_id = $1 AND client_account_id = $2 AND deleted_at IS NULL
            RETURNING *;
        `, [jobId, accountId]);

        if (jobUpdate.rows.length === 0) {
            throw new Error('Job not found or unauthorized.');
        }

        // Archive pending proposals
        await client.query(`
            UPDATE proposals
            SET status = 'Archived', updated_at = NOW()
            WHERE job_id = $1 AND status = 'Pending' AND deleted_at IS NULL
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

        // 0. Insert Terms of Service
        let termsId = proposalData.terms_id;
        if (!termsId && proposalData.tos_content) {
            const tosRes = await client.query(
                `INSERT INTO terms_of_service (terms_title, terms_description, terms_type)
                 VALUES ($1, $2, $3) RETURNING terms_id`,
                [proposalData.tos_title || 'Custom Terms', proposalData.tos_content, 'jobs']
            );
            termsId = tosRes.rows[0].terms_id;
        }

        // 1. Insert Proposal
        const query = `
            INSERT INTO proposals (
                job_id, freelancer_account_id, letter, rate_credits, 
                revision_price_credits, terms_id, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
            ) RETURNING proposal_id;
        `;
        const values = [
            proposalData.job_id, proposalData.freelancer_account_id, proposalData.letter,
            proposalData.rate_credits, proposalData.revision_price_credits, 
            termsId, 'Pending'
        ];
        const res = await client.query(query, values);
        const proposalId = res.rows[0].proposal_id;

        // 2. Insert Milestones
        if (proposalData.milestones && proposalData.milestones.length > 0) {
            for (let i = 0; i < proposalData.milestones.length; i++) {
                const m = proposalData.milestones[i];
                await client.query(
                    `INSERT INTO proposal_milestones (proposal_id, index, name, description, duration_hrs, no_of_revisions_max)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [proposalId, i, m.title, m.description, m.est_hrs, m.max_rev]
                );
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

async function getProposalsByJobIdRepositories(jobId) {
    try {
        const query = `
            SELECT 
                p.*,
                a.display_name as freelancer_name,
                a.handle as freelancer_handle,
                (SELECT f.path FROM files f WHERE f.file_id = a.avatar_file_id LIMIT 1) as freelancer_avatar_path,
                t.terms_title, t.terms_type,
                j.title as job_title,
                j.category as job_category,
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max)) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id) as milestones
            FROM proposals p
            LEFT JOIN accounts a ON p.freelancer_account_id = a.account_id
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
            WHERE p.job_id = $1 AND p.deleted_at IS NULL AND p.status != 'Archived'
            ORDER BY p.created_at DESC
        `;
        const res = await pool.query(query, [jobId]);
        return res.rows;
    } catch (err) {
        console.error('Error in getProposalsByJobIdRepositories:', err);
        throw err;
    }
}

async function getProposalsByFreelancerRepositories(accountId) {
    try {
        const query = `
            SELECT 
                p.*,
                j.title as job_title,
                j.category as job_category,
                c.display_name as client_name,
                c.handle as client_handle,
                (SELECT f.path FROM files f WHERE f.file_id = c.avatar_file_id LIMIT 1) as client_avatar_path,
                t.terms_title, t.terms_type,
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max)) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id) as milestones
            FROM proposals p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN accounts c ON j.client_account_id = c.account_id
            LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
            WHERE p.freelancer_account_id = $1 AND p.deleted_at IS NULL AND p.status != 'Archived'
            ORDER BY p.created_at DESC
        `;
        const res = await pool.query(query, [accountId]);
        return res.rows;
    } catch (err) {
        console.error('Error in getProposalsByFreelancerRepositories:', err);
        throw err;
    }
}

async function getProposalByIdRepositories(proposalId) {
    try {
        const query = `
            SELECT 
                p.*,
                j.title as job_title,
                j.category as job_category,
                j.created_at as job_created_at,
                j.status as job_status,
                j.deleted_at as job_deleted_at,
                c.display_name as client_name,
                c.handle as client_handle,
                (SELECT f.path FROM files f WHERE f.file_id = c.avatar_file_id LIMIT 1) as client_avatar_path,
                f_acc.display_name as freelancer_name,
                f_acc.handle as freelancer_handle,
                (SELECT f.path FROM files f WHERE f.file_id = f_acc.avatar_file_id LIMIT 1) as freelancer_avatar_path,
                t.terms_title, t.terms_type, t.terms_description as terms_content,
                (SELECT json_agg(json_build_object('id', m.proposal_milestone_id, 'name', m.name, 'description', m.description, 'hours', m.duration_hrs, 'revisions', m.no_of_revisions_max)) FROM proposal_milestones m WHERE m.proposal_id = p.proposal_id) as milestones,
                (SELECT jc.contract_id FROM job_contracts jc JOIN contracts ct ON jc.contract_id = ct.contract_id WHERE jc.proposal_id = p.proposal_id ORDER BY ct.created_at DESC LIMIT 1) as contract_id
            FROM proposals p
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN accounts c ON j.client_account_id = c.account_id
            LEFT JOIN accounts f_acc ON p.freelancer_account_id = f_acc.account_id
            LEFT JOIN terms_of_service t ON p.terms_id = t.terms_id
            WHERE p.proposal_id = $1 AND p.deleted_at IS NULL
        `;
        const res = await pool.query(query, [proposalId]);
        return res.rows[0];
    } catch (err) {
        console.error('Error in getProposalByIdRepositories:', err);
        throw err;
    }
}

async function withdrawProposalRepositories(proposalId, accountId) {
    try {
        const query = `
            UPDATE proposals
            SET deleted_at = NOW(), status = 'Withdrawn'
            WHERE proposal_id = $1 AND freelancer_account_id = $2 AND deleted_at IS NULL
            RETURNING *;
        `;
        const res = await pool.query(query, [proposalId, accountId]);
        return res.rows[0];
    } catch (err) {
        console.error('Error in withdrawProposalRepositories:', err);
        throw err;
    }
}

async function updateProposalStatusRepositories(proposalId, accountId, status, rejectReason) {
    try {
        // This is mainly for Client updating status (Accept/Reject/Shortlist)
        const query = `
            UPDATE proposals p
            SET status = $1, reject_reason = $2, updated_at = NOW()
            FROM jobs j
            WHERE p.proposal_id = $3 AND p.job_id = j.job_id AND j.client_account_id = $4
            RETURNING p.*;
        `;
        const res = await pool.query(query, [status, rejectReason, proposalId, accountId]);
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

module.exports = {
    createJobRepositories,
    getAllJobsRepositories,
    updateJobRepositories,
    createProposalRepositories,
    getProposalsByJobIdRepositories,
    getProposalsByFreelancerRepositories,
    getProposalByIdRepositories,
    withdrawProposalRepositories,
    updateProposalStatusRepositories,
    getTermsOfServiceRepositories,
    toggleJobSaveRepositories,
    deleteJobRepositories
};
