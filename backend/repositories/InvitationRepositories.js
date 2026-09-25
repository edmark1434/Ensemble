const { pool } = require('../lib/Database');

const CURSOR_COLORS = ['#F97316', '#3B82F6', '#22C55E', '#EAB308', '#EC4899', '#8B5CF6'];

async function getProjectMemberRole(projectId, userId) {
    try {
        const query = `
            SELECT role FROM project_members
            WHERE project_id = $1 AND user_id = $2 AND deleted_at IS NULL;
        `;
        const { rows } = await pool.query(query, [projectId, userId]);
        return rows[0]?.role || null;
    } catch (err) {
        console.error('Error in getProjectMemberRole:', err);
        throw err;
    }
}

async function getProjectById(projectId) {
    try {
        const query = `
            SELECT project_id, name, status, width, height, duration_seconds, created_at, updated_at
            FROM projects
            WHERE project_id = $1 AND deleted_at IS NULL;
        `;
        const { rows } = await pool.query(query, [projectId]);
        return rows[0] || null;
    } catch (err) {
        console.error('Error in getProjectById:', err);
        throw err;
    }
}

async function getUserAndAccountByAccountId(accountId) {
    try {
        const query = `
            SELECT u.user_id, u.account_id, u.first_name, u.last_name, u.email_address,
                   a.display_name, a.handle, a.status AS account_status
            FROM users u
            JOIN accounts a ON a.account_id = u.account_id
            WHERE a.account_id = $1 AND a.deleted_at IS NULL;
        `;
        const { rows } = await pool.query(query, [accountId]);
        return rows[0] || null;
    } catch (err) {
        console.error('Error in getUserAndAccountByAccountId:', err);
        throw err;
    }
}

async function getUserAndAccountByEmail(email) {
    try {
        const query = `
            SELECT u.user_id, u.account_id, u.first_name, u.last_name, u.email_address,
                   a.display_name, a.handle, a.status AS account_status
            FROM users u
            JOIN accounts a ON a.account_id = u.account_id
            WHERE LOWER(u.email_address) = LOWER($1) AND a.deleted_at IS NULL;
        `;
        const { rows } = await pool.query(query, [String(email).trim().toLowerCase()]);
        return rows[0] || null;
    } catch (err) {
        console.error('Error in getUserAndAccountByEmail:', err);
        throw err;
    }
}

async function addOrReviveProjectMember(projectId, userId, role = 'Editor') {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existingQuery = `
            SELECT project_id, user_id, role, deleted_at
            FROM project_members
            WHERE project_id = $1 AND user_id = $2;
        `;
        const { rows: existingRows } = await client.query(existingQuery, [projectId, userId]);

        let result;
        if (existingRows.length > 0) {
            const member = existingRows[0];
            if (member.deleted_at === null) {
                // Already active member, update role if provided and different
                const updateQuery = `
                    UPDATE project_members
                    SET role = $1
                    WHERE project_id = $2 AND user_id = $3
                    RETURNING *;
                `;
                const updateResult = await client.query(updateQuery, [role, projectId, userId]);
                result = { ...updateResult.rows[0], status: 'updated' };
            } else {
                // Revive member
                const reviveQuery = `
                    UPDATE project_members
                    SET role = $1, deleted_at = NULL, joined_at = NOW()
                    WHERE project_id = $2 AND user_id = $3
                    RETURNING *;
                `;
                const reviveResult = await client.query(reviveQuery, [role, projectId, userId]);
                result = { ...reviveResult.rows[0], status: 'revived' };
            }
        } else {
            // Insert new member
            const randomColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
            const insertQuery = `
                INSERT INTO project_members (project_id, user_id, role, cursor_color, joined_at)
                VALUES ($1, $2, $3, $4, NOW())
                RETURNING *;
            `;
            const insertResult = await client.query(insertQuery, [projectId, userId, role, randomColor]);
            result = { ...insertResult.rows[0], status: 'added' };
        }

        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in addOrReviveProjectMember:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function getProjectMembers(projectId) {
    try {
        const query = `
            SELECT pm.project_id, pm.user_id, pm.role, pm.cursor_color, pm.joined_at,
                   u.first_name, u.last_name, u.email_address, a.display_name, a.account_id
            FROM project_members pm
            JOIN users u ON u.user_id = pm.user_id
            JOIN accounts a ON a.account_id = u.account_id
            WHERE pm.project_id = $1 AND pm.deleted_at IS NULL
            ORDER BY pm.joined_at ASC;
        `;
        const { rows } = await pool.query(query, [projectId]);
        return rows;
    } catch (err) {
        console.error('Error in getProjectMembers:', err);
        throw err;
    }
}

module.exports = {
    getProjectMemberRole,
    getProjectById,
    getUserAndAccountByAccountId,
    getUserAndAccountByEmail,
    addOrReviveProjectMember,
    getProjectMembers,
};
