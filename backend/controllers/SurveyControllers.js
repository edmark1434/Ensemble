const { 
    getAllSurveysServiceBySurveyName,
    insertSurveyService
} = require('../services/SurveyServices');


async function getAllSurveysControllerBySurveyName(req, res) {
    const { surveyName } = req.params;
    try {
        const surveys = await getAllSurveysServiceBySurveyName(surveyName);
        res.status(200).json(surveys);
    } catch (err) {
        console.error(`Error fetching surveys by name ${surveyName}:`, err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function insertSurveyController(req, res) {
    const userId = req.session.userId; // Assuming userId is stored in session
    const surveyData = req.body;
    
    try {
        const result = await insertSurveyService(userId, surveyData);
        res.status(201).json(result);
    } catch (err) {
        console.error("Error inserting survey:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

module.exports = {
    getAllSurveysControllerBySurveyName,
    insertSurveyController
};
