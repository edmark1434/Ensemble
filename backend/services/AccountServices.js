//jp
const crypto = require('crypto');
const { getAllAccounts, getAccountById, createAccount, getAccountByHandle, getAccountWalletRepositories,
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
    updateAccountBadgeDisplayOrder,
    createAuthenticationSecret,
    getAuthenticationSecret,
    deleteAuthenticationSecret,
    createAuthenticationRecoveryCodes,
    getAuthenticationRecoveryCodes,
    deleteAuthenticationRecoveryCodes,
    verifyAuthenticationRecoveryCode,
    checkAccountHasPassword
} = require("../repositories/AccountRepositories");
const { generateSecret, generate, verify, generateURI } = require('otplib');
const SELF_TRIGGERED_BADGES = new Set(['setup-profile']);
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

async function searchUserAccountsByHandleService(handle, accountId, role = null) {
    const query = String(handle || '').replace(/^@/, '').trim();
    return await searchUserAccountsByHandle(query, accountId, 50, role);
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
    curateBadgesService,
    grantBadgeService,
    setup2FASecretService,
    verifyAndEnable2FAService,
    get2FAStatusService,
    disable2FAService,
    regenerateRecoveryCodesService,
    verify2FACodeOrRecoveryService,
};

async function grantBadgeService(accountId, registryId) {
    if (!await checkAccountIdService(accountId)) {
        throw new Error('Invalid account ID');
    }
    if (!SELF_TRIGGERED_BADGES.has(registryId)) {
        const error = new Error('This badge can only be granted by an administrator');
        error.statusCode = 403;
        throw error;
    }
    try {
        const { grantBadgeService: createBadgeGrant } = require('./BadgeServices');
        const result = await createBadgeGrant({ registryId, accountIds: [accountId] });
        return { success: true, message: result.granted ? 'Badge sent to your notifications' : 'Badge already granted' };
    } catch (err) {
        console.error('Error granting badge:', err);
        throw err;
    }
}

function generateRecoveryCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        codes.push(`${p1}-${p2}`);
    }
    return codes;
}

async function setup2FASecretService(accountId) {
    if (!accountId) throw new Error('Account ID is required');

    const hasPassword = await checkAccountHasPassword(accountId);
    if (!hasPassword) {
        const err = new Error('You must set an account password before enabling two-factor authentication.');
        err.statusCode = 400;
        throw err;
    }

    const account = await getAccountById(accountId);
    if (!account) throw new Error('Account not found');

    const secret = generateSecret();
    const label = account.handle ? `@${account.handle}` : (account.display_name || 'Ensemble User');
    const otpauthUrl = generateURI({
        issuer: 'Ensemble',
        label,
        secret,
    });
    // Exactly 8 recovery codes per requirement
    const recoveryCodes = generateRecoveryCodes(8);

    // Cache the pending secret and recovery codes in Redis for 15 minutes
    await redisClient.set(
        `pending_2fa_setup:${accountId}`,
        JSON.stringify({ secret, recoveryCodes }),
        { EX: 15 * 60 }
    );

    return {
        secret,
        otpauthUrl,
        recoveryCodes,
    };
}

async function verifyAndEnable2FAService(accountId, token) {
    if (!accountId) throw new Error('Account ID is required');

    const hasPassword = await checkAccountHasPassword(accountId);
    if (!hasPassword) {
        const err = new Error('You must set an account password before enabling two-factor authentication.');
        err.statusCode = 400;
        throw err;
    }

    const cleanToken = String(token || '').trim();
    if (!cleanToken || cleanToken.length !== 6) {
        throw new Error('Please enter a valid 6-digit verification code');
    }

    const pendingData = await redisClient.get(`pending_2fa_setup:${accountId}`);
    if (!pendingData) {
        throw new Error('2FA setup session has expired. Please initiate setup again.');
    }
    const { secret, recoveryCodes } = JSON.parse(pendingData);

    const check = await verify({ token: cleanToken, secret, epochTolerance: 30 });
    if (!check?.valid) {
        throw new Error('Invalid verification code. Please check your authenticator app and try again.');
    }

    // Persist secret and 8 recovery codes
    await createAuthenticationSecret(accountId, secret);
    await createAuthenticationRecoveryCodes(accountId, recoveryCodes);
    await redisClient.del(`pending_2fa_setup:${accountId}`).catch(() => null);

    return {
        success: true,
        message: 'Two-factor authentication enabled successfully.',
        recoveryCodes,
    };
}

