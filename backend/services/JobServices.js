// backend/services/JobServices.js
const JobRepositories = require('../repositories/JobRepositories');
const { createNotificationServices } = require('./NotificationServices');
const { getAccountById } = require('../repositories/AccountRepositories');

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

async function updateProposalStatusServices(proposalId, accountIds, status, rejectReason, options = {}) {
    const allowedStatuses = ['Pending', 'Shortlisted', 'Rejected', 'Accepted'];
    if (!allowedStatuses.includes(status)) {
        throw new Error('Invalid status.');
    }
    const updated = await JobRepositories.updateProposalStatusRepositories(proposalId, accountIds, status, rejectReason);
    if (!updated) {
        throw new Error('Proposal not found or you do not have permission.');
    }

    let chatResult = null;
    let createdMessage = null;

    if (status === 'Shortlisted' && options.initialMessage && options.actorAccountId) {
        try {
            const { createMarketplaceChatServices, createMessageServices } = require('./InboxServices');
            const { getIo } = require('../lib/WebSocket');
            const io = getIo();

            chatResult = await createMarketplaceChatServices(
                {
                    context_type: 'job_proposal',
                    context_id: String(proposalId),
                },
                options.actorAccountId,
                {
                    onNotification: (recipientId, notification) => {
                        if (io && notification) io.to(String(recipientId)).emit('notification', notification);
                    },
                    onConversationCreated: (recipientId, inbox) => {
                        if (io && inbox) io.to(String(recipientId)).emit('conversationCreated', inbox);
                    },
                }
            );

            if (chatResult?.inbox?._id) {
                const messageDoc = await createMessageServices(
                    {
                        conversation_id: String(chatResult.inbox._id),
                        message_content: options.initialMessage.trim(),
                    },
                    options.actorAccountId,
                    {
                        onNotification: (recipientId, notification) => {
                            if (io && notification) {
                                io.to(String(recipientId)).emit('notification', notification);
                            }
                        },
                    }
                );
                createdMessage = messageDoc;

                if (io) {
                    const convId = String(chatResult.inbox._id);
                    // Ensure both members receive conversationCreated with latest inbox
                    if (updated.freelancer_account_id) {
                        io.to(String(updated.freelancer_account_id)).emit('conversationCreated', chatResult.inbox);
                    }
                    io.to(String(options.actorAccountId)).emit('conversationCreated', chatResult.inbox);

                    io.to(convId).emit('newMessage', messageDoc);
                    if (updated.freelancer_account_id) {
                        io.to(String(updated.freelancer_account_id)).emit('newMessage', messageDoc);
                        io.to(String(updated.freelancer_account_id)).emit('conversationMessageNotification', messageDoc);
                        // Trigger opening the floating chat on the applicant's side
                        io.to(String(updated.freelancer_account_id)).emit('openFloatingChat', {
                            conversation_id: convId,
                            inbox: chatResult.inbox,
                            initialMessage: messageDoc,
                        });
                    }
                    io.to(String(options.actorAccountId)).emit('newMessage', messageDoc);
                }
            }
        } catch (msgErr) {
            console.error('Error creating marketplace conversation or sending shortlist initial message:', msgErr);
        }
    }

    return {
        ...updated,
        conversation: chatResult?.inbox || null,
        initialMessage: createdMessage || null,
    };
}

async function getTermsOfServiceServices(type = 'jobs') {
    return await JobRepositories.getTermsOfServiceRepositories(type);
}

async function toggleJobSaveServices(jobId, accountId) {
    return await JobRepositories.toggleJobSaveRepositories(jobId, accountId);
}


async function getActiveJobsByClientServices(clientAccountId) {
    return await JobRepositories.getActiveJobsByClientRepositories(clientAccountId);
}

async function createJobInvitationServices(jobId, clientAccountId, freelancerAccountId, message) {
    if (clientAccountId === freelancerAccountId) {
        throw new Error("You cannot invite yourself to a job.");
    }

    // Check if the job exists and belongs to the client
    const jobs = await JobRepositories.getActiveJobsByClientRepositories(clientAccountId);
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
        throw new Error("Job not found or you do not have permission to invite users to it.");
    }

    const existing = await JobRepositories.checkJobInvitationExistsRepositories(jobId, freelancerAccountId);
    if (existing) {
        throw new Error("This freelancer has already been invited to this job.");
    }

    const invite = await JobRepositories.createJobInvitationRepositories(jobId, clientAccountId, freelancerAccountId, message);

    // Fetch client details for notification
    const client = await getAccountById(clientAccountId);
    const clientName = client ? (client.handle || client.display_name) : 'A client';

    // Send notification to freelancer
    await createNotificationServices({
        account_id: freelancerAccountId,
        message: `@${clientName} invited you to apply for their job: ${job.title}`,
        is_read: false,
        reference_table: 'jobs',
        reference_prefix: 'JOB_INVITATION',
        reference_path: `/jobs/postings/${jobId}`,
        reference_id: jobId
    });

    return invite;
}

module.exports = {
    getActiveJobsByClientServices,
    createJobInvitationServices,
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
