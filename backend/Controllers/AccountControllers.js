const { createNewAccount, fetchAllAccounts, getAccountByHandleService,
    getAccountWalletService, getProfileServices, getAccountLinkByAccountIdService,
    checkUserAccountIdService,
    getDisplayNameByAccountIdService,
    updateAndInsertAccountProfileServices,
    updateAccountProfileServices,
} = require("../services/AccountServices");
const { getUserOnboardingStep,
     updateUserDetails
 } = require('../Repositories/UserRepositories');

const redisClient = require('../lib/redis');
async function createAccount(req, res) {
    try {
        const accountData = req.body;
        const newAccountId = await createNewAccount(accountData);
        res.status(201).json({ accountId: newAccountId });
    } catch (err) {
        console.error('Error creating account:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function getAccountByHandle(handle) {
    try {
        const account = await getAccountByHandleService(handle);
        if (account) {
            res.json(account);
        } else {
            res.status(404).json({ error: 'Account not found' });
        }
    } catch (err) {
        console.error('Error fetching account by handle:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getAccountWalletController(req, res) { 
    let { type } = req.query;
    if (!type) {
        return res.status(400).json({ success: false, message: 'Wallet type parameter is required' });
    }

    type = type.replace('_', ' ');
    const { account_id } = req.session;
    console.log('Account ID from session:', req.session);
    if (!account_id) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Account session not found.' });
    }

    try {
        // const cachedData = await redisClient.get(`account_wallet:${account_id}:${type}`);
        
        // if (cachedData) {
        //     return res.status(200).json({
        //         success: true,
        //         message: 'Wallet fetched successfully',
        //         wallet: JSON.parse(cachedData),
        //     });
        // }

        const wallet = await getAccountWalletService(account_id, type);
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found',
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Wallet fetched successfully',
            wallet,
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function getProfileController(req, res) {
    const { accountId } = req.params;
    if (!accountId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Account session not found.' });
    }
    try {
        const profile = await getProfileServices(accountId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found' });
        }
        return res.status(200).json({ success: true, message: 'Profile fetched successfully', profile });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function getAccountLinkByAccountIdController(req, res) {
    const { accountId } = req.params;
    if (!accountId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Account session not found.' });
    }
    try {
        const links = await getAccountLinkByAccountIdService(accountId);
        return res.status(200).json({ success: true, message: 'Account links fetched successfully', links });
    } catch (err) {
        console.error(`Error fetching account links for accountId ${accountId}:`, err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

async function checkUserAccountIdController(req, res) {
    const { accountId } = req.params;
    if (!accountId) {
        return res.status(401).json({ success: false, message: 'Unauthorized. Account session not found.' });
    }
    try {
        const isUser = await checkUserAccountIdService(accountId);
        return res.status(200).json({ success: true, message: 'User check completed successfully', isUser });
    }
    catch (err) {
        console.error(`Error checking user status for accountId ${accountId}:`, err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

async function getDisplayNameByAccountIdController(req, res) {
    const { accountIds } = req.body; // Expecting an array of account IDs in the request body
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
        return res.status(400).json({ success: false, message: 'A non-empty array of account IDs is required' });
    }
    try {
        const displayNames = await getDisplayNameByAccountIdService(accountIds);
        return res.status(200).json({ success: true, message: 'Display names fetched successfully', displayNames });
    }catch (err) {
        console.error(`Error fetching display names for accountIds ${accountIds}:`, err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

async function updateAndInsertAccountProfileController(req, res) {
    const { account_id } = req.session;
    const profileData = req.body;
    try {
        const fileId = await updateAndInsertAccountProfileServices(account_id, profileData);
        return res.status(200).json({ success: true, message: 'Profile updated/inserted successfully', file: fileId });
    }catch (err) {
        console.error(`Error updating/inserting profile for accountId ${account_id}:`, err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

async function updateAccountProfileIdController(req, res) {
    const { account_id,userId } = req.session;
    const { fileId } = req.body;
    if (!fileId) {
        return res.status(400).json({ success: false, message: 'File ID is required' });
    }
    try {
        await updateAccountProfileServices(account_id, fileId);
        return res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        console.error(`Error updating profile for accountId ${account_id}:`, err);
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
}

async function updateUserOnboardingStep(userId) {
    let steps = 2;
    steps = parseInt(steps, 10) + 1;
    await Promise.all([
        redisClient.set(`session:${userId}`, steps, { EX: 60 * 60 * 24 * 30 }),
        updateUserDetails(userId, { onboarding_step: steps })
    ]);
}

module.exports = {
    createAccount,
    getAccountByHandle,
    getAccountWalletController,
    getProfileController,
    getAccountLinkByAccountIdController,
    checkUserAccountIdController,
    getDisplayNameByAccountIdController,
    updateAndInsertAccountProfileController,
    updateAccountProfileIdController,
};