async function get2FAStatusService(accountId) {
    if (!accountId) throw new Error('Account ID is required');
    const hasPassword = await checkAccountHasPassword(accountId);
    const secret = await getAuthenticationSecret(accountId);
    if (!secret) {
        return { enabled: false, recoveryCodesCount: 0, hasPassword };
    }
    const recoveryCodes = await getAuthenticationRecoveryCodes(accountId);
    return {
        enabled: true,
        recoveryCodesCount: recoveryCodes.length,
        hasPassword,
    };
}

async function disable2FAService(accountId, verificationCode) {
    if (!accountId) throw new Error('Account ID is required');
    const secret = await getAuthenticationSecret(accountId);
    if (!secret) {
        throw new Error('Two-factor authentication is not currently enabled.');
    }

    const cleanCode = String(verificationCode || '').trim();
    if (!cleanCode) {
        throw new Error('Verification code or recovery code is required to disable 2FA.');
    }

    let isValid = false;
    if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
        const check = await verify({ token: cleanCode, secret, epochTolerance: 30 });
        if (check?.valid) isValid = true;
    }
    if (!isValid) {
        // Try recovery code
        const recoveryValid = await verifyAuthenticationRecoveryCode(accountId, cleanCode);
        if (recoveryValid) isValid = true;
    }

    if (!isValid) {
        throw new Error('Invalid verification code or recovery code. Cannot disable 2FA.');
    }

    // Delete secret and all 8 recovery codes upon disabling per requirement
    await deleteAuthenticationSecret(accountId);
    await deleteAuthenticationRecoveryCodes(accountId);
    await redisClient.del(`pending_2fa_setup:${accountId}`).catch(() => null);

    return {
        success: true,
        message: 'Two-factor authentication disabled and all recovery codes removed.',
    };
}

async function regenerateRecoveryCodesService(accountId, token) {
    if (!accountId) throw new Error('Account ID is required');
    const secret = await getAuthenticationSecret(accountId);
    if (!secret) {
        throw new Error('Two-factor authentication is not enabled.');
    }
    const cleanToken = String(token || '').trim();
    if (!cleanToken) {
        throw new Error('Current 6-digit authenticator code is required to regenerate recovery codes.');
    }
    const check = await verify({ token: cleanToken, secret, epochTolerance: 30 });
    if (!check?.valid) {
        throw new Error('Invalid verification code.');
    }

    const newCodes = generateRecoveryCodes(8);
    await createAuthenticationRecoveryCodes(accountId, newCodes);
    return {
        success: true,
        recoveryCodes: newCodes,
    };
}

async function verify2FACodeOrRecoveryService(accountId, code) {
    if (!accountId) return { verified: false, error: 'Account ID is required' };
    const secret = await getAuthenticationSecret(accountId);
    if (!secret) return { verified: false, error: 'Two-factor authentication is not enabled for this account' };

    const cleanCode = String(code || '').trim();
    if (!cleanCode) return { verified: false, error: 'Code is required' };

    // 1. Check if it's a 6-digit TOTP code
    if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
        const check = await verify({ token: cleanCode, secret, epochTolerance: 30 });
        if (check?.valid) {
            return { verified: true, type: 'totp' };
        }
    }

    // 2. Check if it's an active recovery code
    const isRecoveryValid = await verifyAuthenticationRecoveryCode(accountId, cleanCode);
    if (isRecoveryValid) {
        return { verified: true, type: 'recovery_code' };
    }

    return { verified: false, error: 'Invalid two-factor authentication code or recovery code' };
}
