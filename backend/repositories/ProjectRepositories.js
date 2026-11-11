const { pool } = require('../lib/Database');

const PROJECT_PORTFOLIO_DETAILS_SQL = `
    SELECT
        p.project_id AS id,
        p.name,
        p.status,
        p.trashed_at AS "trashedAt",
        p.trashed_at + INTERVAL '30 days' AS "expiresAt",
        p.width,
        p.height,
        COALESCE(NULLIF(p.duration_seconds, 0), 60) AS duration_seconds,
        p.updated_at AS "lastUpdated",
        COALESCE(pm.role, 'Editor') AS role,
        tf.path AS "thumbnailPath",
        COALESCE(
            (
                SELECT COALESCE(pf.path, of.path)
                FROM media_assets ma
                LEFT JOIN files pf ON pf.file_id = ma.proxy_file_id AND pf.deleted_at IS NULL
                LEFT JOIN files of ON of.file_id = ma.original_file_id AND of.deleted_at IS NULL
                WHERE ma.project_id = p.project_id
                  AND ma.deleted_at IS NULL
                  AND (
                      ma.type ILIKE 'video%'
                      OR of.mime_type ILIKE 'video%'
                      OR pf.mime_type ILIKE 'video%'
                  )
                ORDER BY ma.created_at DESC
                LIMIT 1
            ),
            (
                SELECT f.path
                FROM team_workspace_projects twp
                JOIN team_contract_workspaces tcw ON tcw.workspace_id = twp.workspace_id
                JOIN contract_milestones cm ON cm.contract_id = tcw.contract_id
                JOIN milestone_submits ms ON ms.contract_milestone_id = cm.contract_milestone_id
                JOIN submit_attachments sa ON sa.milestone_submit_id = ms.milestone_submit_id
                JOIN files f ON f.file_id = sa.file_id AND f.deleted_at IS NULL
                WHERE twp.project_id = p.project_id
                  AND f.mime_type ILIKE 'video%'
                ORDER BY ms.submitted_at DESC
                LIMIT 1
            )
        ) AS "videoPath",
        (
            SELECT COALESCE( NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), a_owner.display_name, a_owner.handle )
            FROM project_members pm2
            JOIN users u ON pm2.user_id = u.user_id
            LEFT JOIN accounts a_owner ON a_owner.account_id = u.account_id
            WHERE pm2.project_id = p.project_id
              AND pm2.role = 'Owner'
              AND pm2.deleted_at IS NULL
            LIMIT 1
        ) AS "sharedBy",
        (
            SELECT COALESCE(sum(f.size_bytes), 0)
            FROM media_assets ma
            JOIN files f ON f.file_id = ma.original_file_id
            WHERE ma.project_id = p.project_id
              AND ma.deleted_at IS NULL
              AND f.deleted_at IS NULL
        ) AS size_bytes,
        job_link.job_id AS "linkedJobId",
        job_link.job_title AS "linkedJobTitle",
        job_link.client_name AS "linkedClientName",
        job_link.portfolio_use_allowed AS "jobPortfolioAllowed",
        job_link.portfolio_use_duration_seconds AS "jobPortfolioDuration",
        gig_link.gig_request_id AS "linkedGigRequestId",
        gig_link.gig_title AS "linkedGigTitle",
        gig_link.client_name AS "gigClientName",
        gig_link.portfolio_use_allowed AS "gigPortfolioAllowed",
        gig_link.portfolio_use_duration_seconds AS "gigPortfolioDuration"
    FROM projects p
    JOIN users curr_u ON curr_u.user_id = $1
    LEFT JOIN project_members pm
      ON p.project_id = pm.project_id
     AND pm.user_id = $1
     AND pm.deleted_at IS NULL
    LEFT JOIN files tf ON tf.file_id = p.thumbnail_file_id AND tf.deleted_at IS NULL
    LEFT JOIN LATERAL (
        SELECT
            j.job_id,
            j.title AS job_title,
            client_acc.display_name AS client_name,
            j.client_account_id,
            COALESCE(j.portfolio_use_allowed, false) AS portfolio_use_allowed,
            j.portfolio_use_duration_seconds
        FROM jobs j
        JOIN accounts client_acc ON client_acc.account_id = j.client_account_id
        WHERE j.deleted_at IS NULL
          AND (
              j.existing_project_id = p.project_id
              OR EXISTS (
                  SELECT 1
                  FROM team_contract_workspaces tcw
                  LEFT JOIN team_workspace_projects twp ON twp.workspace_id = tcw.workspace_id
                  JOIN contracts c ON c.contract_id = tcw.contract_id
                  JOIN job_contracts jc ON jc.contract_id = c.contract_id
                  JOIN proposals prop ON prop.proposal_id = jc.proposal_id
                  WHERE prop.job_id = j.job_id
                    AND (tcw.project_id = p.project_id OR twp.project_id = p.project_id)
              )
          )
        ORDER BY j.created_at DESC
        LIMIT 1
    ) job_link ON true
    LEFT JOIN LATERAL (
        SELECT
            gr.gig_request_id,
            g.title AS gig_title,
            client_acc.display_name AS client_name,
            gr.client_account_id,
            COALESCE(gig_port.portfolio_use_allowed, true) AS portfolio_use_allowed,
            COALESCE(
                gig_port.portfolio_use_duration_seconds,
                NULLIF(SUBSTRING(COALESCE(gt.description, '') FROM '(?i)up to\\s*(\\d+)\\s*s'), '')::integer,
                60
            ) AS portfolio_use_duration_seconds
        FROM gig_requests gr
        JOIN gig_tiers gt ON gt.gig_tier_id = gr.gig_tier_id
        JOIN gigs g ON g.gig_id = gt.gig_id
        JOIN accounts client_acc ON client_acc.account_id = gr.client_account_id
        LEFT JOIN LATERAL (
            SELECT
                CASE
                    WHEN grp.response IS NOT NULL AND (
                        grp.response ILIKE '%no%' OR grp.response ILIKE '%private%' OR grp.response ILIKE '%restricted%'
                    ) THEN false
                    ELSE true
                END AS portfolio_use_allowed,
                COALESCE(
                    NULLIF(SUBSTRING(COALESCE(grp.response, req.question, '') FROM '(?i)up to\\s*(\\d+)\\s*s'), '')::integer,
                    NULLIF(SUBSTRING(COALESCE(req.question, '') FROM '(?i)(\\d+)\\s*s(?:ec|econds)?'), '')::integer
                ) AS portfolio_use_duration_seconds
            FROM gig_requirements req
            LEFT JOIN gig_responses grp
              ON grp.gig_requirement_id = req.gig_requirement_id
             AND grp.gig_request_id = gr.gig_request_id
            WHERE req.gig_id = g.gig_id
              AND (req.question ILIKE '%portfolio%' OR req.question ILIKE '%showcase%')
              AND req.deleted_at IS NULL
            ORDER BY req.gig_requirement_id ASC
            LIMIT 1
        ) gig_port ON true
        WHERE (
            gr.linked_project_id = p.project_id
            OR EXISTS (
                SELECT 1
                FROM team_contract_workspaces tcw
                LEFT JOIN team_workspace_projects twp ON twp.workspace_id = tcw.workspace_id
                JOIN contracts c ON c.contract_id = tcw.contract_id
                JOIN gig_contracts gc ON gc.contract_id = c.contract_id
                WHERE gc.gig_request_id = gr.gig_request_id
                  AND (tcw.project_id = p.project_id OR twp.project_id = p.project_id)
            )
        )
        ORDER BY gr.created_at DESC
        LIMIT 1
    ) gig_link ON true
`;

