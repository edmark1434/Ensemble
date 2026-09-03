const jwt = require('jsonwebtoken');

async function issueEditorHandoffToken(req, res) {
    try {
        const { userId, account_id } = req.user;

        const handoffToken = jwt.sign(
            { userId, account_id, purpose: 'editor-handoff' },
            process.env.EDITOR_HANDOFF_SECRET,
            { expiresIn: '60s' }
        );

        return res.status(200).json({ success: true, handoffToken });
    } catch (err) {
        console.error('Error issuing editor handoff token:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = { issueEditorHandoffToken };