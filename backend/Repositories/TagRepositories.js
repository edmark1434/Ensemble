const { pool } = require('../lib/database');

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

async function getAllTagsByUserIdRepositories(userId) { 
    try {
        const result = await pool.query(
            `SELECT t.tag_id, t.name
             FROM tags t
             INNER JOIN user_tags ut ON t.tag_id = ut.tag_id
             WHERE ut.user_id = $1`
        , [userId]);
        return result.rows;
    } catch (err) {
        console.error(`Error fetching tags for user with id ${userId}:`, err);
        throw err;
    }
}

async function createUserTagRepositories(userId, tagId) {
    try { 
        const result = await pool.query(
            `INSERT INTO user_tags (user_id, tag_id) VALUES ($1, $2)`,
            [userId, tagId]
        );
        return result.rowCount > 0;
    }catch (err) {
        console.error(`Error creating user tag for user ${userId} and tag ${tagId}:`, err);
        throw err;
    }
}

async function deleteUserTagRepositories(userId, tagId) { 
    try {
        const result = await pool.query(
            `DELETE FROM user_tags WHERE user_id = $1 AND tag_id = $2`,
            [userId, tagId]
        );
        return result.rowCount > 0;
    } catch (err) {
        console.error(`Error deleting user tag for user ${userId} and tag ${tagId}:`, err);
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

module.exports = {
    getAllTagsRepositories,
    getTagByIdRepositories,
    getAllTagsByUserIdRepositories,
    createUserTagRepositories,
    deleteUserTagRepositories,
    checkTagExistsRepositories,
}