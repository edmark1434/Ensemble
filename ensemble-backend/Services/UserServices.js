import { getAllUsers } from "../Repositories/UserRepositories";

async function fetchAllUsers() {
    try {
        const users = await getAllUsers();
        return users;
    } catch (err) {
        console.error('Error fetching users:', err);
        throw err;
    }
}

module.exports = {
    fetchAllUsers,
};