const { pool } = require('../lib/Database');

async function getUserGalleries(accountId) {
    try {
        const query = `
            SELECT 
                g.gallery_id, 
                g.account_id, 
                g.title, 
                g.description, 
                g.created_at, 
                g.updated_at,
                f.file_id,
                f.path AS file_url,
                f.mime_type AS file_mimetype
            FROM user_galleries g
            JOIN files f ON g.file_id = f.file_id
            WHERE g.account_id = $1
            ORDER BY g.created_at DESC
        `;
        const result = await pool.query(query, [accountId]);
        return result.rows;
    } catch (err) {
        console.error('Error fetching user galleries:', err);
        throw err;
    }
}

async function createGalleryItem(accountId, fileId, title, description) {
    try {
        const query = `
            INSERT INTO user_galleries (account_id, file_id, title, description)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await pool.query(query, [accountId, fileId, title, description]);
        return result.rows[0];
    } catch (err) {
        console.error('Error creating gallery item:', err);
        throw err;
    }
}

async function isOwnedGalleryFile(accountId, fileId) {
    return Boolean((await pool.query(
        `SELECT 1 FROM files f
         JOIN upload_intents ui ON ui.file_id=f.file_id
         WHERE f.file_id=$1 AND ui.account_id=$2 AND ui.status='consumed'
           AND ui.consumed_at IS NOT NULL AND f.deleted_at IS NULL
           AND f.path LIKE 'gallery/%'
           AND (f.mime_type LIKE 'image/%' OR f.mime_type='video/mp4')
         LIMIT 1`,
        [fileId, accountId]
    )).rowCount);
}

async function deleteGalleryItem(galleryId, accountId) {
    try {
        const query = `
            DELETE FROM user_galleries
            WHERE gallery_id = $1 AND account_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [galleryId, accountId]);
        return result.rows[0];
    } catch (err) {
        console.error('Error deleting gallery item:', err);
        throw err;
    }
}

async function getGalleryItem(galleryId) {
    try {
        const query = `
            SELECT * FROM user_galleries
            WHERE gallery_id = $1
        `;
        const result = await pool.query(query, [galleryId]);
        return result.rows[0];
    } catch (err) {
        console.error('Error fetching gallery item:', err);
        throw err;
    }
}

async function updateGalleryItem(galleryId, accountId, title, description) {
    try {
        const query = `
            UPDATE user_galleries
            SET title = $1, description = $2, updated_at = NOW()
            WHERE gallery_id = $3 AND account_id = $4
            RETURNING *
        `;
        const result = await pool.query(query, [title, description, galleryId, accountId]);
        return result.rows[0];
    } catch (err) {
        console.error('Error updating gallery item:', err);
        throw err;
    }
}

module.exports = {
    getUserGalleries,
    createGalleryItem,
    isOwnedGalleryFile,
    deleteGalleryItem,
    getGalleryItem,
    updateGalleryItem
};
