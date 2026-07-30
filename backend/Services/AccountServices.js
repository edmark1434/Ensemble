const { getAllAccounts, createAccount, getAccountByHandle, getAccountWalletRepositories,
    checkAccountId, getProfileRepositories, getAccountLinkByAccountIdRepositories,
    checkUserAccountIdRepositories,
    getDisplayNameByAccountId,
    updateAndInsertAccountProfile,
    updateAccountProfile
} = require("../Repositories/AccountRepositories");
const {
    updateUserDetailsByAccountId,
    updateUserDetails
} = require('../Repositories/UserRepositories');
const {
    updateProfileAccountRepositories
} = require('../Repositories/ProfileRepositories');
const redisClient = require('../lib/redis');
const bcrypt = require('bcrypt');

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
        throw new Error('Account ID is required');
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

async function updateAndInsertAccountProfileServices(accountId, profileData) { 
    if (!checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    console.log('Profile data received for update:', profileData);
    try {
        const fileId = await updateAndInsertAccountProfile(accountId, profileData);
        return fileId;
    } catch (err) {
        console.error('Error updating/inserting account profile:', err);
        throw err;
    }
}

async function updateAccountProfileServices(accountId, fileId) {
    if (!checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    console.log('File ID received for update:', fileId);
    try {
        await updateAccountProfile(accountId, fileId);
    } catch (err) {
        console.error('Error updating account profile:', err);
        throw err;
    }
}

async function settingAccountInfoUpdate(accountId, payload) {
    if (!checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        if (payload.isEmailVerified !== undefined && !payload.isEmailVerified) {
            throw new Error('Email must be verified to update account information');
        }
        if(payload.isUernameUnique !== undefined && !payload.isUsernameUnique) {
            throw new Error('Username must be unique to update account information');
        }
        if (payload.password) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(payload.password, saltRounds);
            payload.password = hashedPassword;
        }
        if (!payload.email && !payload.address && !payload.password && !payload.username) { 
            return; // No fields to update, exit early
        }
        await Promise.all([
            updateUserDetailsByAccountId(accountId, {
                email_address: payload.email,
                address: payload.address,
                password_hash: payload.password,
            }),
            updateProfileAccountRepositories(accountId, {
                handle: payload.username,
            })
        ]);
        
    }catch (err) {
        console.error('Error updating account info:', err);
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
    getDisplayNameByAccountIdService,
    updateAndInsertAccountProfileServices,
    updateAccountProfileServices,
    settingAccountInfoUpdate
};