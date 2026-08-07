const { pool } = require('../lib/Database');

async function getAllSurveysRepositoriesBySurveyName(surveyName) { 
    try {
        const query = `
            SELECT 
                JSON_BUILD_OBJECT(
                    'survey_id', S.SURVEY_ID,
                    'survey_name', S.SURVEY_NAME,
                    'description', S.DESCRIPTION,
                    'questions', COALESCE(
                        (SELECT JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'question_id', Q.QUESTION_ID,
                                'question_text', Q.QUESTION_TEXT,
                                'question_type', Q.QUESTION_TYPE,
                                'is_required', Q.IS_REQUIRED,
                                'display_order', Q.DISPLAY_ORDER,
                                'options', COALESCE(
                                    (SELECT JSON_AGG(
                                        JSON_BUILD_OBJECT(
                                            'option_id', O.OPTION_ID,
                                            'option_text', O.OPTION_TEXT,
                                            'option_value', O.OPTION_VALUE,
                                            'display_order', O.DISPLAY_ORDER
                                        )
                                        ORDER BY O.DISPLAY_ORDER
                                    )
                                    FROM QUESTION_OPTIONS O
                                    WHERE O.QUESTION_ID = Q.QUESTION_ID
                                    ), '[]'::JSON
                                )
                            )
                            ORDER BY Q.DISPLAY_ORDER
                        )
                        FROM QUESTIONS Q
                        WHERE Q.SURVEY_ID = S.SURVEY_ID
                        ), '[]'::JSON
                    )
                ) AS survey_data
            FROM SURVEYS S
            WHERE S.SURVEY_NAME = $1;
        `;
        
        const result = await pool.query(query, [surveyName]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0].survey_data;
        
    } catch (err) {
        console.error(`Error fetching survey by name ${surveyName}:`, err);
        throw err;
    }
}

// ==============================
// REPOSITORIES (Data Access Layer)
// ==============================

async function insertSurveyRepositories(client, userId, surveyId, surveyData) {
    try {
        if (!client) {
            // Fallback to pool if no client provided (for backward compatibility)
            const poolClient = await pool.connect();
            try {
                return await insertSurveyRepositories(poolClient, userId, surveyId, surveyData);
            } finally {
                poolClient.release();
            }
        }

        const values = [];
        const placeholders = surveyData.map((item, index) => {
            const offset = index * 5;
            values.push(
                userId,
                surveyId,
                item.question_id,
                item.option_id,
                item.response_text
            );
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
        });

        const query = `
            INSERT INTO USER_SURVEY_RESPONSES
                (user_id, survey_id, question_id, option_id, response_text)
            VALUES
                ${placeholders.join(", ")}
            RETURNING response_id;
        `;

        const result = await client.query(query, values);
        return result.rows;
        
    } catch (err) {
        console.error("Error inserting survey responses:", err);
        throw err;
    }
}

async function insertUserPlatformPurposeRepositories(client, userId, purposeName) {
    try {
        if (!client) {
            // Fallback to pool if no client provided
            const poolClient = await pool.connect();
            try {
                return await insertUserPlatformPurposeRepositories(poolClient, userId, purposeName);
            } finally {
                poolClient.release();
            }
        }

        // First check if purpose exists
        const checkResult = await client.query(
            `SELECT user_plpu_id FROM user_platform_purpose
             WHERE user_id = $1 AND plpu_id = (
                 SELECT plpu_id FROM platform_purpose WHERE purpose_name = $2
             )`,
            [userId, purposeName]
        );

        // If already exists, return existing record
        if (checkResult.rows.length > 0) {
            console.log(`Purpose "${purposeName}" already exists for user ${userId}`);
            return checkResult.rows[0];
        }

        // Insert new purpose
        const result = await client.query(
            `INSERT INTO user_platform_purpose (user_id, plpu_id) 
             VALUES (
                 $1, 
                 (SELECT plpu_id FROM platform_purpose WHERE purpose_name = $2)
             )
             RETURNING user_plpu_id`,
            [userId, purposeName]
        );

        return result.rows[0];
        
    } catch (err) {
        console.error("Error inserting user platform purpose:", err);
        throw err;
    }
}

// ==============================
// SERVICES (Business Logic Layer)
// ==============================



// ==============================
// EXPORTS
// ==============================
module.exports = {
    getAllSurveysRepositoriesBySurveyName,
    insertSurveyRepositories,
    insertUserPlatformPurposeRepositories
};
