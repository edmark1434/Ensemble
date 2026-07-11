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



module.exports = {
    getAllProfileFilesRepositories
}