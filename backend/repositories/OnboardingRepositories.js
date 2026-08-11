const { pool } = require('../lib/Database');
const { insertSurveyRepositories, insertUserPlatformPurposeRepositories } = require('./SurveyRepositories');

async function getOnboardingCompletion(userId) {
    const result = await pool.query(
        'SELECT completed_onboarding FROM users WHERE user_id = $1',
        [userId]
    );
    return result.rows[0]?.completed_onboarding || null;
}

async function persistCompletedOnboarding(userId, accountId, data) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const locked = await client.query(
            'SELECT completed_onboarding FROM users WHERE user_id = $1 FOR UPDATE',
            [userId]
        );
        if (!locked.rows[0]) throw new Error('User not found.');
        if (locked.rows[0].completed_onboarding === 'completed') {
            await client.query('COMMIT');
            return { alreadyCompleted: true };
        }

        const personal = data.personal_details;
        await client.query(
            `UPDATE users SET middle_name = $1, suffix = $2, birth_date = $3,
                              country = $4, zip_code = $5, address = $6
             WHERE user_id = $7`,
            [personal.middleName || null, personal.suffix || null, personal.birthDate,
             personal.country, personal.zipCode, personal.address, userId]
        );

        const avatar = data.avatar;
        let avatarFileId;
        if (avatar.type === 'preset') {
            const preset = await client.query(
                `SELECT f.file_id FROM files f
                 JOIN system_files sf ON sf.file_id = f.file_id
                 WHERE f.file_id = $1 AND sf.category = 'profile'`,
                [avatar.fileId]
            );
            if (!preset.rows[0]) throw new Error('Selected avatar preset no longer exists.');
            avatarFileId = preset.rows[0].file_id;
        } else {
            const file = await client.query(
                `INSERT INTO files (name, path, mime_type, size_bytes)
                 VALUES ($1, $2, $3, $4) RETURNING file_id`,
                [avatar.name, avatar.path, avatar.mime_type, avatar.size_bytes]
            );
            avatarFileId = file.rows[0].file_id;
            await client.query(
                `INSERT INTO account_profile_files (account_id, file_id) VALUES ($1, $2)`,
                [accountId, avatarFileId]
            );
        }
        const accountUpdate = await client.query('UPDATE accounts SET avatar_file_id = $1 WHERE account_id = $2', [avatarFileId, accountId]);
        if (accountUpdate.rowCount !== 1) throw new Error('Account not found.');

        const survey = data.survey;
        const purposes = [...new Set(survey.responses.map((item) => item.purpose).filter(Boolean))];
        for (const purpose of purposes) {
            await insertUserPlatformPurposeRepositories(client, userId, purpose);
        }
        await insertSurveyRepositories(client, userId, survey.survey_id, survey.responses.map((item) => ({
            question_id: item.question_id,
            option_id: item.option_id,
            response_text: item.response_text || null,
        })));

        await client.query(
            `UPDATE users SET completed_onboarding = 'completed' WHERE user_id = $1`,
            [userId]
        );
        await client.query('COMMIT');
        return { alreadyCompleted: false };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function getReferencedOnboardingAvatarPaths(paths) {
    if (!Array.isArray(paths) || paths.length === 0) return new Set();
    const result = await pool.query(
        `SELECT path FROM files WHERE path = ANY($1::text[])`,
        [paths]
    );
    return new Set(result.rows.map((row) => row.path));
}

module.exports = { getOnboardingCompletion, persistCompletedOnboarding, getReferencedOnboardingAvatarPaths };
