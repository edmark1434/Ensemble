//jp
const { getAllAccounts, createAccount, getAccountByHandle, getAccountWalletRepositories,
    checkAccountId, getProfileRepositories, getAccountLinkByAccountIdRepositories,
    checkUserAccountIdRepositories,
    getDisplayNameByAccountId,
    updateAndInsertAccountProfile,
    updateAccountProfile,
    searchUserAccountsByHandle,
    getRecentUserAvatarsRepositories,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    checkIsFollowing,
    getAccountBadges,
    updateAccountBadgeDisplayOrder
} = require("../repositories/AccountRepositories");
const {
    updateUserDetailsByAccountId,
    updateUserDetails
} = require('../repositories/UserRepositories');
const {
    updateProfileAccountRepositories
} = require('../repositories/ProfileRepositories');
const redisClient = require('../lib/Redis');
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

async function searchUserAccountsByHandleService(handle, accountId) {
    const query = String(handle || '').replace(/^@/, '').trim();
    if (query.length < 2) return [];
    console.log(`test query: ${query}`);
    return await searchUserAccountsByHandle(query, accountId, 10);
}

async function getAccountWalletService(accountId, type) { 
    if (!await checkAccountIdService(accountId)) {
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
        return await checkAccountId(accountId);
    } catch (err) {
        console.error('Error checking account ID:', err);
        throw err;
    }
}

async function getProfileServices(accountId) {
    if (!await checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const profile = await getProfileRepositories(accountId);
        if (profile) {
            const badges = await getAccountBadges(accountId);
            // Format badges as an array of objects to map easily in the frontend
            profile.badges = badges.map(b => ({
                id: b.registry_id,
                display_order: b.display_order
            }));
        }
        return profile;
    } catch (err) {
        console.error('Error fetching profile:', err);
        throw err;
    }
}

async function getAccountLinkByAccountIdService(accountId) { 
    if (!await checkAccountIdService(accountId)) {
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
    if (!await checkAccountIdService(accountId)) {
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
    if (!await checkAccountIdService(accountId)) {
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
    if (!await checkAccountIdService(accountId)) {
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
    if (!await checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        if (payload.isEmailVerified !== undefined && !payload.isEmailVerified) {
            throw new Error('Email must be verified to update account information');
        }
        if(payload.isUsernameUnique !== undefined && !payload.isUsernameUnique) {
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
        const userUpdates = {
            email_address: payload.email,
            address: payload.address,
            password_hash: payload.password,
        };
        const updates = [];
        if (Object.values(userUpdates).some((value) => value !== undefined)) {
            updates.push(updateUserDetailsByAccountId(accountId, userUpdates));
        }
        if (payload.username !== undefined) {
            updates.push(updateProfileAccountRepositories(accountId, {
                handle: payload.username,
            }));
        }
        await Promise.all(updates);
        
    }catch (err) {
        console.error('Error updating account info:', err);
        throw err;
    }
}

async function getRecentUserAvatarsService() {
    try {
        const avatars = await getRecentUserAvatarsRepositories(5);
        return avatars;
    } catch (err) {
        console.error('Error fetching recent user avatars:', err);
        throw err;
    }
}

async function followUserService(followerId, followedId) {
    if (!followerId || !followedId) throw new Error('Follower and followed IDs are required');
    if (followerId === followedId) throw new Error('Cannot follow yourself');
    try {
        return await followUser(followerId, followedId);
    } catch (err) {
        console.error('Error in followUserService:', err);
        throw err;
    }
}

async function unfollowUserService(followerId, followedId) {
    if (!followerId || !followedId) throw new Error('Follower and followed IDs are required');
    try {
        return await unfollowUser(followerId, followedId);
    } catch (err) {
        console.error('Error in unfollowUserService:', err);
        throw err;
    }
}

async function getFollowersService(accountId) {
    if (!accountId) throw new Error('Account ID is required');
    try {
        return await getFollowers(accountId);
    } catch (err) {
        console.error('Error in getFollowersService:', err);
        throw err;
    }
}

async function getFollowingService(accountId) {
    if (!accountId) throw new Error('Account ID is required');
    try {
        return await getFollowing(accountId);
    } catch (err) {
        console.error('Error in getFollowingService:', err);
        throw err;
    }
}

async function checkIsFollowingService(followerId, followedId) {
    if (!followerId || !followedId) return false;
    try {
        return await checkIsFollowing(followerId, followedId);
    } catch (err) {
        console.error('Error in checkIsFollowingService:', err);
        throw err;
    }
}

async function curateBadgesService(accountId, registryIds) {
    if (!await checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    if (!Array.isArray(registryIds) || registryIds.length > 5) {
        throw new Error('You can only curate up to 5 badges.');
    }
    try {
        await updateAccountBadgeDisplayOrder(accountId, registryIds);
        return { success: true, message: 'Badges curated successfully' };
    } catch (err) {
        console.error('Error curating badges:', err);
        throw err;
    }
}

module.exports = {
    fetchAllAccounts,
    createNewAccount,
    getAccountByHandleService,
    searchUserAccountsByHandleService,
    getAccountWalletService,
    getProfileServices,
    getAccountLinkByAccountIdService,
    checkUserAccountIdService,
    checkAccountIdService,
    getDisplayNameByAccountIdService,
    updateAndInsertAccountProfileServices,
    updateAccountProfileServices,
    settingAccountInfoUpdate,
    getRecentUserAvatarsService,
    followUserService,
    unfollowUserService,
    getFollowersService,
    getFollowingService,
    checkIsFollowingService,
    curateBadgesService
};
