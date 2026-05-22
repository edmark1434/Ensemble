const client = require('../lib/database');


async function createStaff({
    firebaseStaffUuid,
    firstName,
    lastName,
    role = 'Admin',
    emailAddress,
    passwordHash,
    accountId = null,
}){
    try{
        await client.query(
            "INSERT INTO staff (firebase_staff_uuid, first_name, last_name, role, email_address, password_hash, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [firebaseStaffUuid, firstName, lastName, role, emailAddress, passwordHash, accountId]
        );
    }catch(err){
        console.error('Error creating staff:', err);
        throw err;
    }
}

async function getStaffByEmail(email){
    try{
        const result = await client.query(
            "SELECT account_id FROM staff WHERE email_address = $1",
            [email]
        );
        return result.rows[0];
    }catch(err){
        console.error('Error fetching staff by email:', err);
        throw err;
    }
}

async function getStaffByUsername(username){
    try{
        const result = await client.query(
            " SELECT  STAFF.account_id FROM STAFF JOIN ACCOUNTS ON STAFF.account_id = ACCOUNTS.account_id WHERE ACCOUNTS.handle = $1",
            [username]
        );
        return result.rows[0];
    }catch(err){
        console.error('Error fetching staff by username:', err);
        throw err;
    }
}
async function getStaffEmailAndPasswordHashByEmail(email){
    try{
        const result = await client.query(
            "SELECT STAFF.staff_id, STAFF.email_address, STAFF.password_hash, ACCOUNTS.account_id, ACCOUNTS.handle, ACCOUNTS.type, STAFF.role FROM STAFF JOIN ACCOUNTS ON STAFF.account_id = ACCOUNTS.account_id WHERE STAFF.email_address = $1",
            [email]
        );
        return result.rows[0];
    }catch(err){
        console.error('Error fetching staff email and password hash by email:', err);
        throw err;
    }
}
async function getStaffEmailAndPasswordHashByUsername(username){
    try{
        const result = await client.query(
            "SELECT STAFF.staff_id, STAFF.email_address, STAFF.password_hash, ACCOUNTS.account_id, ACCOUNTS.handle, ACCOUNTS.type, STAFF.role FROM STAFF JOIN ACCOUNTS ON STAFF.account_id = ACCOUNTS.account_id WHERE ACCOUNTS.handle = $1",
            [username]
        );
        return result.rows[0];
    }catch(err){
        console.error('Error fetching staff email and password hash by username:', err);
        throw err;
    }
}

module.exports = {
    createStaff,
    getStaffByEmail,
    getStaffByUsername,
    getStaffEmailAndPasswordHashByEmail,
    getStaffEmailAndPasswordHashByUsername
}