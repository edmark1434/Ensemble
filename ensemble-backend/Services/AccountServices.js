const { getAllAccounts } = require("../Repositories/AccountRepositories");

async function fetchAllAccounts() {
    try {
        const accounts = await getAllAccounts();
        return accounts;
    } catch (err) {
        console.error('Error fetching accounts:', err);
        throw err;
    }
}

module.exports = {
    fetchAllAccounts,
};