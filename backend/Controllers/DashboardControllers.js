const DashboardRepositories = require('../Repositories/DashboardRepositories');

async function getTasks(req, res) {
    try {
        const accountId = req.user?.account_id || req.user?.accountId;
        // if auth isn't wired fully for this route yet, let's allow a fallback or error
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const tasks = await DashboardRepositories.getDashboardTasks(accountId);
        
        return res.status(200).json({
            success: true,
            data: tasks
        });

    } catch (error) {
        console.error("Error in getTasks:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function getContractTasks(req, res) {
    try {
        const accountId = req.user?.account_id || req.user?.accountId;
        const { contractId } = req.params; // contract_id
        
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const task = await DashboardRepositories.getTaskById(contractId, accountId);
        
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found or unauthorized' });
        }

        return res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error("Error in getContractTasks:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function submitMilestone(req, res) {
    try {
        const accountId = req.user?.account_id || req.user?.accountId;
        const { contractId, milestoneId } = req.params;
        const { message, attachments, status } = req.body;
        
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Verify the user is the freelancer for this contract
        const isAuthorized = await DashboardRepositories.verifyFreelancer(contractId, accountId);
        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const submission = await DashboardRepositories.addMilestoneSubmission(milestoneId, message, attachments, status);
        
        // If status is submitted_for_review, update milestone status
        if (status === 'submitted_for_review') {
            await DashboardRepositories.updateMilestoneStatus(milestoneId, 'submitted_for_review');
        }

        return res.status(200).json({ success: true, submission });
    } catch (error) {
        console.error("Error in submitMilestone:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function reviewMilestone(req, res) {
    try {
        const accountId = req.user?.account_id || req.user?.accountId;
        const { contractId, milestoneId } = req.params;
        const { message, attachments, status } = req.body; // status = 'approval' or 'revision_request'
        
        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        // Verify the user is the client for this contract
        const isAuthorized = await DashboardRepositories.verifyClient(contractId, accountId);
        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        const submission = await DashboardRepositories.addMilestoneSubmission(milestoneId, message, attachments, status);
        
        if (status === 'approval') {
            await DashboardRepositories.updateMilestoneStatus(milestoneId, 'completed');
            // Unlock next milestone if there is one
            await DashboardRepositories.unlockNextMilestone(contractId, milestoneId);
        } else if (status === 'revision_request') {
            await DashboardRepositories.updateMilestoneStatus(milestoneId, 'active');
        }

        return res.status(200).json({ success: true, submission });
    } catch (error) {
        console.error("Error in reviewMilestone:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function reviewContract(req, res) {
    try {
        const accountId = req.user?.account_id || req.user?.accountId;
        const { contractId } = req.params;
        const { rating, feedback } = req.body;

        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Invalid rating. Must be between 1 and 5.' });
        }

        const task = await DashboardRepositories.getTaskById(contractId, accountId);
        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found or unauthorized' });
        }

        const review = await DashboardRepositories.submitContractReview(contractId, accountId, rating, feedback || '');

        return res.status(200).json({ success: true, review });
    } catch (error) {
        console.error("Error in reviewContract:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

async function buyRevision(req, res) {
    try {
        const accountId = req.user?.account_id || req.user?.accountId;
        const { contractId, milestoneId } = req.params;
        const { priceCredits } = req.body;

        if (!accountId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        if (priceCredits === undefined || priceCredits === null || priceCredits < 0) {
            return res.status(400).json({ success: false, message: 'Invalid price.' });
        }

        // Verify the user is the client for this contract
        const isAuthorized = await DashboardRepositories.verifyClient(contractId, accountId);
        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        await DashboardRepositories.buyRevision(contractId, milestoneId, priceCredits);

        return res.status(200).json({ success: true, message: 'Revision purchased successfully.' });
    } catch (error) {
        console.error("Error in buyRevision:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

module.exports = {
    getTasks,
    getContractTasks,
    submitMilestone,
    reviewMilestone,
    reviewContract,
    buyRevision
};
