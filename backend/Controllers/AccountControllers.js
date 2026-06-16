const { createNewAccount, fetchAllAccounts, getAccountByHandleService,
    getAccountWalletService,getProfileServices
} = require("../services/AccountServices");
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
        const cachedData = await redisClient.get(`account_wallet:${account_id}:${type}`);
        
        if (cachedData) {
            return res.status(200).json({
                success: true,
                message: 'Wallet fetched successfully',
                wallet: JSON.parse(cachedData),
            });
        }

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
module.exports = {
    createAccount,
    getAccountByHandle,
    getAccountWalletController,
    getProfileController
};