function normalizeProjectPortfolioMetadata(row) {
    const isSharedMember = row.role !== 'Owner';
    const hasJobLink = Boolean(row.linkedJobId);
    const hasGigLink = Boolean(row.linkedGigRequestId);
    const isSharedOrContract = isSharedMember || hasJobLink || hasGigLink;

    let portfolioUseAllowed = true;
    let portfolioUseDurationSeconds = null;
    let clientName = row.sharedBy || null;
    let contractTitle = null;

    if (hasJobLink) {
        portfolioUseAllowed = Boolean(row.jobPortfolioAllowed);
        portfolioUseDurationSeconds = portfolioUseAllowed
            ? Number(row.jobPortfolioDuration) || 30
            : null;
        clientName = row.linkedClientName || clientName;
        contractTitle = row.linkedJobTitle || null;
    } else if (hasGigLink) {
        portfolioUseAllowed = Boolean(row.gigPortfolioAllowed);
        portfolioUseDurationSeconds = portfolioUseAllowed
            ? Number(row.gigPortfolioDuration) || 60
            : null;
        clientName = row.gigClientName || clientName;
        contractTitle = row.linkedGigTitle || null;
    }

    return {
        ...row,
        isSharedProject: isSharedOrContract,
        portfolioUseAllowed,
        portfolioUseDurationSeconds,
        clientName,
        contractTitle,
    };
}

