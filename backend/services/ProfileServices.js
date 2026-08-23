const {
    getProfileReviewsByAccountId,
    updateProfileAccountRepositories,
    updateTaglineAndDescriptionRepositories: updateTaglineAndDescription,
    getPersonalDetails,
    updateProfileUserRepositories,
    updateProfileUserByAccountIdRepositories,
    getProfileByAccountId,
    updateProfileSocialMediaRepositories,
    deleteProfileSocialMediaRepositories,
    insertProfileSocialMediaRepositories,
    getProfileAvatarsByAccountId,
    getProfileCurrentAvatarByAccountId,
    updateUserRolesByAccountIdRepositories
} = require('../repositories/ProfileRepositories');
const { getAccountLinkByAccountIdService } = require('../services/AccountServices');
const {getUserByIdFromAccountId} = require('../repositories/UserRepositories');
const {checkAccountId, getAccountBadges} = require('../repositories/AccountRepositories');
const redisClient = require('../lib/Redis');



async function updateTaglineAndDescriptionServices(accountId, tagline, description) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    const isExist = await checkAccountId(accountId);
    if (!isExist) {
        throw new Error('Invalid account ID');
    }
    try {
        const response = await updateTaglineAndDescription(accountId, tagline, description);
        return response;
    } catch (err) {
        console.error(`Error updating tagline and description for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getPersonalDetailsServices(userId) {
    if (!userId) {
        throw new Error('User ID is required');
    }
    try {
        const response = await getPersonalDetails(userId);
        return response;
    } catch (err) {
        console.error(`Error fetching personal details for userId ${userId}:`, err);
        throw err;
    }
}

async function updateProfileDetailsServices(accountId, originalUpdates, updates) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    if (!await checkAccountId(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        console.log("📊 Original Updates:", originalUpdates);
        console.log("📊 New Updates:", updates);
        
        const accountUpdates = {};
        const userUpdates = {};
        let hasChanges = false;

        // Check account fields
        if (updates.tagline !== undefined && updates.tagline !== originalUpdates.tagline) {
            accountUpdates.tagline = updates.tagline;
            hasChanges = true;
        }
        
        if (updates.description !== undefined && updates.description !== originalUpdates.description) {
            accountUpdates.description = updates.description;
            hasChanges = true;
        }
        
        if (updates.display_name !== undefined && updates.display_name !== originalUpdates.display_name) {
            accountUpdates.display_name = updates.display_name;
            hasChanges = true;
        }

        if (updates.introduction !== undefined && updates.introduction !== originalUpdates.introduction) {
            accountUpdates.introduction = updates.introduction;
            hasChanges = true;
        }
        
        // Check user fields
        if (updates.country !== undefined && updates.country !== originalUpdates.country) {
            userUpdates.country = updates.country;
            hasChanges = true;
        }
        
        if (updates.zip_code !== undefined && updates.zip_code !== originalUpdates.zip_code) {
            userUpdates.zip_code = updates.zip_code;
            hasChanges = true;
        }
        
        if (updates.address !== undefined && updates.address !== originalUpdates.address) {
            userUpdates.address = updates.address;
            hasChanges = true;
        }
        
        if (updates.birth_date !== undefined && updates.birth_date !== originalUpdates.birth_date) {
            userUpdates.birth_date = updates.birth_date;
            hasChanges = true;
        }

        let rolesResult = null;
        if (updates.roles !== undefined) {
            // Check if roles have changed
            const originalRoles = originalUpdates.roles || [];
            const newRoles = updates.roles;
            const originalRoleNames = originalRoles.map(r => r.role_name || r).sort().join(',');
            const newRoleNames = newRoles.sort().join(',');
            
            if (originalRoleNames !== newRoleNames) {
                rolesResult = await updateUserRolesByAccountIdRepositories(accountId, newRoles);
                hasChanges = true;
            }
        }

        // If no changes, return early
        if (!hasChanges) {
            return {
                hasChanged: false,
                updatedDetails: null,
                message: 'No changes detected'
            };
        }

        // Execute updates
        let accountResult = null;
        let userResult = null;
        
        if (Object.keys(accountUpdates).length > 0) {
            accountResult = await updateProfileAccountRepositories(accountId, accountUpdates);
        }
        
        if (Object.keys(userUpdates).length > 0) {
            userResult = await updateProfileUserByAccountIdRepositories(accountId, userUpdates);
        }

        // Combine results
        const combinedDetails = {
            ...(accountResult?.rows?.[0] || {}),
            ...(userResult?.rows?.[0] || {})
        };

        // If both queries returned results, merge them
        // If only one query ran, use its result
        let finalDetails = combinedDetails;
        if (accountResult?.rows?.[0] && !userResult?.rows?.[0]) {
            finalDetails = accountResult.rows[0];
        } else if (userResult?.rows?.[0] && !accountResult?.rows?.[0]) {
            finalDetails = userResult.rows[0];
        }

        return {
            hasChanged: hasChanges,
            updatedDetails: finalDetails
        };
        
    } catch (err) {
        console.error(`Error updating profile details for accountId ${accountId}:`, err);
        throw err;
    }
}


async function updateProfileUserServices(userId, originalForm, updates) {
    if (!userId) {
        throw new Error('User ID is required');
    }
    
    const newPayload = checkChanges(originalForm, updates);
    if (Object.keys(newPayload).length === 0) { 
        return null; // No changes to apply
    }
    try {
        const response = await updateProfileUserRepositories(userId, newPayload);
        return response;
    } catch (err) {
        console.error(`Error updating user profile for userId ${userId}:`, err);
        throw err;
    }
}

async function updateProfileOnboarding(userId, completed_onboarding) {
    if (!userId) {
        throw new Error('User ID is required');
    }
    try {
        await updateProfileUserRepositories(userId,  completed_onboarding );
    } catch (err) {
        console.error(`Error updating onboarding data for userId ${userId}:`, err);
        throw err;
    }
}

function checkChanges(originalForm, updates) {
    // Validate inputs
    if (!originalForm || !updates) {
        throw new Error('Both originalForm and updates are required to check for changes');
    }
    
    if (Object.keys(updates).length === 0) { 
        throw new Error('No updates to apply');
    }
    
    // ✅ Helper function to normalize values for comparison
    const normalizeValue = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value.trim();
        return String(value).trim();
    };
    
    // ✅ Return payload with snake_case keys for database
    let newPayload = {};
    
    // Check each field for changes
    if (updates.middleName !== undefined) {
        const updateValue = normalizeValue(updates.middleName);
        const originalValue = normalizeValue(originalForm.middleName);
        if (updateValue !== originalValue) {
            newPayload.middle_name = updates.middleName; // ✅ snake_case
        }
    }
    
    if (updates.suffix !== undefined) {
        const updateValue = normalizeValue(updates.suffix);
        const originalValue = normalizeValue(originalForm.suffix);
        if (updateValue !== originalValue) {
            newPayload.suffix = updates.suffix; // ✅ already snake_case
        }
    }
    
    if (updates.birthDate !== undefined) {
        const updateValue = normalizeValue(updates.birthDate);
        const originalValue = normalizeValue(originalForm.birthDate);
        if (updateValue !== originalValue) {
            newPayload.birth_date = updates.birthDate; // ✅ snake_case
        }
    }
    
    if (updates.country !== undefined && updates.country !== null && updates.country !== "") {
        const updateValue = normalizeValue(updates.country);
        const originalValue = normalizeValue(originalForm.country);
        if (updateValue !== originalValue) {
            newPayload.country = updates.country; // ✅ already snake_case
        }
    }
    
    if (updates.zipCode !== undefined && updates.zipCode !== null && updates.zipCode !== "") {
        const updateValue = normalizeValue(updates.zipCode);
        const originalValue = normalizeValue(originalForm.zipCode);
        if (updateValue !== originalValue) {
            newPayload.zip_code = updates.zipCode; // ✅ snake_case
        }
    }
    
    if (updates.address !== undefined && updates.address !== null && updates.address !== "") {
        const updateValue = normalizeValue(updates.address);
        const originalValue = normalizeValue(originalForm.address);
        if (updateValue !== originalValue) {
            newPayload.address = updates.address; // ✅ already snake_case
        }
    }
    
    console.log("📊 Changes detected (snake_case):", newPayload);
    return newPayload;
}

async function getProfileByAccountIdService(accountId) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    if (!await checkAccountId(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const profile = await getProfileByAccountId(accountId);
        if (profile) {
            const badges = await getAccountBadges(accountId);
            profile.badges = badges.map(b => ({
                id: b.registry_id,
                display_order: b.display_order
            }));
        }
        return profile;
    } catch (err) {
        console.error(`Error fetching profile for accountId ${accountId}:`, err);
        throw err;
    }
}

async function profileSocialMediaUpdateService(accountId,original, listOfSocialMedia) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    if (!await checkAccountId(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const originalLinks = original || [];
        const newLinks = listOfSocialMedia || [];

        const linksToDelete = originalLinks.filter(originalLink => !newLinks.some(newLink => newLink.account_link_id === originalLink.account_link_id)).map(link => link.account_link_id);
        const linksToUpdate = newLinks.filter(newLink => originalLinks.some(originalLink => originalLink.account_link_id === newLink.account_link_id && (originalLink.platform !== newLink.platform || originalLink.url !== newLink.url)));
        const linksToInsert = newLinks.filter(newLink => !originalLinks.some(originalLink => originalLink.account_link_id === newLink.account_link_id));
        let hasChanges = false;
        if (linksToDelete.length > 0 || linksToUpdate.length > 0 || linksToInsert.length > 0) {
            hasChanges = true;
        }
        if (linksToDelete.length > 0) {
            await deleteProfileSocialMediaRepositories(accountId, linksToDelete);
        }else if (linksToUpdate.length > 0) {
            await updateProfileSocialMediaRepositories(accountId, linksToUpdate);
        }
        if (linksToInsert.length > 0) {
            await insertProfileSocialMediaRepositories(accountId, linksToInsert);
        }
        const updatedLink = await getAccountLinkByAccountIdService(accountId);
        return {
            hasChanged: hasChanges,
            updatedLinks: updatedLink
        };
    }catch (err) {
        console.error(`Error updating profile social media for accountId ${accountId}:`, err);
        throw err;
    }   
}

async function getProfileAvatarsByAccountIdService(accountId) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    if (!await checkAccountId(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const avatars = await getProfileAvatarsByAccountId(accountId);
        return avatars;
    } catch (err) {
        console.error(`Error fetching profile avatars for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getProfileCurrentAvatarByAccountIdService(accountId) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    console.log('Fetching current profile avatar for accountId:', accountId);
    if (!await checkAccountId(accountId)) {
        throw new Error('Invalid account ID');
    }
    try {
        const currentAvatar = await getProfileCurrentAvatarByAccountId(accountId);
        return currentAvatar;
    }
    catch (err) {
        console.error(`Error fetching current profile avatar for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getProfileReviewsByAccountIdService(accountId) {
    if (!accountId) {
        throw new Error('Account ID is required');
    }
    try {
        return await getProfileReviewsByAccountId(accountId);
    } catch (err) {
        console.error(`Error fetching reviews for accountId ${accountId}:`, err);
        throw err;
    }
}

module.exports = {
    getProfileReviewsByAccountIdService,
    updateTaglineAndDescriptionServices,
    getPersonalDetailsServices,
    updateProfileUserServices,
    updateProfileOnboarding,
    getProfileByAccountIdService,
    profileSocialMediaUpdateService,
    updateProfileDetailsServices,
    getProfileAvatarsByAccountIdService,
    getProfileCurrentAvatarByAccountIdService
};
