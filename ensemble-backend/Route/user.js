const dbClient = require('../lib/database');
const express = require('express');
const router = express.Router();

// Example route to get all users
router.get('/', async (req, res) => {
    try {
        const result = await dbClient.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Internal server error' });
    }  
});

router.
module.exports = router;