const { editorClipAction } = require('../services/PortfolioClipServices');

exports.editorClip = async (req, res) => {
  try {
    res.json(await editorClipAction(req.body.accountId, req.params.id, req.body));
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Unable to process portfolio clip.' });
  }
};
