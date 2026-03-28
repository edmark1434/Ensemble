const bcrypt = require('bcrypt');
const {
    getAllUsers,
    createUser,
    getUserByEmail,
    getEmailandPasswordHashByEmail,
    getEmailandPasswordHashByUsername,
    updateFirebaseUserUuid,
} = require('../Repositories/UserRepositories');
const {
    createAccount,
    getAccountByHandle,
} = require('../Repositories/AccountRepositories');
const redisClient = require('../lib/redis');

const SALT_ROUNDS = 10;
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION = 3 * 60 * 1000; //3 minutes in milliseconds
class ServiceError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'ServiceError';
        this.statusCode = statusCode;
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeSignupInput(payload = {}) {
    return {
        firstName: payload.firstName?.trim() || null,
        lastName: payload.lastName?.trim() || null,
        username: payload.username?.trim() || null,
        emailAddress: (payload.emailAddress ?? payload.email)?.trim()?.toLowerCase() || null,
        password: (payload.passwordHash ?? payload.password)?.trim() || null,
        type: payload.type || 'personal',
        signUpWithOAuth: payload.signUpWithOAuth || false,
        firebaseUserUuid: payload.firebase_user_uuid || null,
    };
}

async function fetchAllUsers() {
    return getAllUsers();
}

async function findUserByEmail(email) {
    if (!isValidEmail(email)) {
        throw new ServiceError('Invalid email format', 400);
    }

    return getUserByEmail(email.toLowerCase());
}

async function registerUser(signupPayload = {}) {
    const {
        firstName,
        lastName,
        username,
        emailAddress,
        password,
        type,
        signUpWithOAuth,
        firebaseUserUuid
    } = normalizeSignupInput(signupPayload);

    if(!signUpWithOAuth){
        if(!firstName || !lastName){
            throw new ServiceError('First name and last name are required', 400);
        }
        if (!emailAddress || !password) {
            throw new ServiceError('Email and password are required', 400);
        }

        if (!username) {
            throw new ServiceError('Username is required', 400);
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            throw new ServiceError('Username must be 3-20 characters and contain only letters, numbers, or underscores', 400);
        }
        const existingHandle = await getAccountByHandle(username);
        if (existingHandle) {
            throw new ServiceError('Username already in use', 409);
        }   
    }
    if (!isValidEmail(emailAddress)) {
        throw new ServiceError('Invalid email format', 400);
    }

    const existingUser = await getUserByEmail(emailAddress);
    if (existingUser && !signUpWithOAuth) {
        throw new ServiceError('Email already in use', 409);
    }else if(existingUser && signUpWithOAuth){
        if (!existingUser.firebase_user_uuid) {
            await updateFirebaseUserUuid(existingUser.email_address, firebaseUserUuid);
        }
        return {
            success: true,
            message: 'User already exists with this email',
        };
    }

    const account = await createAccount({
        displayName: `${firstName ?? ''} ${lastName ?? ''}`.trim() || null,
        handle: username ?? `${firstName?.toLowerCase() || 'user'}${lastName ? lastName.toLowerCase() : ''}${Math.floor(1000 + Math.random() * 9000)}`,
        type: type ?? 'personal',
        status: 'active',
    });
 
    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    const user = await createUser({
        accountId: account.account_id,
        firstName,
        lastName,
        emailAddress,
        passwordHash,
        firebaseUserUuid,
    });

    return {
        user,
        accountId: account.account_id,
    };
}

async function LoginUserOrEmail(loginIdentifier, password) {
    const loginIdentifierTrimmed = loginIdentifier?.trim();
    if (!loginIdentifierTrimmed || !password) {
        throw new ServiceError('Login identifier and password are required', 400);
    }

    // Get credentials
    let credentials = null;
    if (isValidEmail(loginIdentifierTrimmed)) {
        credentials = await getEmailandPasswordHashByEmail(loginIdentifierTrimmed.toLowerCase());
    } else {
        credentials = await getEmailandPasswordHashByUsername(loginIdentifierTrimmed);
    }

    // Check lockout
    const ttl = await redisClient.pTTL(`lockout:${loginIdentifierTrimmed}`);
    if (ttl > 0) {
        throw new ServiceError(`Account is locked. Try again in ${Math.ceil(ttl / 1000)} seconds.`, 403);
    }

    if (!credentials) {
        throw new ServiceError('Invalid Credentials.', 400);
    }

    if(!credentials.password_hash){
        throw new ServiceError('Invalid Credentials.', 400);
    }
    // Verify password
    const isMatch = await bcrypt.compare(password, credentials.password_hash);
    if (!isMatch) {
        let attempts = await redisClient.incr(`attempts:${loginIdentifierTrimmed}`);
        if (attempts === 1) {
            await redisClient.pExpire(`attempts:${loginIdentifierTrimmed}`, LOCKOUT_DURATION);
        }

        if (attempts >= MAX_ATTEMPTS) {
            await redisClient.set(`lockout:${loginIdentifierTrimmed}`, 'true', { PX: LOCKOUT_DURATION });
            await redisClient.del(`attempts:${loginIdentifierTrimmed}`);
                // Throw error with correct remaining time
            throw new ServiceError(
                `Account locked due to ${MAX_ATTEMPTS} failed login attempts. Try again in ${Math.ceil(LOCKOUT_DURATION / 1000)} seconds.`,
                403
            );
        }

        throw new ServiceError('Invalid Credentials. Attempts remaining: ' + (MAX_ATTEMPTS - attempts), 400);
    }

    // Successful login → reset attempts
    await redisClient.del(`attempts:${loginIdentifierTrimmed}`);
    return credentials;
}

module.exports = {
    ServiceError,
    fetchAllUsers,
    findUserByEmail,
    registerUser,
    LoginUserOrEmail,
};