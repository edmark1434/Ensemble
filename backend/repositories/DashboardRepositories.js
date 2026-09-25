const pool = require('../lib/Database').pool;
const { getAffiliatedAccountIds } = require('./MarketplaceActorRepositories');

async function getContractPermissions(contractId, personalAccountId, dbClient = pool) {
    const participantsResult = await dbClient.query(
        `SELECT 
            c.contract_id,
            c.status AS contract_status,
            c.rate_credits,
            c.revision_price_credits,
            
            -- Client
            client_acc.account_id AS client_account_id,
            client_acc.display_name AS client_name,
            client_acc.type AS client_account_type,
            client_team.team_id AS client_team_id,
            CASE WHEN client_team.team_id IS NOT NULL THEN client_acc.display_name ELSE NULL END AS client_team_name,
            
            -- Freelancer
            free_acc.account_id AS freelancer_account_id,
            free_acc.display_name AS freelancer_name,
            free_acc.type AS freelancer_account_type,
            free_team.team_id AS freelancer_team_id,
            CASE WHEN free_team.team_id IS NOT NULL THEN free_acc.display_name ELSE NULL END AS freelancer_team_name,
            
            -- Client Workspace Project Lead
            client_tcw.workspace_id AS client_workspace_id,
            client_tcw.project_lead_account_id AS client_project_lead_account_id,
            
            -- Freelancer Workspace Project Lead
            free_tcw.workspace_id AS free_workspace_id,
            free_tcw.project_lead_account_id AS free_project_lead_account_id,

            COALESCE(j.title, g.title) AS listing_title

        FROM contracts c
        LEFT JOIN job_contracts jc ON jc.contract_id = c.contract_id
        LEFT JOIN proposals p ON p.proposal_id = jc.proposal_id
        LEFT JOIN jobs j ON j.job_id = p.job_id

        LEFT JOIN gig_contracts gc ON gc.contract_id = c.contract_id
        LEFT JOIN gig_requests gr ON gr.gig_request_id = gc.gig_request_id
        LEFT JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
        LEFT JOIN gigs g ON g.gig_id = gt.gig_id

        JOIN accounts client_acc ON client_acc.account_id = COALESCE(j.client_account_id, gr.client_account_id)
        JOIN accounts free_acc ON free_acc.account_id = COALESCE(p.freelancer_account_id, g.freelancer_account_id)

        LEFT JOIN teams client_team ON client_team.account_id = client_acc.account_id AND client_team.deleted_at IS NULL
        LEFT JOIN teams free_team ON free_team.account_id = free_acc.account_id AND free_team.deleted_at IS NULL

        LEFT JOIN team_contract_workspaces client_tcw ON client_tcw.team_id = client_team.team_id AND client_tcw.contract_id = c.contract_id
        LEFT JOIN team_contract_workspaces free_tcw ON free_tcw.team_id = free_team.team_id AND free_tcw.contract_id = c.contract_id

        WHERE c.contract_id = $1
        LIMIT 1`,
        [contractId]
    );

    const contractInfo = participantsResult.rows[0];
    if (!contractInfo) return null;

    const teamIds = [contractInfo.client_team_id, contractInfo.freelancer_team_id].filter(Boolean);
    let memberships = [];
    let workspaceMemberships = [];

    if (teamIds.length > 0 && personalAccountId) {
        const memberRes = await dbClient.query(
            `SELECT tm.team_id, tm.role, tm.status
             FROM team_members tm
             JOIN users u ON u.user_id = tm.user_id
             WHERE u.account_id = $1 AND tm.status = 'Active'
               AND tm.team_id = ANY($2::uuid[])`,
            [personalAccountId, teamIds]
        );
        memberships = memberRes.rows;

        const wsMemberRes = await dbClient.query(
            `SELECT tcw.team_id
             FROM team_workspace_members twm
             JOIN team_contract_workspaces tcw ON tcw.workspace_id = twm.workspace_id
             WHERE tcw.contract_id = $1 AND twm.account_id = $2`,
            [contractId, personalAccountId]
        );
        workspaceMemberships = wsMemberRes.rows;
    }

    const isDirectClient = String(contractInfo.client_account_id) === String(personalAccountId);
    const isDirectFreelancer = String(contractInfo.freelancer_account_id) === String(personalAccountId);

    const isClientTeam = Boolean(contractInfo.client_team_id);
    const clientMember = memberships.find((m) => String(m.team_id) === String(contractInfo.client_team_id));
    const clientMemberRole = clientMember?.role || null;
    const isClientOwnerOrAdmin = isClientTeam && ['Owner', 'Admin'].includes(clientMemberRole);
    const isClientProjectLead = isClientTeam && String(contractInfo.client_project_lead_account_id) === String(personalAccountId);
    const isClientWorkspaceMember = isClientTeam && workspaceMemberships.some((w) => String(w.team_id) === String(contractInfo.client_team_id));

    const isFreelancerTeam = Boolean(contractInfo.freelancer_team_id);
    const freelancerMember = memberships.find((m) => String(m.team_id) === String(contractInfo.freelancer_team_id));
    const freelancerMemberRole = freelancerMember?.role || null;
    const isFreelancerOwnerOrAdmin = isFreelancerTeam && ['Owner', 'Admin'].includes(freelancerMemberRole);
    const isFreelancerProjectLead = isFreelancerTeam && String(contractInfo.free_project_lead_account_id) === String(personalAccountId);
    const isFreelancerWorkspaceMember = isFreelancerTeam && workspaceMemberships.some((w) => String(w.team_id) === String(contractInfo.freelancer_team_id));

    const canBuyRevision = isDirectClient || isClientOwnerOrAdmin;
    const canReviewMilestone = isDirectClient || isClientOwnerOrAdmin || isClientProjectLead;
    const canSubmitMilestone = isDirectFreelancer || isFreelancerOwnerOrAdmin || isFreelancerProjectLead;
    const canViewTask =
        isDirectClient ||
        isDirectFreelancer ||
        canBuyRevision ||
        canReviewMilestone ||
        canSubmitMilestone ||
        isClientWorkspaceMember ||
        isFreelancerWorkspaceMember ||
        Boolean(clientMember) ||
        Boolean(freelancerMember);

    let effectiveRole = 'none';
    if (isDirectFreelancer || isFreelancerOwnerOrAdmin || isFreelancerProjectLead || isFreelancerWorkspaceMember || Boolean(freelancerMember)) {
        effectiveRole = 'freelancer';
    } else if (isDirectClient || isClientOwnerOrAdmin || isClientProjectLead || isClientWorkspaceMember || Boolean(clientMember)) {
        effectiveRole = 'client';
    }

    const isProjectLead =
        (effectiveRole === 'freelancer' && isFreelancerProjectLead) ||
        (effectiveRole === 'client' && isClientProjectLead);

    const activeTeamId = effectiveRole === 'freelancer' ? contractInfo.freelancer_team_id : (effectiveRole === 'client' ? contractInfo.client_team_id : null);
    const activeTeamName = effectiveRole === 'freelancer' ? contractInfo.freelancer_team_name : (effectiveRole === 'client' ? contractInfo.client_team_name : null);
    const activeTeamRole = effectiveRole === 'freelancer' ? freelancerMemberRole : (effectiveRole === 'client' ? clientMemberRole : null);

    return {
        contract: contractInfo,
        participants: {
            client_account_id: contractInfo.client_account_id,
            client_name: contractInfo.client_name,
            freelancer_account_id: contractInfo.freelancer_account_id,
            freelancer_name: contractInfo.freelancer_name,
            listing_title: contractInfo.listing_title,
        },
        isDirectClient,
        isDirectFreelancer,
        isClientTeam,
        clientTeamId: contractInfo.client_team_id,
        isClientOwnerOrAdmin,
        isClientProjectLead,
        isFreelancerTeam,
        freelancerTeamId: contractInfo.freelancer_team_id,
        isFreelancerOwnerOrAdmin,
        isFreelancerProjectLead,
        canBuyRevision,
        canReviewMilestone,
        canSubmitMilestone,
        canViewTask,
        userRole: {
            effective_role: effectiveRole,
            can_buy_revision: canBuyRevision,
            can_review_milestone: canReviewMilestone,
            can_submit_milestone: canSubmitMilestone,
            can_view_task: canViewTask,
            is_project_lead: isProjectLead,
            is_team_client: isClientTeam,
            is_team_freelancer: isFreelancerTeam,
            team_id: activeTeamId,
            team_name: activeTeamName,
            team_role: activeTeamRole,
        },
    };
}

