const {createNewAccount,fetchAllAccounts,getAccountByHandleService} = require("../services/AccountServices");

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
module.exports = {
    createAccount,
    getAccountByHandle
}