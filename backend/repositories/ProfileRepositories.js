const { pool } = require('../lib/Database');
const { getAffiliatedAccountIds } = require('./MarketplaceActorRepositories');

async function updateProfileAccountRepositories(accountId, updates) {
    try {
        // If no updates, return early
        if (!updates || Object.keys(updates).length === 0) {
            return { rows: [] };
        }

        // Build the SET clause dynamically
        const setClauses = [];
        const values = [];
        let index = 1;

        // Loop through the updates object to build the SET clause
        for (const [key, value] of Object.entries(updates)) {
            // Skip undefined or null values
            if (value === undefined || value === null) continue;
            
            // Convert camelCase to snake_case for database columns
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            setClauses.push(`${dbKey} = $${index}`);
            values.push(value);
            index++;
        }

        // If no valid updates after filtering, return early
        if (setClauses.length === 0) {
            return { rows: [] };
        }

        // Add accountId as the last parameter
        values.push(accountId);

        const queryText = `
            UPDATE accounts 
            SET ${setClauses.join(', ')} 
            WHERE account_id = $${index}
            RETURNING tagline, description, display_name, introduction
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile account for accountId ${accountId}:`, err);
        throw err;
    }
}

async function updateProfileUserByAccountIdRepositories(accountId, updates) {
    try {
        // If no updates, return early
        if (!updates || Object.keys(updates).length === 0) {
            return { rows: [] };
        }

        // Build the SET clause dynamically
        const setClauses = [];
        const values = [];
        let index = 1;

        // Loop through the updates object to build the SET clause
        for (const [key, value] of Object.entries(updates)) {
            // Skip undefined or null values
            if (value === undefined || value === null) continue;
            
            // Convert camelCase to snake_case for database columns
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            setClauses.push(`${dbKey} = $${index}`);
            values.push(value);
            index++;
        }

        // If no valid updates after filtering, return early
        if (setClauses.length === 0) {
            return { rows: [] };
        }

        // Add accountId as the last parameter
        values.push(accountId);

        const queryText = `
            UPDATE users 
            SET ${setClauses.join(', ')} 
            WHERE account_id = $${index}
            RETURNING birth_date, country, zip_code, address
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile user for accountId ${accountId}:`, err);
        throw err;
    }
}
async function updateProfileUserRepositories(userId, updates) {
    try {
        // Build the SET clause dynamically
        const setClauses = [];
        const values = [];
        let index = 1;

        // Loop through the updates object to build the SET clause
        for (const [key, value] of Object.entries(updates)) {
            // Convert camelCase to snake_case for database columns
            const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            setClauses.push(`${dbKey} = $${index}`);
            values.push(value);
            index++;
        }

        // Add userId as the last parameter
        values.push(userId);

        const queryText = `
            UPDATE users 
            SET ${setClauses.join(', ')} 
            WHERE user_id = $${index}
        `;

        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating profile account for userId ${userId}:`, err);
        throw err;
    }
}



async function insertProfileSocialMediaRepositories(accountId, listOfSocialMedia) {
    try {
        if (listOfSocialMedia.length === 0) return null;

        // Build the query for PostgreSQL bulk insert
        const values = [];
        const placeholders = [];
        let index = 1;

        listOfSocialMedia.forEach((link) => {
            // Assuming link has platform and url fields
            placeholders.push(`($${index}, $${index + 1}, $${index + 2})`);
            values.push(accountId, link.platform, link.url);
            index += 3;
        });

        const queryText = `INSERT INTO account_link(account_id, platform, url) VALUES ${placeholders.join(', ')}`;
        
        const response = await pool.query(queryText, values);
        return response;
    } catch (err) {
        console.error(`Error inserting profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}



async function updateTaglineAndDescriptionRepositories(accountId, tagline, description) {
    try {
        const queryText = `UPDATE ACCOUNTS SET TAGLINE = $1 , DESCRIPTION = $2 WHERE ACCOUNT_ID = $3`;
        const values = [tagline, description, accountId];
        const result = await pool.query(queryText, values);
        return result;
    } catch (err) {
        console.error(`Error updating tagline and description for accountId ${accountId}:`, err);
        throw err;
    }
}

async function updateBannerPresetRepositories(accountId, bannerPreset) {
    const result = await pool.query(
        `UPDATE accounts SET banner_preset = $1 WHERE account_id = $2 RETURNING banner_preset`,
        [bannerPreset, accountId]
    );
    return result.rows[0] || null;
}

async function updateBudgetCreditsRepositories(accountId, budgetCredits) {
    const result = await pool.query(
        `UPDATE accounts SET budget_credits = $1 WHERE account_id = $2 RETURNING budget_credits`,
        [budgetCredits, accountId]
    );
    return result.rows[0] || null;
}

async function getPersonalDetails(userId) {
    try {
        const result = await pool.query('SELECT middle_name,suffix,birth_date, country, zip_code, address FROM users WHERE user_id = $1', [userId]);
        return result.rows[0];
    } catch (err) {
        console.error(`Error fetching personal details for userId ${userId}:`, err);
        throw err;
    }
}

async function getProfileByAccountId(accountId) { 
    console.log(`Fetching profile for accountId: ${accountId}`);
    try {
        // 1. Get profile data
        const profileQuery = `
            SELECT 
                A.ACCOUNT_ID as account_id,
                A.HANDLE AS username, 
                U.FIRST_NAME || ' ' || U.LAST_NAME AS name, 
                U.MIDDLE_NAME as middleName, 
                U.SUFFIX as suffix,
                A.TAGLINE as tagline,
                A.BUDGET_CREDITS as budget_credits,
                A.BANNER_PRESET as banner_preset,
                U.EMAIL_ADDRESS as email_address, 
                A.CREATED_AT AS joinedDate, 
                TO_CHAR(u.birth_date, 'YYYY-MM-DD') as birthdate, 
                U.COUNTRY as country,
                U.ZIP_CODE as zipCode,
                U.ADDRESS as location,
                A.MERIT_SCORE as merit_Score,
                A.AVATAR_FILE_ID as avatar_file_id,
                A.DESCRIPTION as bio,
                A.INTRODUCTION as introduction,
                F.PATH AS avatar_preset_url,
                P.NAME AS subscriptionType,
                U.USER_ID as user_id,
                COALESCE(V.IS_VERIFIED, FALSE) AS verification_status,
                (SELECT COUNT(*) FROM account_followers WHERE followed_id = A.ACCOUNT_ID) AS followers_count,
                (SELECT COUNT(*) FROM account_followers WHERE follower_id = A.ACCOUNT_ID) AS following_count,
                (SELECT COALESCE(AVG(stars_out_of_five), 0) FROM ratings WHERE account_id = A.ACCOUNT_ID) AS avg_rating,
                (SELECT COUNT(*) FROM ratings WHERE account_id = A.ACCOUNT_ID) AS total_reviews,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 0) 
                    FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id 
                    LEFT JOIN gig_contracts gc ON c.contract_id = gc.contract_id 
                    LEFT JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id 
                    LEFT JOIN gig_tiers tier ON req.gig_tier_id = tier.gig_tier_id 
                    LEFT JOIN gigs g ON tier.gig_id = g.gig_id 
                    LEFT JOIN job_contracts jc ON c.contract_id = jc.contract_id 
                    LEFT JOIN proposals p ON jc.proposal_id = p.proposal_id 
                    WHERE r.account_id = A.ACCOUNT_ID 
                    AND (g.freelancer_account_id = A.ACCOUNT_ID OR p.freelancer_account_id = A.ACCOUNT_ID)
                ) AS freelancer_rating,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 0) 
                    FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id 
                    LEFT JOIN gig_contracts gc ON c.contract_id = gc.contract_id 
                    LEFT JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id 
                    LEFT JOIN job_contracts jc ON c.contract_id = jc.contract_id 
                    LEFT JOIN proposals p ON jc.proposal_id = p.proposal_id 
                    LEFT JOIN jobs j ON p.job_id = j.job_id 
                    WHERE r.account_id = A.ACCOUNT_ID 
                    AND (req.client_account_id = A.ACCOUNT_ID OR j.client_account_id = A.ACCOUNT_ID)
                ) AS client_rating,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 0) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN gig_contracts gc ON c.contract_id = gc.contract_id JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id JOIN gig_tiers tier ON req.gig_tier_id = tier.gig_tier_id JOIN gigs g ON tier.gig_id = g.gig_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND g.freelancer_account_id = A.ACCOUNT_ID
                ) AS freelancer_service_rating,
                (
                    SELECT COUNT(*) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN gig_contracts gc ON c.contract_id = gc.contract_id JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id JOIN gig_tiers tier ON req.gig_tier_id = tier.gig_tier_id JOIN gigs g ON tier.gig_id = g.gig_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND g.freelancer_account_id = A.ACCOUNT_ID
                ) AS freelancer_service_count,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 0) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN job_contracts jc ON c.contract_id = jc.contract_id JOIN proposals p ON jc.proposal_id = p.proposal_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND p.freelancer_account_id = A.ACCOUNT_ID
                ) AS freelancer_job_rating,
                (
                    SELECT COUNT(*) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN job_contracts jc ON c.contract_id = jc.contract_id JOIN proposals p ON jc.proposal_id = p.proposal_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND p.freelancer_account_id = A.ACCOUNT_ID
                ) AS freelancer_job_count,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 0) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN gig_contracts gc ON c.contract_id = gc.contract_id JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND req.client_account_id = A.ACCOUNT_ID
                ) AS client_service_rating,
                (
                    SELECT COUNT(*) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN gig_contracts gc ON c.contract_id = gc.contract_id JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND req.client_account_id = A.ACCOUNT_ID
                ) AS client_service_count,
                (
                    SELECT COALESCE(AVG(r.stars_out_of_five), 0) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN job_contracts jc ON c.contract_id = jc.contract_id JOIN proposals p ON jc.proposal_id = p.proposal_id JOIN jobs j ON p.job_id = j.job_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND j.client_account_id = A.ACCOUNT_ID
                ) AS client_job_rating,
                (
                    SELECT COUNT(*) FROM ratings r 
                    JOIN contracts c ON r.contract_id = c.contract_id JOIN job_contracts jc ON c.contract_id = jc.contract_id JOIN proposals p ON jc.proposal_id = p.proposal_id JOIN jobs j ON p.job_id = j.job_id 
                    WHERE r.account_id = A.ACCOUNT_ID AND j.client_account_id = A.ACCOUNT_ID
                ) AS client_job_count,
                (
                    SELECT COALESCE(AVG(score), 0)
                    FROM (
                        SELECT r.stars_out_of_five::numeric AS score
                        FROM ratings r
                        JOIN teams t ON r.account_id = t.account_id
                        WHERE t.deleted_at IS NULL AND (
                            t.account_id = A.ACCOUNT_ID 
                            OR EXISTS (
                                SELECT 1 FROM team_members tm 
                                JOIN users u ON tm.user_id = u.user_id 
                                WHERE tm.team_id = t.team_id AND u.account_id = A.ACCOUNT_ID AND tm.status = 'Active'
                            )
                        )
                        UNION ALL
                        SELECT tr.rating::numeric AS score
                        FROM team_reviews tr
                        JOIN teams t ON tr.team_id = t.team_id
                        WHERE t.deleted_at IS NULL AND (
                            t.account_id = A.ACCOUNT_ID 
                            OR EXISTS (
                                SELECT 1 FROM team_members tm 
                                JOIN users u ON tm.user_id = u.user_id 
                                WHERE tm.team_id = t.team_id AND u.account_id = A.ACCOUNT_ID AND tm.status = 'Active'
                            )
                        )
                    ) team_scores
                ) AS team_rating,
                (
                    SELECT COUNT(*)
                    FROM (
                        SELECT r.rating_id
                        FROM ratings r
                        JOIN teams t ON r.account_id = t.account_id
                        WHERE t.deleted_at IS NULL AND (
                            t.account_id = A.ACCOUNT_ID 
                            OR EXISTS (
                                SELECT 1 FROM team_members tm 
                                JOIN users u ON tm.user_id = u.user_id 
                                WHERE tm.team_id = t.team_id AND u.account_id = A.ACCOUNT_ID AND tm.status = 'Active'
                            )
                        )
                        UNION ALL
                        SELECT tr.team_review_id AS rating_id
                        FROM team_reviews tr
                        JOIN teams t ON tr.team_id = t.team_id
                        WHERE t.deleted_at IS NULL AND (
                            t.account_id = A.ACCOUNT_ID 
                            OR EXISTS (
                                SELECT 1 FROM team_members tm 
                                JOIN users u ON tm.user_id = u.user_id 
                                WHERE tm.team_id = t.team_id AND u.account_id = A.ACCOUNT_ID AND tm.status = 'Active'
                            )
                        )
                    ) team_review_rows
                ) AS team_review_count,
                A.STATUS as status,
                A.DEACTIVATED_AT as deactivated_at,
                A.REACTIVATION_AVAILABLE_AT as reactivation_available_at
            FROM ACCOUNTS A
            JOIN USERS U ON A.ACCOUNT_ID = U.ACCOUNT_ID
            LEFT JOIN VERIFICATIONS V ON A.ACCOUNT_ID = V.ACCOUNT_ID
            LEFT JOIN FILES F ON A.AVATAR_FILE_ID = F.FILE_ID
            LEFT JOIN SUBSCRIPTIONS S ON U.USER_ID = S.USER_ID
            LEFT JOIN PLANS P ON S.PLAN_ID = P.PLAN_ID
            WHERE A.ACCOUNT_ID::text = $1 OR U.USER_ID::text = $1
        `;
        
        const profileResult = await pool.query(profileQuery, [accountId]);
        console.log(`Profile query executed for accountId: ${accountId}, rows returned: ${profileResult.rows}`);
        if (profileResult.rows.length === 0) {
            return null;
        }
        
        const profile = profileResult.rows[0];
        
        // 2. Get roles
        const rolesQuery = `
            SELECT 
                P.PLPU_ID AS "role_id",
                P.PURPOSE_NAME AS "role_name"
            FROM user_platform_purpose UP
            JOIN platform_purpose P ON UP.PLPU_ID = P.PLPU_ID
            WHERE UP.USER_ID = $1
        `;
        
        const rolesResult = await pool.query(rolesQuery, [profile.user_id]);
        profile.roles = rolesResult.rows;
        
        return profile;
    } catch (err) {
        console.error(`Error fetching profile for accountId ${accountId}:`, err);
        throw err;
    }
}

async function updateProfileSocialMediaRepositories(accountId, socialMediaUpdates) {
    try {
        if (socialMediaUpdates.length === 0) return [];

        // Build a single query with CASE statements
        let platformCases = [];
        let urlCases = [];
        const ids = [];
        let index = 1;

        for (const link of socialMediaUpdates) {
            platformCases.push(`WHEN account_link_id = $${index} THEN $${index + 1}`);
            urlCases.push(`WHEN account_link_id = $${index} THEN $${index + 2}`);
            ids.push(link.account_link_id);
            index += 3;
        }

        const queryText = `
            UPDATE account_link 
            SET 
                platform = CASE ${platformCases.join(' ')} END,
                url = CASE ${urlCases.join(' ')} END
            WHERE account_id = $${index} 
            AND account_link_id = ANY($${index + 1}::int[])
            RETURNING *
        `;

        // Prepare values: for each link, add [id, platform, url]
        const values = [];
        for (const link of socialMediaUpdates) {
            values.push(link.account_link_id, link.platform, link.url);
        }
        values.push(accountId, ids);

        const result = await pool.query(queryText, values);
        return result.rows;
    } catch (err) {
        console.error(`Error updating profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}

async function deleteProfileSocialMediaRepositories(accountId, listOfSocialMediaIds) {
    try {
        if (listOfSocialMediaIds.length === 0) return null;
        
        // Extract IDs if they're objects
        const ids = listOfSocialMediaIds.map(item => 
            typeof item === 'object' ? item.account_link_id : item
        );
        
        // Build parameterized placeholders
        const placeholders = ids.map((_, index) => `$${index + 2}`).join(', ');
        const queryText = `DELETE FROM account_link WHERE account_id = $1 AND account_link_id IN (${placeholders})`;
        const result = await pool.query(queryText, [accountId, ...ids]);
        
        return {
            success: true,
            deletedCount: result.rowCount,
            deletedIds: ids
        };
    } catch (err) {
        console.error(`Error deleting profile social media for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getProfileAvatarsByAccountId(accountId) {
    try{
        const queryText = `SELECT f.file_id,f.name, f.path from account_profile_files apf 
        JOIN files f ON apf.file_id = f.file_id WHERE account_id = $1 ORDER BY f.created_at DESC`;
        const result = await pool.query(queryText, [accountId]);
        return result.rows;
    }catch(err){
        console.error(`Error fetching profile avatars for accountId ${accountId}:`, err);
        throw err;
    }
}


async function getProfileCurrentAvatarByAccountId(accountId){
    try{
        const queryText = `SELECT f.file_id,f.name, f.path from accounts a
        JOIN files f ON a.avatar_file_id = f.file_id
        WHERE a.account_id = $1`;
        const result = await pool.query(queryText, [accountId]);
        return result.rows[0];
    }catch(err){
        console.error(`Error fetching current profile avatar for accountId ${accountId}:`, err);
        throw err;
    }
}

async function getEmailAddressByAccountId(accountId) {
    try {
        const result = await pool.query('SELECT email_address FROM users WHERE account_id = $1', [accountId]);
        return result.rows[0] || null;
    } catch (err) {
        console.error(`Error fetching email address for accountId ${accountId}:`, err);
        throw err;
    }
}

async function updateUserRolesByAccountIdRepositories(accountId, roles) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find user_id for the accountId
        const userRes = await client.query('SELECT user_id FROM users WHERE account_id = $1', [accountId]);
        if (userRes.rows.length === 0) {
            throw new Error('User not found for this account');
        }
        const userId = userRes.rows[0].user_id;

        // Delete existing roles
        await client.query('DELETE FROM user_platform_purpose WHERE user_id = $1', [userId]);

        // Insert new roles if any
        if (roles && roles.length > 0) {
            const insertQuery = `
                INSERT INTO user_platform_purpose (user_id, plpu_id)
                SELECT $1, plpu_id 
                FROM platform_purpose 
                WHERE purpose_name = ANY($2::text[])
            `;
            await client.query(insertQuery, [userId, roles]);
        }
        
        await client.query('COMMIT');
        return { success: true };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error updating roles for accountId ${accountId}:`, err);
        throw err;
    } finally {
        client.release();
    }
}

async function getProfileReviewsByAccountId(accountId) {
    try {
        const actorAccountIds = await getAffiliatedAccountIds(accountId);
        const queryText = `
            SELECT 
                r.rating_id, 
                r.stars_out_of_five, 
                r.feedback, 
                r.created_at,
                c.contract_id,
                CASE 
                    WHEN g.freelancer_account_id = ANY($1::uuid[]) OR p.freelancer_account_id = ANY($1::uuid[]) THEN 'freelancer'
                    WHEN req.client_account_id = ANY($1::uuid[]) OR j.client_account_id = ANY($1::uuid[]) THEN 'client'
                    ELSE 'unknown'
                END as role_type,
                CASE 
                    WHEN EXISTS (SELECT 1 FROM teams t WHERE t.account_id = COALESCE(g.freelancer_account_id, p.freelancer_account_id))
                         OR EXISTS (SELECT 1 FROM team_contract_workspaces tcw WHERE tcw.contract_id = c.contract_id) THEN true
                    ELSE false
                END as is_team,
                CASE 
                    WHEN (req.client_account_id = ANY($1::uuid[]) OR j.client_account_id = ANY($1::uuid[])) THEN 
                        CASE 
                            WHEN EXISTS (SELECT 1 FROM teams t WHERE t.account_id = COALESCE(g.freelancer_account_id, p.freelancer_account_id)) THEN 'Team Leader'
                            WHEN EXISTS (SELECT 1 FROM team_members tm JOIN teams t ON tm.team_id = t.team_id WHERE tm.user_id = u.user_id AND tm.role = 'Owner') THEN 'Team Leader'
                            ELSE 'Freelancer'
                        END
                    ELSE 'Client'
                END as reviewer_role,
                CASE 
                    WHEN gc.contract_id IS NOT NULL THEN 'gig'
                    WHEN jc.contract_id IS NOT NULL THEN 'job'
                    ELSE 'contract'
                END as contract_type,
                COALESCE(g.title, j.title, 'Project Contract') as project_title,
                g.gig_id,
                j.job_id,
                tier.title as tier_name,
                a.account_id as reviewer_account_id,
                a.handle as reviewer_handle,
                COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), a.display_name, a.handle, 'User') as reviewer_name,
                f.path as reviewer_avatar
            FROM ratings r
            JOIN contracts c ON r.contract_id = c.contract_id
            LEFT JOIN gig_contracts gc ON c.contract_id = gc.contract_id
            LEFT JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id
            LEFT JOIN gig_tiers tier ON req.gig_tier_id = tier.gig_tier_id
            LEFT JOIN gigs g ON tier.gig_id = g.gig_id
            LEFT JOIN job_contracts jc ON c.contract_id = jc.contract_id
            LEFT JOIN proposals p ON jc.proposal_id = p.proposal_id
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN accounts a ON a.account_id = 
                CASE 
                    WHEN g.freelancer_account_id = ANY($1::uuid[]) THEN req.client_account_id
                    WHEN p.freelancer_account_id = ANY($1::uuid[]) THEN j.client_account_id
                    WHEN req.client_account_id = ANY($1::uuid[]) THEN g.freelancer_account_id
                    WHEN j.client_account_id = ANY($1::uuid[]) THEN p.freelancer_account_id
                END
            LEFT JOIN users u ON a.account_id = u.account_id
            LEFT JOIN files f ON a.avatar_file_id = f.file_id
            WHERE r.account_id = ANY($1::uuid[])
            ORDER BY r.created_at DESC
        `;
        const result = await pool.query(queryText, [actorAccountIds]);
        return result.rows;
    } catch (err) {
        console.error("Error fetching reviews for accountId", accountId, err);
        throw err;
    }
}

async function getProfileHistoryByAccountId(accountId, viewerAccountId = null) {
    try {
        const actorAccountIds = await getAffiliatedAccountIds(accountId);
        const viewerActorAccountIds = viewerAccountId ? await getAffiliatedAccountIds(viewerAccountId) : [];
        const queryText = `
            SELECT 
                c.contract_id,
                c.status as contract_status,
                c.rate_credits,
                c.created_at,
                c.starts_at,
                c.deadline_at,
                CASE 
                    WHEN gc.contract_id IS NOT NULL THEN 'gig'
                    WHEN jc.contract_id IS NOT NULL THEN 'job'
                    ELSE 'contract'
                END as contract_type,
                COALESCE(g.title, j.title, 'Contract Project') as title,
                COALESCE(g.description, j.description) as description,
                COALESCE(g.gig_id::text, j.job_id::text) as source_id,
                g.gig_id,
                j.job_id,
                gt.title as tier_name,
                COALESCE(g.deleted_at IS NULL AND g.status ILIKE 'open', false) as is_gig_open,
                CASE 
                    WHEN g.freelancer_account_id = ANY($1::uuid[]) OR p.freelancer_account_id = ANY($1::uuid[]) THEN 'freelancer'
                    WHEN req.client_account_id = ANY($1::uuid[]) OR j.client_account_id = ANY($1::uuid[]) THEN 'client'
                    ELSE 'collaborator'
                END as account_role,
                COALESCE(req.client_account_id, j.client_account_id) as client_account_id,
                COALESCE(NULLIF(TRIM(COALESCE(client_u.first_name, '') || ' ' || COALESCE(client_u.last_name, '')), ''), client_acc.display_name, client_acc.handle, 'Client') as client_name,
                client_acc.handle as client_handle,
                client_f.path as client_avatar,
                COALESCE(g.freelancer_account_id, p.freelancer_account_id) as freelancer_account_id,
                COALESCE(NULLIF(TRIM(COALESCE(free_u.first_name, '') || ' ' || COALESCE(free_u.last_name, '')), ''), free_acc.display_name, free_acc.handle, 'Freelancer') as freelancer_name,
                free_acc.handle as freelancer_handle,
                free_f.path as freelancer_avatar,
                (
                    SELECT json_build_object('rating', r.stars_out_of_five, 'feedback', r.feedback)
                    FROM ratings r
                    WHERE r.contract_id = c.contract_id AND r.account_id = ANY($1::uuid[])
                    LIMIT 1
                ) as review_received
            FROM contracts c
            LEFT JOIN gig_contracts gc ON c.contract_id = gc.contract_id
            LEFT JOIN gig_requests req ON gc.gig_request_id = req.gig_request_id
            LEFT JOIN gig_tiers gt ON req.gig_tier_id = gt.gig_tier_id
            LEFT JOIN gigs g ON gt.gig_id = g.gig_id
            LEFT JOIN job_contracts jc ON c.contract_id = jc.contract_id
            LEFT JOIN proposals p ON jc.proposal_id = p.proposal_id
            LEFT JOIN jobs j ON p.job_id = j.job_id
            LEFT JOIN accounts client_acc ON client_acc.account_id = COALESCE(req.client_account_id, j.client_account_id)
            LEFT JOIN users client_u ON client_acc.account_id = client_u.account_id
            LEFT JOIN files client_f ON client_acc.avatar_file_id = client_f.file_id
            LEFT JOIN accounts free_acc ON free_acc.account_id = COALESCE(g.freelancer_account_id, p.freelancer_account_id)
            LEFT JOIN users free_u ON free_acc.account_id = free_u.account_id
            LEFT JOIN files free_f ON free_acc.avatar_file_id = free_f.file_id
            WHERE (
                g.freelancer_account_id = ANY($1::uuid[]) 
                OR p.freelancer_account_id = ANY($1::uuid[])
                OR req.client_account_id = ANY($1::uuid[])
                OR j.client_account_id = ANY($1::uuid[])
            )
            ORDER BY c.created_at DESC
        `;
        const result = await pool.query(queryText, [actorAccountIds]);
        return result.rows.map(row => {
            const isViewerClient = viewerActorAccountIds.length > 0 && row.client_account_id && viewerActorAccountIds.includes(row.client_account_id);
            const canReorder = Boolean(row.contract_type === 'gig' && row.is_gig_open && isViewerClient && row.gig_id);
            return {
                ...row,
                is_viewer_client: isViewerClient,
                can_reorder: canReorder,
            };
        });
    } catch (err) {
        console.error("Error fetching history for accountId", accountId, err);
        throw err;
    }
}

module.exports = {
    updateBudgetCreditsRepositories,
    updateBannerPresetRepositories,
    getProfileReviewsByAccountId,
    getProfileHistoryByAccountId,
    updateProfileAccountRepositories,
    insertProfileSocialMediaRepositories,
    updateTaglineAndDescriptionRepositories,
    getPersonalDetails,
    updateProfileUserRepositories,
    updateProfileUserByAccountIdRepositories,
    getProfileByAccountId,
    updateProfileSocialMediaRepositories,
    deleteProfileSocialMediaRepositories,
    getProfileAvatarsByAccountId,
    getProfileCurrentAvatarByAccountId,
    getEmailAddressByAccountId,
    updateUserRolesByAccountIdRepositories
};
