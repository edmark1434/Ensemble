const {
    getAllSurveysRepositoriesBySurveyName,
    insertSurveyRepositories,
    insertUserPlatformPurposeRepositories
    
} = require('../Repositories/SurveyRepositories');

const { pool } = require('../lib/database');
async function getAllSurveysServiceBySurveyName(surveyName) {
    try {
        const surveys = await getAllSurveysRepositoriesBySurveyName(surveyName);
        return surveys;
    }catch (err) {
        console.error(`Error fetching surveys by name ${surveyName}:`, err);
        throw err;
    }
}

async function insertSurveyService(userId, surveyData) {
    // Start a transaction
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Validate input
        if (!userId || !surveyData || !Array.isArray(surveyData.responses) || surveyData.responses.length === 0) {
            throw new Error("Invalid input data for inserting survey");
        }
        if (!surveyData.survey_id) {
            throw new Error("Survey ID is required for inserting survey");
        }

        // Extract purposes from responses
        const purposeMap = {
            "Explore / Learn": "Casual",
            "Look for Service / Hire": "Client",
            "Earn / Find Work": "Freelancer"
        };

        // Get unique purposes from responses
        const purposes = surveyData.responses
            .filter(item => item.question_text === 'What is your purpose on the platform?')
            .map(item => purposeMap[item.option_text])
            .filter(purpose => purpose !== undefined);

        // Remove duplicates using Set
        const uniquePurposes = [...new Set(purposes)];

        // Insert each purpose (with duplicate prevention)
        for (const purpose of uniquePurposes) {
            await insertUserPlatformPurposeRepositories(client, userId, purpose);
        }

        // Format survey data for insertion
        const formattedSurveyData = surveyData.responses
            .filter(item => item.question_id && item.option_id) // Only include valid responses
            .map(item => ({
                question_id: item.question_id,
                option_id: item.option_id,
                response_text: item.response_text || null
            }));

        if (formattedSurveyData.length === 0) {
            throw new Error("No valid survey responses to insert");
        }

        // Insert survey responses
        const result = await insertSurveyRepositories(client, userId, surveyData.survey_id, formattedSurveyData);

        // Commit transaction
        await client.query('COMMIT');
        
        return {
            success: true,
            message: "Survey submitted successfully",
            data: result,
            purposes: uniquePurposes
        };
        
    } catch (err) {
        // Rollback on error
        await client.query('ROLLBACK');
        console.error("Error inserting survey:", err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    getAllSurveysServiceBySurveyName,
    insertSurveyService
};