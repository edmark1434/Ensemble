const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('../lib/Database');
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

async function getStaffById(staffId) {
    const result = await pool.query(
        `SELECT
           s.staff_id,
           s.first_name,
           s.last_name,
           s.role,
           s.email_address,
           s.account_id,
           a.handle,
           a.display_name,
           a.status,
           a.deleted_at
         FROM staff s
         INNER JOIN accounts a ON a.account_id = s.account_id
         WHERE s.staff_id = $1`,
        [staffId]
    );
    return result.rows[0] || null;
}

/**
 * Update staff profile, role, account status, and optionally password.
 */
async function updateStaffAccount(staffId, payload = {}) {
    const existing = await getStaffById(staffId);
    if (!existing) {
        throw Object.assign(new Error('Staff account not found'), { status: 404 });
    }
    if (existing.deleted_at) {
        throw Object.assign(new Error('Staff account has been deleted'), { status: 410 });
    }

    const trimmedFirst = payload.firstName != null
        ? String(payload.firstName).trim()
        : existing.first_name;
    const trimmedLast = payload.lastName != null
        ? String(payload.lastName).trim()
        : existing.last_name;
    const email = payload.emailAddress != null || payload.email != null
        ? String(payload.emailAddress || payload.email).trim().toLowerCase()
        : existing.email_address;
    const staffRole = payload.role != null
        ? String(payload.role).trim()
        : existing.role;
    const status = payload.status != null
        ? String(payload.status).trim()
        : existing.status;
    const password = payload.password ? String(payload.password) : null;

    if (!trimmedFirst || !trimmedLast) {
        throw Object.assign(new Error('First name and last name are required'), { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw Object.assign(new Error('Invalid email format'), { status: 400 });
    }
    if (!ALLOWED_STAFF_ROLES.includes(staffRole)) {
        throw Object.assign(
            new Error(`Role must be one of: ${ALLOWED_STAFF_ROLES.join(', ')}`),
            { status: 400 }
        );
    }
    if (password && password.length < 8) {
        throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
    }

    const allowedStatuses = ['Active', 'Suspended', 'Banned', 'Locked', 'Inactive'];
    const normalizedStatus =
        allowedStatuses.find((s) => s.toLowerCase() === String(status).toLowerCase()) || 'Active';

    if (email !== existing.email_address) {
        const [userEmail, staffEmail] = await Promise.all([
            getUserByEmail(email),
            getStaffByEmail(email),
        ]);
        if (userEmail || (staffEmail && String(staffEmail.account_id) !== String(existing.account_id))) {
            throw Object.assign(new Error('Email already in use'), { status: 409 });
        }
    }

    const displayName = `${trimmedFirst} ${trimmedLast}`.trim().slice(0, 50);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE staff
             SET first_name = $1, last_name = $2, role = $3, email_address = $4
             WHERE staff_id = $5`,
            [
                trimmedFirst.slice(0, 50),
                trimmedLast.slice(0, 50),
                staffRole.slice(0, 50),
                email.slice(0, 50),
                staffId,
            ]
        );

        if (password) {
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
            await client.query(`UPDATE staff SET password_hash = $1 WHERE staff_id = $2`, [
                passwordHash,
                staffId,
            ]);
        }

        await client.query(
            `UPDATE accounts
             SET display_name = $1, status = $2
             WHERE account_id = $3`,
            [displayName, normalizedStatus, existing.account_id]
        );

        await client.query('COMMIT');

        const updated = await getStaffById(staffId);
        return {
            staffId: updated.staff_id,
            accountId: updated.account_id,
            name: `${updated.first_name} ${updated.last_name}`.trim(),
            firstName: updated.first_name,
            lastName: updated.last_name,
            email: updated.email_address,
            username: updated.handle,
            role: updated.role,
            status: updated.status,
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Soft-delete a staff account (marks account deleted; keeps staff row for FK history).
 */
async function deleteStaffAccount(staffId, actorStaffId = null) {
    const existing = await getStaffById(staffId);
    if (!existing) {
        throw Object.assign(new Error('Staff account not found'), { status: 404 });
    }
    if (existing.deleted_at) {
        throw Object.assign(new Error('Staff account is already deleted'), { status: 410 });
    }
    if (actorStaffId && String(actorStaffId) === String(staffId)) {
        throw Object.assign(new Error('You cannot delete your own staff account'), { status: 400 });
    }

    await pool.query(
        `UPDATE accounts
         SET deleted_at = NOW(), status = 'Banned'
         WHERE account_id = $1`,
        [existing.account_id]
    );

    return {
        staffId: existing.staff_id,
        accountId: existing.account_id,
        deleted: true,
    };
}

module.exports = {
    MODERATOR_ROLES,
    ALLOWED_STAFF_ROLES,
    createStaff,
    createStaffAccount,
    updateStaffAccount,
    deleteStaffAccount,
    getStaffById,
    getStaffByEmail,
    getStaffByUsername,
    getStaffEmailAndPasswordHashByEmail,
    getStaffEmailAndPasswordHashByUsername
}