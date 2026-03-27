const {getAllUsers} = require('../Services/UserServices');

async function fetchAllUsers(req, res) {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    fetchAllUsers,
};