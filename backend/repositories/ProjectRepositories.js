const { pool } = require('../lib/Database');

async function getProjectsForUser(userId) {
    try {
        const query = `
            SELECT p.project_id as id, p.name, p.status, p.width, p.height, p.duration_seconds, p.updated_at as "lastUpdated", pm.role,
                   tf.path as "thumbnailPath",
                   (SELECT u.first_name || ' ' || u.last_name 
                    FROM project_members pm2 
                    JOIN users u ON pm2.user_id = u.user_id 
                    WHERE pm2.project_id = p.project_id AND pm2.role = 'Owner' AND pm2.deleted_at IS NULL LIMIT 1) as "sharedBy",
                   (SELECT COALESCE(sum(f.size_bytes), 0)
                    FROM media_assets ma 
                    JOIN files f ON f.file_id = ma.original_file_id 
                    WHERE ma.project_id = p.project_id AND ma.deleted_at IS NULL AND f.deleted_at IS NULL) as size_bytes
            FROM projects p
            JOIN project_members pm ON p.project_id = pm.project_id
            LEFT JOIN files tf ON tf.file_id = p.thumbnail_file_id AND tf.deleted_at IS NULL
            WHERE pm.user_id = $1 AND p.deleted_at IS NULL AND pm.deleted_at IS NULL
            ORDER BY p.updated_at DESC
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (err) {
        console.error("Error fetching projects for user:", err);
        throw err;
    }
}

async function softDeleteProject(projectId, userId) {
    try {
        // Only allow if user is Owner
        const verifyQuery = `SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2`;
        const verifyResult = await pool.query(verifyQuery, [projectId, userId]);
        if (verifyResult.rows.length === 0 || verifyResult.rows[0].role !== 'Owner') {
            throw new Error('Unauthorized or not found');
        }

        const query = `UPDATE projects SET deleted_at = NOW() WHERE project_id = $1 RETURNING *`;
        const result = await pool.query(query, [projectId]);
        return result.rows[0];
    } catch (err) {
        console.error('Error deleting project:', err);
        throw err;
    }
}

async function renameProject(projectId, userId, newName) {
    try {
        const query = `
            UPDATE projects p
            SET name = $1, updated_at = NOW()
            FROM project_members pm
            WHERE p.project_id = $2
              AND p.deleted_at IS NULL
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
    softDeleteProject,
    renameProject
};
