const { getAllAccounts, createAccount, getAccountByHandle, getAccountWalletRepositories,
    checkAccountId
 } = require("../Repositories/AccountRepositories");
const redisClient = require('../lib/redis');

async function fetchAllAccounts() {
    try {
        const accounts = await getAllAccounts();
        return accounts;
    } catch (err) {
        console.error('Error fetching accounts:', err);
        throw err;
    }
}

async function createNewAccount(accountData) {
    try{
            accountData.displayName = accountData.displayName || null
            accountData.handle = accountData.handle || null
            accountData.avatarFileId = accountData.avatarFileId || null
            accountData.tagline = accountData.tagline || null
            accountData.description = accountData.description || null
            accountData.type = accountData.type || 'User'
            accountData.status = accountData.status || 'active'
            accountData.deletedAt = accountData.deletedAt || null
        const newAccountId = await createAccount(accountData);
        return newAccountId;
        }
    catch(err){
        console.error('Error processing account data:', err);
        throw err;
    }
}

async function getAccountByHandleService(handle) {
    try{
        const account = await getAccountByHandle(handle);
        return account;
    }catch(err){
        console.error('Error fetching account by handle:', err);
        throw err;
    }
}

async function getAccountWalletService(accountId, type) { 
    if(!accountId){
        throw new Error('Account ID is required to fetch wallet information');
    }
    if (!checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    if(!type && !['account wallets', 'escrow wallets', 'platform wallets'].includes(type)){
        throw new Error('Type is required to fetch wallet information');
    }
    try{
        const wallet = await getAccountWalletRepositories(accountId, type);
        await redisClient.set(`account_wallet:${accountId}:${type}`, JSON.stringify(wallet), 'EX', 3600);
        return wallet;
    }catch(err){
        console.error('Error fetching account wallet:', err);
        throw err;
    }
}

async function checkAccountIdService(accountId) { 
    try {
        return isExist = await checkAccountId(accountId);
    } catch (err) {
        console.error('Error checking account ID:', err);
        throw err;
    }
}

module.exports = {
    fetchAllAccounts,
    createNewAccount,
    getAccountByHandleService,
    getAccountWalletService,
};