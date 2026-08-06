// backend/Services/JobServices.js
const JobRepositories = require('../Repositories/JobRepositories');

async function createJobServices(jobData) {
    if (!jobData.title || !jobData.description) {
        throw new Error('Title and description are required.');
    }
    return await JobRepositories.createJobRepositories(jobData);
}

async function getAllJobsServices(filters, accountId = null) {
    return await JobRepositories.getAllJobsRepositories(filters, accountId);
}

async function updateJobServices(jobId, accountId, jobData) {
    const updated = await JobRepositories.updateJobRepositories(jobId, accountId, jobData);
    if (!updated) {
        throw new Error('Job not found or you do not have permission to edit it.');
    }
    return updated;
}

async function deleteJobServices(jobId, accountId) {
    const deleted = await JobRepositories.deleteJobRepositories(jobId, accountId);
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

async function withdrawProposalServices(proposalId, accountId) {
    try {
        const result = await JobRepositories.withdrawProposalRepositories(proposalId, accountId);
        if (!result) throw new Error('Proposal not found or unauthorized');
        return result;
    } catch (err) {
        throw err;
    }
}

async function getProposalsByJobIdServices(jobId) {
    return await JobRepositories.getProposalsByJobIdRepositories(jobId);
}

async function getProposalsByFreelancerServices(accountId) {
    return await JobRepositories.getProposalsByFreelancerRepositories(accountId);
}

async function getProposalByIdServices(proposalId) {
    return await JobRepositories.getProposalByIdRepositories(proposalId);
}

async function updateProposalStatusServices(proposalId, accountId, status, rejectReason) {
    const allowedStatuses = ['Pending', 'Shortlisted', 'Rejected', 'Accepted'];
    if (!allowedStatuses.includes(status)) {
        throw new Error('Invalid status.');
    }
    const updated = await JobRepositories.updateProposalStatusRepositories(proposalId, accountId, status, rejectReason);
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
