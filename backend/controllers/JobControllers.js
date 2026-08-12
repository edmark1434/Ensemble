// backend/controllers/JobControllers.js
const JobServices = require('../services/JobServices');
const { pool } = require('../lib/Database');
const { getIo } = require('../lib/WebSocket');
const { createNotificationServices } = require('../services/NotificationServices');

async function createJobController(req, res) {
    try {
        const accountId = req.user?.account_id;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const jobData = { ...req.body, client_account_id: accountId };
        const jobId = await JobServices.createJobServices(jobData);
        
        res.status(201).json({ success: true, jobId, message: 'Job created successfully.' });
    } catch (err) {
        console.error('Error in createJobController:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
}

async function getAllJobsController(req, res) {
    try {
        const filters = req.query;
        const accountId = req.user?.account_id || req.user?.accountId || null;
        const jobs = await JobServices.getAllJobsServices(filters, accountId);
        res.status(200).json({ success: true, data: jobs });
    } catch (err) {
        console.error('Error in getAllJobsController:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function updateJobController(req, res) {
    try {
        const accountId = req.user?.account_id;
        const { jobId } = req.params;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const updated = await JobServices.updateJobServices(jobId, accountId, req.body);
        res.status(200).json({ success: true, data: updated, message: 'Job updated.' });
    } catch (err) {
        console.error('Error in updateJobController:', err);
        res.status(400).json({ success: false, message: err.message || 'Internal Server Error' });
    }
}

async function deleteJobController(req, res) {
    try {
        const accountId = req.user?.account_id;
        const { jobId } = req.params;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        await JobServices.deleteJobServices(jobId, accountId);
        res.status(200).json({ success: true, message: 'Job successfully deleted.' });
    } catch (err) {
        console.error('Error in deleteJobController:', err);
        res.status(400).json({ success: false, message: err.message || 'Internal Server Error' });
    }
}

async function createProposalController(req, res) {
    try {
        const accountId = req.user?.account_id;
        const { jobId } = req.params;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const proposalData = { ...req.body, freelancer_account_id: accountId, job_id: jobId };
        const proposalId = await JobServices.createProposalServices(proposalData);
        
        try {
            const jobQ = await pool.query('SELECT client_account_id, title FROM jobs WHERE job_id = $1', [jobId]);
            if (jobQ.rows[0]) {
                const clientAccountId = jobQ.rows[0].client_account_id;
                const title = jobQ.rows[0].title;
                const notif = await createNotificationServices({
                    message: `You just received a proposal on your job post ${title}`,
                    reference_table: 'proposals',
                    reference_prefix: 'create',
                    reference_path: `/jobs/proposals/incoming/${jobId}`,
                    reference_id: proposalId,
                    account_id: clientAccountId
                });
                const io = getIo();
                if (io) io.to(String(clientAccountId)).emit('notification', notif);
            }
        } catch (notifErr) {
            console.error('Error sending create proposal notification:', notifErr);
        }

        res.status(201).json({ success: true, proposalId, message: 'Proposal submitted.' });
    } catch (err) {
        console.error('Error in createProposalController:', err);
        res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    }
}

async function getProposalsByJobController(req, res) {
    try {
        const { jobId } = req.params;
        const proposals = await JobServices.getProposalsByJobIdServices(jobId);
        res.status(200).json({ success: true, data: proposals });
    } catch (err) {
        console.error('Error in getProposalsByJobController:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getSentProposalsController(req, res) {
    try {
        const accountId = req.user?.account_id;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const proposals = await JobServices.getProposalsByFreelancerServices(accountId);
        res.status(200).json({ success: true, data: proposals });
    } catch (err) {
        console.error('Error in getSentProposalsController:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function getProposalByIdController(req, res) {
    try {
        const { proposalId } = req.params;
        const proposal = await JobServices.getProposalByIdServices(proposalId);
        if (!proposal) {
            return res.status(404).json({ success: false, message: 'Proposal not found' });
        }
        res.status(200).json({ success: true, data: proposal });
    } catch (err) {
        console.error('Error in getProposalByIdController:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function withdrawProposalController(req, res) {
    try {
        const accountId = req.user?.account_id;
        const { proposalId } = req.params;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        await JobServices.withdrawProposalServices(proposalId, accountId);
        res.status(200).json({ success: true, message: 'Proposal withdrawn successfully.' });
    } catch (err) {
        console.error('Error in withdrawProposalController:', err);
        res.status(400).json({ success: false, message: err.message || 'Internal Server Error' });
    }
}

async function updateProposalStatusController(req, res) {
    try {
        const accountId = req.user?.account_id;
        const { proposalId } = req.params;
        const { status, rejectReason } = req.body;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const updated = await JobServices.updateProposalStatusServices(proposalId, accountId, status, rejectReason);

        try {
            if (status === 'Shortlisted' || status === 'Rejected' || status === 'Approved') {
                const propQ = await pool.query(`
                    SELECT p.freelancer_account_id, j.title, p.job_id 
                    FROM proposals p 
                    JOIN jobs j ON p.job_id = j.job_id 
                    WHERE p.proposal_id = $1
                `, [proposalId]);
                
                if (propQ.rows[0]) {
                    const { freelancer_account_id, title } = propQ.rows[0];
                    let message = `Your proposal on ${title} has been ${status}`;
                    if (status === 'Shortlisted') {
                        message = `Your proposal on ${title} has been shortlisted.`;
                    }
                    
                    const notif = await createNotificationServices({
                        message,
                        reference_table: 'proposals',
                        reference_prefix: status.toLowerCase(),
                        reference_path: `/jobs/proposals/sent/${proposalId}`,
                        reference_id: proposalId,
                        account_id: freelancer_account_id
                    });
                    const io = getIo();
                    if (io) io.to(String(freelancer_account_id)).emit('notification', notif);
                }
            }
        } catch (notifErr) {
            console.error('Error sending proposal status notification:', notifErr);
        }

        res.status(200).json({ success: true, data: updated, message: 'Status updated.' });
    } catch (err) {
        console.error('Error in updateProposalStatusController:', err);
        res.status(400).json({ success: false, message: err.message || 'Internal Server Error' });
    }
}

async function getTermsOfServiceController(req, res) {
    try {
        const { type } = req.query; // 'jobs' or 'gigs'
        const tos = await JobServices.getTermsOfServiceServices(type || 'jobs');
        res.status(200).json({ success: true, data: tos });
    } catch (err) {
        console.error('Error in getTermsOfServiceController:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

async function toggleJobSaveController(req, res) {
    try {
        const accountId = req.user?.account_id || req.user?.accountId;
        const { jobId } = req.params;
        if (!accountId) return res.status(401).json({ success: false, message: 'Unauthorized' });

        const result = await JobServices.toggleJobSaveServices(jobId, accountId);
        
        if (result.saved) {
            try {
                const jobQ = await pool.query('SELECT client_account_id FROM jobs WHERE job_id = $1', [jobId]);
                const accQ = await pool.query('SELECT handle FROM accounts WHERE account_id = $1', [accountId]);
                if (jobQ.rows[0] && accQ.rows[0]) {
                    const clientAccountId = jobQ.rows[0].client_account_id;
                    const handle = accQ.rows[0].handle;
                    
                    if (String(clientAccountId) !== String(accountId)) {
                        const notif = await createNotificationServices({
                            message: `@${handle} saved your job post`,
                            reference_table: 'jobs',
                            reference_prefix: 'save',
                            reference_path: `/jobs/postings/${jobId}`,
                            reference_id: jobId,
                            account_id: clientAccountId
                        });
                        const io = getIo();
                        if (io) io.to(String(clientAccountId)).emit('notification', notif);
                    }
                }
            } catch (notifErr) {
                console.error('Error sending job save notification:', notifErr);
            }
        }

        res.status(200).json({ success: true, ...result, message: result.saved ? 'Job saved.' : 'Job unsaved.' });
    } catch (err) {
        console.error('Error in toggleJobSaveController:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
}

module.exports = {
    createJobController,
    getAllJobsController,
    updateJobController,
    createProposalController,
    getProposalsByJobController,
    getSentProposalsController,
    getProposalByIdController,
    withdrawProposalController,
    updateProposalStatusController,
    getTermsOfServiceController,
    toggleJobSaveController,
    deleteJobController
};
