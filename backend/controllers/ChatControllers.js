const { answerDocumentationQuestion, RagError } = require('../services/RagServices');
const { EmbeddingError } = require('../services/EmbeddingServices');
const {
  ClaudeSupportError,
  generateGigDraft,
  generateGigTiersDraft,
  generateJobPostDraft,
  generateProposalPitchDraft,
  generateProposalMilestonesDraft,
  generateOrderBriefDraft,
  generateJobSkillsDraft,
  generateProfileIntroductionDraft,
} = require('../services/ClaudeSupportServices');

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


async function generateGigDraftResponse(req, res) {
  try {
    const draft = await generateGigDraft(req.body?.prompt, Boolean(req.body?.isTeam));
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI gig draft generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not generate the service details right now. Please try again.' });
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

async function generateOrderBriefResponse(req, res) {
  try {
    const draft = await generateOrderBriefDraft(req.body);
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI order brief generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not generate the project brief right now. Please try again.' });
  }
}

async function generateProposalPitchResponse(req, res) {
  try {
    const draft = await generateProposalPitchDraft(req.body);
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI proposal pitch generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not generate the cover pitch right now. Please try again.' });
  }
}


async function generateGigTiersResponse(req, res) {
  try {
    const draft = await generateGigTiersDraft(req.body);
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI gig tiers generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not generate tiers right now. Please try again.' });
  }
}

async function generateProposalMilestonesResponse(req, res) {
  try {
    const draft = await generateProposalMilestonesDraft(req.body);
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI proposal milestones generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not generate milestones right now. Please try again.' });
  }
}

async function generateJobSkillsResponse(req, res) {
  try {
    const result = await generateJobSkillsDraft(req.body || {});
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI job skills generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not analyze skills right now. Please try again.' });
  }
}


async function generateProfileIntroductionResponse(req, res) {
  try {
    const draft = await generateProfileIntroductionDraft(req.body);
    return res.status(200).json({ success: true, data: draft });
  } catch (error) {
    if (error instanceof ClaudeSupportError) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    console.error('Joed AI profile introduction generation failed:', error);
    return res.status(500).json({ success: false, message: 'Joed AI could not generate your introduction right now. Please try again.' });
  }
}

module.exports = {
  generateGigTiersResponse,
  createDocumentationChatResponse,
  generateGigDraftResponse,
  generateJobDraftResponse,
  generateProposalPitchResponse,
  generateProposalMilestonesResponse,
  generateOrderBriefResponse,
  generateJobSkillsResponse,
  generateProfileIntroductionResponse,
};