//jp
async function getDashboardTasks(accountId) {
    const actorAccountIds = await getAffiliatedAccountIds(accountId);
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
        WHERE (j.client_account_id = ANY($1::uuid[]) OR p.freelancer_account_id = ANY($1::uuid[]))
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
        WHERE (gr.client_account_id = ANY($1::uuid[]) OR g.freelancer_account_id = ANY($1::uuid[]))
          AND LOWER(c.status) IN ('active', 'waiting', 'done', 'completed')
        
        ORDER BY contract_id DESC
    `;
    const result = await pool.query(query, [actorAccountIds]);
    return result.rows.map((row) => {
        const isFreelancer = actorAccountIds.includes(String(row.freelancer_account_id));
        return {
            ...row,
            user_role: {
                effective_role: isFreelancer ? 'freelancer' : 'client',
            },
        };
    });
}

async function getTaskById(contractId, accountId) {
    const permissions = await getContractPermissions(contractId, accountId);
    if (!permissions || !permissions.canViewTask) {
        return null;
    }

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
        WHERE c.contract_id = $1
        
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
        WHERE c.contract_id = $1
    `;
    const result = await pool.query(query, [contractId]);
    const task = result.rows[0];
    if (!task) return null;
    task.user_role = permissions.userRole;
    return task;
}

