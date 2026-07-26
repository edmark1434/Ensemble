const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('../lib/database');
const { getAccountByHandle } = require('./AccountRepositories');
const { getUserByEmail } = require('./UserRepositories');

const MODERATOR_ROLES = [
    'Support Moderator',
    'Marketplace Moderator',
    'Forum Moderator',
    'Jobs N Gigs Moderator',
];

const ALLOWED_STAFF_ROLES = ['Admin', ...MODERATOR_ROLES];
const SALT_ROUNDS = 10;

async function createStaff({
    firebaseStaffUuid,
    firstName,
    lastName,
    role = 'Admin',
    emailAddress,
    passwordHash,
    accountId = null,
    client = null,
}){
    const db = client || pool;
    try{
        const result = await db.query(
            `INSERT INTO staff (
                firebase_staff_uuid, first_name, last_name, role, email_address, password_hash, account_id
             ) VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING staff_id, first_name, last_name, role, email_address, account_id`,
            [firebaseStaffUuid, firstName, lastName, role, emailAddress, passwordHash, accountId]
        );
        return result.rows[0];
    }catch(err){
        console.error('Error creating staff:', err);
        throw err;
    }
}

/**
 * Create a Staff account + staff row (used by admin "Add moderator").
 */
async function createStaffAccount({
    firstName,
    lastName,
    username,
    emailAddress,
    password,
    role,
}) {
    const trimmedFirst = String(firstName || '').trim();
    const trimmedLast = String(lastName || '').trim();
    const handle = String(username || '').trim();
    const email = String(emailAddress || '').trim().toLowerCase();
    const staffRole = String(role || '').trim();

    if (!trimmedFirst || !trimmedLast) {
        throw Object.assign(new Error('First name and last name are required'), { status: 400 });
    }
    if (!email || !password) {
        throw Object.assign(new Error('Email and password are required'), { status: 400 });
    }
    if (!handle) {
        throw Object.assign(new Error('Username is required'), { status: 400 });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(handle)) {
        throw Object.assign(
            new Error('Username must be 3-20 characters and contain only letters, numbers, or underscores'),
            { status: 400 }
        );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw Object.assign(new Error('Invalid email format'), { status: 400 });
    }
    if (String(password).length < 8) {
        throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
    }
    if (!ALLOWED_STAFF_ROLES.includes(staffRole)) {
        throw Object.assign(
            new Error(`Role must be one of: ${ALLOWED_STAFF_ROLES.join(', ')}`),
            { status: 400 }
        );
    }

    const [existingHandle, existingStaffHandle, existingUserEmail, existingStaffEmail] = await Promise.all([
        getAccountByHandle(handle),
        getStaffByUsername(handle),
        getUserByEmail(email),
        getStaffByEmail(email),
    ]);

    if (existingHandle || existingStaffHandle) {
        throw Object.assign(new Error('Username already in use'), { status: 409 });
    }
    if (existingUserEmail || existingStaffEmail) {
        throw Object.assign(new Error('Email already in use'), { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const firebaseStaffUuid = crypto.randomBytes(14).toString('hex');
    const displayName = `${trimmedFirst} ${trimmedLast}`.trim();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const accountResult = await client.query(
            `INSERT INTO accounts (
                display_name, handle, type, merit_score, status, created_at
             ) VALUES ($1, $2, 'Staff', 100, 'Active', NOW())
             RETURNING account_id, handle, status, display_name, created_at`,
            [displayName.slice(0, 50), handle.slice(0, 50)]
        );
        const account = accountResult.rows[0];

        const staff = await createStaff({
            firebaseStaffUuid: firebaseStaffUuid.slice(0, 50),
            firstName: trimmedFirst.slice(0, 50),
            lastName: trimmedLast.slice(0, 50),
            role: staffRole.slice(0, 50),
            emailAddress: email.slice(0, 50),
            passwordHash,
            accountId: account.account_id,
            client,
        });

        await client.query('COMMIT');

        return {
            staffId: staff.staff_id,
            accountId: account.account_id,
            name: displayName,
            email: staff.email_address,
            username: account.handle,
            role: staff.role,
            status: account.status,
            joinedAt: account.created_at,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function getStaffByEmail(email){
    try{
        const result = await pool.query(
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
        const result = await pool.query(
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
        const result = await pool.query(
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
        const result = await pool.query(
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
    MODERATOR_ROLES,
    ALLOWED_STAFF_ROLES,
    createStaff,
    createStaffAccount,
    getStaffByEmail,
    getStaffByUsername,
    getStaffEmailAndPasswordHashByEmail,
    getStaffEmailAndPasswordHashByUsername
}