async function getProjectsForUser(userId, trash = false) {
    try {
        const query = `
            ${PROJECT_PORTFOLIO_DETAILS_SQL}
            WHERE p.deleted_at IS NULL
              AND (($2::boolean = false AND p.trashed_at IS NULL)
                OR ($2::boolean = true AND p.trashed_at IS NOT NULL
                    AND p.trashed_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
                    AND pm.role = 'Owner'))
              AND (
                  pm.user_id IS NOT NULL
                  OR EXISTS (
                      SELECT 1
                      FROM team_contract_workspaces tcw
                      LEFT JOIN team_workspace_projects twp ON twp.workspace_id = tcw.workspace_id
                      JOIN team_members tm ON tm.team_id = tcw.team_id AND tm.status = 'Active'
                      WHERE tm.user_id = $1
                        AND (tcw.project_id = p.project_id OR twp.project_id = p.project_id)
                  )
              )
            ORDER BY CASE WHEN $2::boolean THEN p.trashed_at ELSE p.updated_at END DESC, p.project_id
        `;
        const result = await pool.query(query, [userId, trash]);
        return result.rows.map(normalizeProjectPortfolioMetadata);
    } catch (err) {
        console.error("Error fetching projects for user:", err);
        throw err;
    }
}

async function getProjectForPortfolioByAccount(accountId, projectId) {
    const userRes = await pool.query(
        `SELECT u.user_id FROM users u JOIN accounts a ON a.account_id = u.account_id WHERE u.account_id = $1 AND a.deleted_at IS NULL LIMIT 1`,
        [accountId]
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) return null;

    const projects = await getProjectsForUser(userId);
    return projects.find((p) => String(p.id) === String(projectId)) || null;
}

async function withLockedProject(projectId, userId, work) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { rows: [project] } = await client.query(`
            SELECT p.project_id, p.name, p.status, p.trashed_at, p.deleted_at,
                p.trashed_at <= CURRENT_TIMESTAMP - INTERVAL '30 days' AS expired,
                pm.role
            FROM projects p
            LEFT JOIN project_members pm ON pm.project_id = p.project_id
                AND pm.user_id = $2 AND pm.deleted_at IS NULL
            WHERE p.project_id = $1 FOR UPDATE OF p`, [projectId, userId]);
        const result = await work(project, client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
}

async function updateProjectTrashState(client, projectId, action) {
    const changes = {
        trash: 'trashed_at = COALESCE(trashed_at, CURRENT_TIMESTAMP)',
        restore: 'trashed_at = NULL',
        permanent: 'deleted_at = CURRENT_TIMESTAMP',
    };
    if (!changes[action]) throw new Error('Invalid project trash action');
    const { rows: [project] } = await client.query(`UPDATE projects
        SET ${changes[action]}, updated_at = CURRENT_TIMESTAMP
        WHERE project_id = $1 RETURNING project_id`, [projectId]);
    return project;
}

async function purgeExpiredProjectTrash() {
    const { rows } = await pool.query(`WITH expired AS (
        SELECT project_id FROM projects
        WHERE deleted_at IS NULL AND trashed_at <= CURRENT_TIMESTAMP - INTERVAL '30 days'
          AND LOWER(status) <> 'frozen'
        ORDER BY trashed_at LIMIT 100 FOR UPDATE SKIP LOCKED
    ) UPDATE projects p SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      FROM expired WHERE p.project_id = expired.project_id RETURNING p.project_id`);
    return rows;
}

async function renameProject(projectId, userId, newName) {
    try {
        const current = await pool.query(
            `SELECT status FROM projects WHERE project_id = $1 AND deleted_at IS NULL AND trashed_at IS NULL`,
            [projectId]
        );
        if (current.rows[0] && String(current.rows[0].status).toLowerCase() === 'frozen') {
            const error = new Error('This project is frozen and cannot be edited');
            error.statusCode = 403;
            throw error;
        }
        const query = `
            UPDATE projects p
            SET name = $1, updated_at = NOW()
            FROM project_members pm
            WHERE p.project_id = $2
              AND p.deleted_at IS NULL
              AND p.trashed_at IS NULL
              AND pm.project_id = p.project_id
              AND pm.user_id = $3
              AND pm.deleted_at IS NULL
              AND pm.role IN ('Owner', 'Manager', 'Editor')
            RETURNING p.*
        `;
        const result = await pool.query(query, [newName, projectId, userId]);
        // No row = not allowed, or not found. The controller answers 403.
        return result.rows[0] || null;
    } catch (err) {
        console.error('Error renaming project:', err);
        throw err;
    }
}

module.exports = {
    getProjectsForUser,
    getProjectForPortfolioByAccount,
    withLockedProject,
    updateProjectTrashState,
    purgeExpiredProjectTrash,
    renameProject
};