async function verifyFreelancer(contractId, accountId) {
    const permissions = await getContractPermissions(contractId, accountId);
    return Boolean(permissions?.canSubmitMilestone || permissions?.isDirectFreelancer);
}

async function verifyClient(contractId, accountId) {
    const permissions = await getContractPermissions(contractId, accountId);
    return Boolean(permissions?.canReviewMilestone || permissions?.isDirectClient);
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
    // Find the next milestone that is 'locked' or 'pending' and set it to 'active'
    const query = `
        UPDATE contract_milestones
        SET status = 'active'
        WHERE contract_milestone_id = (
            SELECT contract_milestone_id 
            FROM contract_milestones 
            WHERE contract_id = $1 AND LOWER(status) IN ('locked', 'pending') 
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
            `SELECT contract_milestone_id, name, status, index
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

        if (Number(milestone.index) > 0) {
            const precedingIncomplete = await client.query(
                `SELECT COUNT(*)::integer AS count
                 FROM contract_milestones
                 WHERE contract_id = $1
                   AND index < $2
                   AND LOWER(status) NOT IN ('completed', 'approved')`,
                [contractId, milestone.index]
            );
            if (Number(precedingIncomplete.rows[0].count) > 0) {
                const error = new Error('Previous milestones must be completed before updating this milestone');
                error.statusCode = 409;
                throw error;
            }
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
                    WHERE contract_id = $1 AND LOWER(status) IN ('locked', 'pending')
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
                     SET status = 'Done'
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
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const query = `
            INSERT INTO ratings (contract_id, account_id, stars_out_of_five, feedback)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await client.query(query, [contractId, accountId, stars, feedback]);
        const rating = result.rows[0];

        // Check if both parties have reviewed
        const allRatings = await client.query(
            `SELECT account_id FROM ratings WHERE contract_id = $1`,
            [contractId]
        );

        if (allRatings.rows.length >= 2) {
            await client.query(
                `UPDATE contracts SET status = 'Completed' WHERE contract_id = $1 AND LOWER(status) = 'done'`,
                [contractId]
            );
        }

        await client.query('COMMIT');
        return rating;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
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

        const permissions = await getContractPermissions(contractId, clientAccountId, client);
        if (!permissions || !permissions.canBuyRevision) {
            const error = new Error('Only the client or team Owner/Admin can purchase additional revisions');
            error.statusCode = 403;
            throw error;
        }
        const participants = permissions.participants;

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

        if (permissions.isClientTeam) {
            const contractReservedResult = await client.query(
                `WITH contract_releases AS (
                     SELECT ct.reference_id AS contract_id,
                            COALESCE(SUM(ct.amount_credits), 0)::int AS released_credits
                     FROM credit_transactions ct
                     WHERE ct.destination_wallet_id = $1
                       AND ct.reference_table = 'contracts'
                       AND ct.type = 'Escrow Release'
                       AND LOWER(ct.status) = 'completed'
                     GROUP BY ct.reference_id
                 ),
                 contract_dists AS (
                     SELECT tcd.contract_id,
                            COALESCE(SUM(tcd.amount_credits), 0)::int AS distributed_credits
                     FROM team_contract_distributions tcd
                     WHERE tcd.team_id = $2
                     GROUP BY tcd.contract_id
                 )
                 SELECT COALESCE(SUM(GREATEST(0, cr.released_credits - COALESCE(cd.distributed_credits, 0))), 0)::int AS total_contract_reserved
                 FROM contract_releases cr
                 LEFT JOIN contract_dists cd ON cd.contract_id = cr.contract_id`,
                [clientWallet.wallet_id, permissions.clientTeamId]
            );
            const totalContractReserved = Number(contractReservedResult.rows[0]?.total_contract_reserved || 0);
            const availableBalance = Number(clientWallet.balance_credits || 0);
            const unreservedBalance = Math.max(0, availableBalance - totalContractReserved);

            if (priceCredits > unreservedBalance) {
                const error = new Error(
                    `Insufficient unreserved Team balance for the additional revision (${unreservedBalance.toLocaleString()} credits available). ${totalContractReserved.toLocaleString()} credits are locked/reserved for contract payouts.`
                );
                error.statusCode = 409;
                throw error;
            }
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
    getContractPermissions,
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
