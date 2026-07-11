const axios = require('axios');
const redisClient = require('../lib/redis');



async function getAllCountries() {
    if(await redisClient.exists('countries')) {
        const cachedCountries = await redisClient.get('countries');
        return JSON.parse(cachedCountries);
    }
    const response = await axios.get("https://countriesnow.space/api/v0.1/countries");
    console.log("Fetched countries:", response.data);
    const countries = response.data.data.map(country => country.country);
    await redisClient.set('countries', JSON.stringify(countries), { EX: 60 * 60 * 24 * 30 }); // Cache for 30 days
    return countries;
}

async function getAllPlaces(query) { 
    try {
        const cachedKey = `places:${query}`;
        if(await redisClient.exists(cachedKey)) {
            const cachedPlaces = await redisClient.get(cachedKey);
            return JSON.parse(cachedPlaces);
        }

        const response = await axios.get("https://photon.komoot.io/api/", { params: { q: query, limit: 5 } });
        await redisClient.set(cachedKey, JSON.stringify(response.data.features), { EX: 60 * 60 * 24 * 30 }); // Cache for 30 days
        return response.data.features;
    }catch (err) {
        console.error('Error fetching places:', err);
        throw new ServiceError('Failed to fetch places', 500, err);
    }
}

module.exports = {
    getAllCountries,
    getAllPlaces
}