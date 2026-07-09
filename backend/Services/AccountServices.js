const { getAllAccounts, createAccount, getAccountByHandle, getAccountWalletRepositories,
    checkAccountId, getProfileRepositories, getAccountLinkByAccountIdRepositories,
    checkUserAccountIdRepositories,
    getDisplayNameByAccountId
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
    if(!accountId){
        throw new Error('Account ID is required to fetch wallet information');
    }
    try {
        return isExist = await checkAccountId(accountId);
    } catch (err) {
        console.error('Error checking account ID:', err);
        throw err;
    }
}

async function getProfileServices(accountId) {
    if (!checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const profile = await getProfileRepositories(accountId);
        return profile;
    } catch (err) {
        console.error('Error fetching profile:', err);
        throw err;
    }
}

async function getAccountLinkByAccountIdService(accountId) { 
    if (!checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const accountLinks = await getAccountLinkByAccountIdRepositories(accountId);
        return accountLinks;
    } catch (err) {
        console.error('Error fetching account links:', err);
        throw err;
    }
}

async function checkUserAccountIdService(accountId) {
    if (!checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const isUserResult = await checkUserAccountIdRepositories(accountId);
        return isUserResult;
    } catch (err) {
        console.error('Error checking account role:', err);
        throw err;
    }
}

async function getDisplayNameByAccountIdService(listOfAccountIds) {
    if (!Array.isArray(listOfAccountIds) || listOfAccountIds.length === 0) {
        throw new Error('A non-empty array of account IDs is required');
    }
    try {
        const displayNames = await getDisplayNameByAccountId(listOfAccountIds);
        return displayNames;
    }
    catch (err) {
        console.error('Error fetching display names:', err);
        throw err;
    }
}

module.exports = {
    fetchAllAccounts,
    createNewAccount,
    getAccountByHandleService,
    getAccountWalletService,
    getProfileServices,
    getAccountLinkByAccountIdService,
    checkUserAccountIdService,
    checkAccountIdService,
    getDisplayNameByAccountIdService
};