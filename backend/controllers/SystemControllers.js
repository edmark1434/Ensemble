const {
    getAllCountries,
    getAllPlaces
} = require('../services/SystemServices');


async function getAllCountriesController(req, res) {
    try {
        const countries = await getAllCountries();
        return res.status(200).json({
            success: true,
            countries,
        });
    } catch (err) {
        console.error('Error fetching countries:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
}

async function getAllPlacesController(req, res) { 
    try {
        const query = req.query.q?.trim();
        if (!query) {
            return res.status(200).json({
                success: true,
                places: [],
            })
        }
        const places = await getAllPlaces(query);
        return res.status(200).json({
            success: true,
            places,
        });
    }catch (err) {
        console.error('Error fetching places:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }

}

module.exports = {
    getAllCountriesController,
    getAllPlacesController
};