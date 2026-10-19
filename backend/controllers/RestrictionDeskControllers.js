const { searchRestrictionAccounts } = require('../repositories/ModeratorRepositories');

async function lookupRestrictionAccounts(req, res) {
  try {
    const data = await searchRestrictionAccounts(req.query.q);
    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error searching restriction accounts:', err);
    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || 'Account search failed',
    });
  }
}

module.exports = { lookupRestrictionAccounts };
