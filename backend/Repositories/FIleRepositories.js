const { pool } = require('../lib/database');


async function getAllProfileFilesRepositories() {
    try {
        const query = `SELECT f.file_id, f.name, f.path from system_files as s inner join files as f on s.file_id = f.file_id where s.category = 'profile'`;
        const { rows } = await pool.query(query);
        return rows;
    } catch (err) {
        console.log('Error fetching profile files:', err);
        throw err;
    }
}



async function createFileRepository(name, path, mime_type, size_bytes) {
    try {
        const query = `
            INSERT INTO files (name, path, mime_type, size_bytes)
            VALUES ($1, $2, $3, $4)
            RETURNING file_id
        `;
        const { rows } = await pool.query(query, [name, path, mime_type, size_bytes]);
        return rows[0].file_id;
    } catch (err) {
        console.error('Error creating file:', err);
        throw err;
    }
}

module.exports = {
    getAllProfileFilesRepositories,
    createFileRepository
}