// repositories/TagRepositories.js
const { pool } = require('../lib/Database');

// ============= EXISTING FUNCTIONS (KEPT AS IS) =============

async function getAllTagsRepositories() {
    try {
        const result = await pool.query('SELECT tag_id, name FROM tags');
        return result.rows;    
    } catch (err) {
        console.error('Error fetching tags:', err);
        throw err;
    }
}

async function getTagByIdRepositories(tagId) { 
    try {
        const result = await pool.query('SELECT tag_id, name FROM tags WHERE tag_id = $1', [tagId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching tag with id ${tagId}:`, err);
        throw err;
    }
}

async function getAllTagsByUserIdRepositories(accountId) { 
    try {
        const result = await pool.query(
            `SELECT t.tag_id, t.name, ut.proficiency, ut.years
             FROM tags t
             INNER JOIN user_tags ut ON t.tag_id = ut.tag_id
             INNER JOIN users u ON ut.user_id = u.user_id
             WHERE u.account_id = $1`
        , [accountId]);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching tags for user with id ${accountId}:`, err);
        throw err;
    }
}

async function checkTagExistsRepositories(tagId) { 
    try {
        const result = await pool.query('SELECT EXISTS (SELECT 1 FROM tags WHERE tag_id = $1)', [tagId]);
        return result.rows[0].exists;
    } catch (err) {
        console.error(`Error checking if tag exists with id ${tagId}:`, err);
        throw err;
    }
}

async function checkUserTagExistsRepositories(userId, tagId) {
    try {
        const query = `
            SELECT EXISTS (
                SELECT 1 FROM user_tags 
                WHERE user_id = $1 AND tag_id = $2
            )
        `;
        const result = await pool.query(query, [userId, tagId]);
        return result.rows[0].exists;
    } catch (err) {
        console.error(`Error checking if user ${userId} has tag ${tagId}:`, err);
        throw err;
    }
}

// ============= NEW FUNCTIONS FOR SKILLS MANAGEMENT =============

/**
 * Add multiple user tags
 */
async function addUserTagsRepositories(userId, tags) {
    if (!tags || tags.length === 0) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const tag of tags) {
            const query = `
                INSERT INTO user_tags (user_id, tag_id, proficiency, years)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (user_id, tag_id) DO NOTHING
            `;
            await client.query(query, [userId, tag.tag_id, tag.proficiency, tag.years]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Remove multiple user tags
 */
async function removeUserTagsRepositories(userId, tagIds) {
    if (!tagIds || tagIds.length === 0) return 0;

    try {
        const query = `
            DELETE FROM user_tags 
            WHERE user_id = $1 AND tag_id = ANY($2::int[])
        `;
        
        const result = await pool.query(query, [userId, tagIds]);
        return result.rowCount || 0;
    } catch (err) {
        console.error(`Error removing tags for user ${userId}:`, err);
        throw err;
    }
}

/**
 * Update multiple user tags
 */
async function updateUserTagsRepositories(userId, tags) {
    if (!tags || tags.length === 0) return 0;

    const client = await pool.connect();
    let updatedCount = 0;

    try {
        await client.query('BEGIN');

        for (const tag of tags) {
            const query = `
                UPDATE user_tags
                SET proficiency = $1, years = $2
                WHERE user_id = $3 AND tag_id = $4
            `;
            const result = await client.query(query, [
                tag.proficiency, 
                tag.years, 
                userId, 
                tag.tag_id
            ]);
            updatedCount += result.rowCount || 0;
        }

        await client.query('COMMIT');
        return updatedCount;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Check if a user has a specific tag
 */
async function hasUserTagRepositories(userId, tagId) {
    try {
        const query = `
            SELECT 1 FROM user_tags
            WHERE user_id = $1 AND tag_id = $2
        `;
        const result = await pool.query(query, [userId, tagId]);
        return result.rows.length > 0;
    } catch (err) {
        console.error(`Error checking if user ${userId} has tag ${tagId}:`, err);
        throw err;
    }
}

/**
 * Get all user tags with proficiency and years
 */
async function getUserTagsWithDetailsRepositories(userId) {
    try {
        const query = `
            SELECT ut.user_id, ut.tag_id, ut.proficiency, ut.years, t.name as tag_name
            FROM user_tags ut
            LEFT JOIN tags t ON ut.tag_id = t.tag_id
            WHERE ut.user_id = $1
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching user tags for user ${userId}:`, err);
        throw err;
    }
}

module.exports = {
    // Existing exports
    getAllTagsRepositories,
    getTagByIdRepositories,
    getAllTagsByUserIdRepositories,
    checkTagExistsRepositories,
    checkUserTagExistsRepositories,
    
    // New exports
    addUserTagsRepositories,
    removeUserTagsRepositories,
    updateUserTagsRepositories,
    hasUserTagRepositories,
    getUserTagsWithDetailsRepositories
};