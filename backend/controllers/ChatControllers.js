const { answerDocumentationQuestion, RagError } = require('../services/RagServices');
const { EmbeddingError } = require('../services/EmbeddingServices');
const { ClaudeSupportError, generateJobPostDraft } = require('../services/ClaudeSupportServices');

async function createDocumentationChatResponse(req, res) {
  try {
    const result = await answerDocumentationQuestion(req.body?.message, req.body?.history);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    if (error instanceof RagError || error instanceof EmbeddingError || error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Documentation chat failed:', error);
    return res.status(500).json({ success: false, message: 'Unable to answer the documentation question.' });
  }
}

async function generateJobDraftResponse(req, res) {
  try {
    const draft = await generateJobPostDraft(req.body?.prompt);
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI job draft generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not generate the job post right now. Please try again.' });
  }
}

module.exports = { createDocumentationChatResponse, generateJobDraftResponse };
