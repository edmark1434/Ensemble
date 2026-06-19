const {
    updateProfileAccountRepositories,
    insertProfileSkillsRepositories: insertProfileSkills,
    deleteProfileSkillsRepositories: deleteProfileSkills,
    insertProfileSocialMediaRepositories: insertProfileSocialMedia,
    deleteProfileSocialMediaRepositories: deleteProfileSocialMedia,
    updateProfileSocialMediaRepositories: updateProfileSocialMedia
} = require('../Repositories/ProfileRepositories');
const {getUserByIdFromAccountId} = require('../Repositories/UserRepositories');
const {checkAccountId} = require('../Repositories/AccountRepositories');

async function updateProfileAccountServices(accountId, payload) {
    const profileUpdates = {}
    const promiseArray = [];

    if (!accountId) {
        throw new Error('Account ID is required');
    }
    const isExist = await checkAccountId(accountId);
    if (!isExist) {
        throw new Error('Invalid account ID');
    }

    // ============================================
    // VALIDATION: Check if anything actually changed
    // ============================================
    let hasChanges = false;

    // Check bio change
    if (payload.bio !== undefined) {
        if (payload.originalBio !== undefined && payload.bio === payload.originalBio) {
            delete payload.bio;
        } else if (payload.bio !== '' && payload.bio !== payload.originalBio) {
            hasChanges = true;
        }
    }

    // Check tagline change
    if (payload.tagline !== undefined) {
        if (payload.originalTagline !== undefined && payload.tagline === payload.originalTagline) {
            delete payload.tagline;
        } else if (payload.tagline !== '' && payload.tagline !== payload.originalTagline) {
            hasChanges = true;
        }
    }

    // Check avatar change
    if (payload.avatarFileId !== undefined) {
        if (payload.originalAvatarFileId !== undefined && payload.avatarFileId === payload.originalAvatarFileId) {
            delete payload.avatarFileId;
        } else if (payload.avatarFileId !== null && payload.avatarFileId !== payload.originalAvatarFileId) {
            hasChanges = true;
        }
    }

    // Check skills change
    if (payload.skills !== undefined) {
        const originalSkills = payload.originalSkills || [];
        const skillsChanged = JSON.stringify(payload.skills) !== JSON.stringify(originalSkills);
        if (!skillsChanged) {
            delete payload.skills;
            delete payload.originalSkills;
        } else {
            hasChanges = true;
        }
    }

    // Check badges change
    if (payload.badges !== undefined) {
        const originalBadges = payload.originalBadges || [];
        const badgesChanged = JSON.stringify(payload.badges) !== JSON.stringify(originalBadges);
        if (!badgesChanged) {
            delete payload.badges;
            delete payload.originalBadges;
        } else {
            hasChanges = true;
        }
    }

    // Check social links change
    if (payload.social_links !== undefined) {
        const originalSocialMedia = payload.originalSocialMedia || [];
        const socialLinksChanged = JSON.stringify(payload.social_links) !== JSON.stringify(originalSocialMedia);
        if (!socialLinksChanged) {
            delete payload.social_links;
            delete payload.originalSocialMedia;
        } else {
            hasChanges = true;
        }
    }

    // If no changes, return early
    if (!hasChanges && Object.keys(profileUpdates).length === 0) {
        return { 
            success: true, 
            message: 'No changes detected',
            data: null
        };
    }

    // ============================================
    // URL VALIDATION for social links (Improved)
    // ============================================
    if (payload.social_links && payload.social_links.length > 0) {
        for (const link of payload.social_links) {
            if (!link.url) {
                throw new Error(`URL is required for ${link.platform || 'social link'}`);
            }

            // Clean the URL: trim whitespace
            let url = link.url.trim();

            // Add protocol if missing
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = `https://${url}`;
            }

            // Validate URL using URL constructor
            try {
                const parsedUrl = new URL(url);
                
                // Get hostname and remove www. prefix for validation
                let hostname = parsedUrl.hostname.toLowerCase();
                
                // Check if hostname is valid (not empty)
                if (!hostname || hostname === '') {
                    throw new Error('Invalid domain');
                }

                // Check if hostname has at least one dot (valid domain)
                if (!hostname.includes('.')) {
                    throw new Error('Invalid domain format');
                }

                // Check if it's a valid domain (allows www. or without)
                const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
                const domainWithoutWww = hostname.replace(/^www\./, '');
                
                if (!domainPattern.test(domainWithoutWww)) {
                    throw new Error('Invalid domain format');
                }

                // Store the normalized URL back
                link.url = url;

            } catch (err) {
                throw new Error(`Invalid URL for ${link.platform || 'social link'}: ${link.url} - ${err.message}`);
            }
        }
    }

    // ============================================
    // Process profile updates
    // ============================================
    if (payload.bio && payload.bio !== '') {
        profileUpdates.description = payload.bio;
    }
    if (payload.tagline && payload.tagline !== '') {
        profileUpdates.tagline = payload.tagline;
    }
    if (payload.avatarFileId) {
        profileUpdates.avatar_file_id = payload.avatarFileId;
    }

    if (Object.keys(profileUpdates).length > 0) {
        promiseArray.push(updateProfileAccountRepositories(accountId, profileUpdates));
    }

    // ============================================
    // Process skills
    // ============================================
    if (payload.skills) {
        const originalSkills = payload.originalSkills || [];
        const userTagInsert = payload.skills.filter(skill => 
            !originalSkills.map(s => s.tag_id).includes(skill.tag_id)
        );
        const userTagDelete = originalSkills.filter(skill => 
            !payload.skills.map(s => s.tag_id).includes(skill.tag_id)
        );
        
        const user = await getUserByIdFromAccountId(accountId);
        const userId = user.user_id;
        
        if (userTagInsert.length > 0) {
            promiseArray.push(insertProfileSkills(userId, userTagInsert));
        }
        if (userTagDelete.length > 0) {
            promiseArray.push(deleteProfileSkills(userId, userTagDelete));
        }
    }

    // ============================================
    // Process social links
    // ============================================
    if (payload.social_links) {
        const originalSocialMedia = payload.originalSocialMedia || [];
        
        // 1. Find links that need to be updated (existing links with changed URL)
        const socialMediaUpdate = [];
        const socialMediaInsert = [];
        const socialMediaDelete = [];

        // Check each link in the new list
        for (const newLink of payload.social_links) {
            if (newLink.account_link_id) {
                // This is an existing link - check if URL changed
                const originalLink = originalSocialMedia.find(
                    old => old.account_link_id === newLink.account_link_id
                );
                
                if (originalLink && originalLink.url !== newLink.url) {
                    // URL changed - needs update
                    socialMediaUpdate.push({
                        account_link_id: newLink.account_link_id,
                        url: newLink.url,
                        platform: newLink.platform
                    });
                } else if (!originalLink) {
                    // This shouldn't happen, but if it does, treat as insert
                    socialMediaInsert.push(newLink);
                }
            } else {
                // New link without account_link_id - needs insert
                socialMediaInsert.push(newLink);
            }
        }

        // Find links that were deleted (in original but not in new)
        for (const originalLink of originalSocialMedia) {
            if (originalLink.account_link_id) {
                const stillExists = payload.social_links.some(
                    newLink => newLink.account_link_id === originalLink.account_link_id
                );
                if (!stillExists) {
                    socialMediaDelete.push(originalLink);
                }
            }
        }

        // Execute all operations
        if (socialMediaUpdate.length > 0) {
            promiseArray.push(updateProfileSocialMedia(accountId, socialMediaUpdate));
        }
        if (socialMediaInsert.length > 0) {
            promiseArray.push(insertProfileSocialMedia(accountId, socialMediaInsert));
        }
        if (socialMediaDelete.length > 0) {
            promiseArray.push(deleteProfileSocialMedia(accountId, socialMediaDelete));
        }
    }

    const response = await Promise.all(promiseArray);
    return {
        success: true,
        message: 'Profile updated successfully',
        data: response
    };
}

module.exports = {
    updateProfileAccountServices
};