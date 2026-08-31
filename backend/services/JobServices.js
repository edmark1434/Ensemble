// backend/services/JobServices.js
const JobRepositories = require('../repositories/JobRepositories');

async function createJobServices(jobData) {
    if (!jobData.title || !jobData.description) {
        throw new Error('Title and description are required.');
    }
    return await JobRepositories.createJobRepositories(jobData);
}

async function getAllJobsServices(filters, accountId = null, actorIds = [], affiliatedAccountIds = actorIds) {
    return await JobRepositories.getAllJobsRepositories(filters, accountId, actorIds, affiliatedAccountIds);
}

async function updateJobServices(jobId, accountIds, jobData) {
    const updated = await JobRepositories.updateJobRepositories(jobId, accountIds, jobData);
    if (!updated) {
        throw new Error('Job not found or you do not have permission to edit it.');
    }
    return updated;
}

async function deleteJobServices(jobId, accountIds) {
    const deleted = await JobRepositories.deleteJobRepositories(jobId, accountIds);
    if (!deleted) {
        throw new Error('Job not found or you do not have permission to delete it.');
    }
    return deleted;
}

async function createProposalServices(proposalData) {
    if (!proposalData.job_id || !proposalData.rate_credits) {
        throw new Error('Job ID and rate are required.');
    }
    return await JobRepositories.createProposalRepositories(proposalData);
}

async function withdrawProposalServices(proposalId, accountIds) {
    try {
        const result = await JobRepositories.withdrawProposalRepositories(proposalId, accountIds);
        if (!result) throw new Error('Proposal not found or unauthorized');
        return result;
    } catch (err) {
        throw err;
    }
}

async function getProposalsByJobIdServices(jobId, accountIds) {
    return await JobRepositories.getProposalsByJobIdRepositories(jobId, accountIds);
}

async function getProposalsByFreelancerServices(accountIds) {
    return await JobRepositories.getProposalsByFreelancerRepositories(accountIds);
}

async function getProposalByIdServices(proposalId, accountIds) {
    return await JobRepositories.getProposalByIdRepositories(proposalId, accountIds);
}

async function updateProposalStatusServices(proposalId, accountIds, status, rejectReason) {
    const allowedStatuses = ['Pending', 'Shortlisted', 'Rejected', 'Accepted'];
    if (!allowedStatuses.includes(status)) {
        throw new Error('Invalid status.');
    }
    const updated = await JobRepositories.updateProposalStatusRepositories(proposalId, accountIds, status, rejectReason);
    if (!updated) {
        throw new Error('Proposal not found or you do not have permission.');
    }
    return updated;
}

async function getTermsOfServiceServices(type = 'jobs') {
    return await JobRepositories.getTermsOfServiceRepositories(type);
}

async function toggleJobSaveServices(jobId, accountId) {
    return await JobRepositories.toggleJobSaveRepositories(jobId, accountId);
}

module.exports = {
    createJobServices,
    getAllJobsServices,
    updateJobServices,
    createProposalServices,
    getProposalsByJobIdServices,
    getProposalsByFreelancerServices,
    getProposalByIdServices,
    withdrawProposalServices,
    updateProposalStatusServices,
    getTermsOfServiceServices,
    toggleJobSaveServices,
    deleteJobServices
};
