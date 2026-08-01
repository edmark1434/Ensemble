const TermsRepositories = require('../Repositories/TermsRepositories');

async function getAllTermsServices(accountId) {
    return await TermsRepositories.getAllTermsRepositories(accountId);
}

async function createTermsServices(accountId, termsData) {
    if (!termsData.terms_title || !termsData.terms_content) {
        throw new Error('Title and content are required.');
    }
    return await TermsRepositories.createTermsRepositories(accountId, termsData);
}

async function updateTermsServices(termsId, accountId, termsData) {
    if (!termsData.terms_title || !termsData.terms_content) {
        throw new Error('Title and content are required.');
    }
    const updated = await TermsRepositories.updateTermsRepositories(termsId, accountId, termsData);
    if (!updated) {
        throw new Error('Terms not found or unauthorized to edit.');
    }
    return updated;
}

async function deleteTermsServices(termsId, accountId) {
    const deleted = await TermsRepositories.deleteTermsRepositories(termsId, accountId);
    if (!deleted) {
        throw new Error('Terms not found or unauthorized to delete.');
    }
    return deleted;
}

module.exports = {
    getAllTermsServices,
    createTermsServices,
    updateTermsServices,
    deleteTermsServices
};
