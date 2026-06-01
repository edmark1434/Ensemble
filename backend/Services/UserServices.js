//library for password hashing
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
//import all the necessary repository functions for user and account management
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
const {
    getStaffByEmail,
    getStaffByUsername,
    getStaffEmailAndPasswordHashByEmail,
    getStaffEmailAndPasswordHashByUsername
} = require('../Repositories/StaffRepositories');

//library for interacting with Redis for login attempt tracking and lockout management
const redisClient = require('../lib/redis');
//library for generating JSON Web Tokens for authentication
const jwt = require('jsonwebtoken');

//constants for password hashing 
const SALT_ROUNDS = 10;
//number of allowed failed login attempts before lockout  duration of lockout in milliseconds
const MAX_ATTEMPTS = 3;
//duration of lockout in milliseconds
const LOCKOUT_DURATION = 3 * 60 * 1000; //3 minutes in milliseconds

//create a custom error class for servicelevel errors that includes an HTTP status code for better error handling in controllers
class ServiceError extends Error {
    constructor(message, statusCode = 400, details = null) {
        super(message);
        this.name = 'ServiceError';
        this.statusCode = statusCode;
        this.details = details;
    }
}

function detectDeviceType(userAgent = '') {
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/.test(ua)) {
        return 'mobile';
    }
    if (/ipad|tablet/.test(ua)) {
        return 'tablet';
    }
    return 'desktop';
}

//function to validate email format using a regular expression
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

//function to normalize and validate signup input, ensuring consistent formatting and required fields for user registration
function normalizeSignupInput(payload = {}) {
    return {
        firstName: payload.firstName?.trim() || null,
        lastName: payload.lastName?.trim() || null,
        username: payload.username?.trim() || null,
        emailAddress: (payload.emailAddress ?? payload.email)?.trim()?.toLowerCase() || null,
        password: (payload.passwordHash ?? payload.password)?.trim() || null,
        type: payload.type || 'User',
        signUpWithOAuth: payload.signUpWithOAuth || false,
        firebaseUserUuid: payload.firebase_user_uuid || null,
    };
}
//function to get all users from the database by calling the corresponding repository function
async function fetchAllUsers() {
    return getAllUsers();
}

//function to find a user by their email address, validating the email format and throwing a ServiceError if invalid, otherwise returning the user data from the repository
async function findUserByEmail(email) {
    if (!isValidEmail(email)) {
        throw new ServiceError('Invalid email format', 400);
    }

    return getUserByEmail(email.toLowerCase());
}

//function to register a new user, handling both standard email/password registration and OAuth-based registration, including validation of input, checking for existing users, creating accounts and users in the database, hashing passwords, and returning the created user and account information
async function registerUser(signupPayload = {}) {

    //normalize and validate the signup input
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
    //check if its using oauth signup, if not validate the required fields for standard registration and check for username uniqueness. If using oauth, only validate email format and check for existing user with that email, if exists update firebase uuid if not already set.
    if(!signUpWithOAuth){
        //if not signing up with OAuth, validate all required fields and check for username uniqueness. If signing up with OAuth, only validate email format and check for existing user with that email, if exists update firebase uuid if not already set.
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
        const [result1, result2] = await Promise.all([
            getAccountByHandle(username),
            getStaffByUsername(username)
        ]);
        const existingHandle = result1 || result2;
        if (existingHandle) {
            throw new ServiceError('Username already in use', 409);
        }   
    }
    //validate email format for both standard and OAuth signup
    if (!isValidEmail(emailAddress)) {
        throw new ServiceError('Invalid email format', 400);
    }
    //check for existing user with the same email address. If signing up with OAuth and user exists, update firebase uuid if not already set and return success message. If signing up without OAuth and user exists, throw error.
    const [result1, result2] = await Promise.all([
        getUserByEmail(emailAddress),
        getStaffByEmail(emailAddress)
    ]);
    const existingUser = result1 || result2;
    //if user exists and not signing up with OAuth, throw error. If user exists and signing up with OAuth, update firebase uuid if not already set and return success message. If user does not exist, proceed to create account and user.
    if (existingUser && !signUpWithOAuth) {
        throw new ServiceError('Email already in use', 409);
    //if user exists and signing up with OAuth, update firebase uuid if not already set and return the user
    }else if(existingUser && signUpWithOAuth){
        if (!existingUser.firebase_user_uuid) {
            await updateFirebaseUserUuid(existingUser.email_address, firebaseUserUuid);
        }
        // Fetch full user credentials for OAuth existing user
        const userCredentials = await getEmailandPasswordHashByEmail(emailAddress.toLowerCase());
        return {
            success: true,
            message: 'User already exists with this email',
            credentials: {
                userId: userCredentials.user_id,
                email: userCredentials.email_address,
                username: userCredentials.handle,
                accountId: userCredentials.account_id,
                displayName: userCredentials.display_name,
                type: userCredentials.type
            }
        };
    }
    //create account and user in the database, hash the password if provided, and return the created user and account information
    const account = await createAccount({
        displayName: `${firstName ?? ''} ${lastName ?? ''}`.trim() || null,
        handle: username ?? `${firstName?.toLowerCase() || 'user'}${lastName ? lastName.toLowerCase() : ''}${Math.floor(1000 + Math.random() * 9000)}`,
        type: type ?? 'User',
        status: 'active',
    });
    //hash the password if provided, otherwise set to null for OAuth users
    const passwordHash = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;

    //create the user in the database with the associated account ID and return the created user information along with the account ID
    const user = await createUser({
        accountId: account.account_id,
        firstName,
        lastName,
        emailAddress,
        passwordHash,
        firebaseUserUuid,
    });
    //return the created user and account information
    return {
        credentials:{
            userId: user.user_id,
            email: user.email_address,
            username: account.handle,
            accountId: account.account_id,
            displayName: account.display_name,
            type: account.type
        },
        success: true,
        message: 'User and account created successfully',
    };
}

//function to handle user login by validating the provided login identifier (email or username) and password, checking for account lockout due to failed attempts, verifying credentials, and returning the user credentials if successful or throwing appropriate ServiceErrors for various failure cases
async function LoginUserOrEmail(loginIdentifier, password, context = {}) {
    //trim the login identifier and validate that both the identifier and password are provided, throwing a ServiceError if not
    const loginIdentifierTrimmed = loginIdentifier?.trim();
    const lockoutIdentifier = loginIdentifierTrimmed?.toLowerCase();
    const sourceIp = context.ip || 'unknown';
    const sourceUserAgent = context.userAgent || 'unknown';
    const sourceDevice = detectDeviceType(sourceUserAgent);
    if (!loginIdentifierTrimmed || !password) {
        throw new ServiceError('Login identifier and password are required', 400);
    }

    const attemptsKey = `attempts:${lockoutIdentifier}`;
    const lockoutKey = `lockout:${lockoutIdentifier}`;
    const lockoutMetaKey = `lockout_meta:${lockoutIdentifier}`;

    // Get credentials if the login identifier is an email, fetch by email, otherwise fetch by username. This allows users to log in using either their email address or their account handle (username). The repository functions will return the email and password hash for the provided identifier, which will be used for credential verification. If no credentials are found, it will be handled in the subsequent logic to throw an invalid credentials error.
    const credentials = await getCredentials(lockoutIdentifier);

    // Check lockout
    const ttl = await redisClient.pTTL(lockoutKey);
    if (ttl > 0) {
        let lockoutMeta = null;
        const rawMeta = await redisClient.get(lockoutMetaKey);
        if (rawMeta) {
            try {
                lockoutMeta = JSON.parse(rawMeta);
            } catch (_err) {
                lockoutMeta = null;
            }
        }
        throw new ServiceError(
            `Account is locked. Try again in ${Math.ceil(ttl / 1000)} seconds.`,
            403,
            {
                remainingSeconds: Math.ceil(ttl / 1000),
                identifier: lockoutIdentifier,
                lockout: lockoutMeta,
            }
        );
    }
    // If no credentials are found or if the password hash is missing (which could indicate an issue with the user record), throw an invalid credentials error. This prevents further processing and ensures that only valid login attempts proceed to password verification.
    if (!credentials || !credentials.password_hash) {
        let attempts = await redisClient.incr(attemptsKey);
        if (attempts === 1) {
            await redisClient.pExpire(attemptsKey, LOCKOUT_DURATION);
        }
        if (attempts >= MAX_ATTEMPTS) {
            await redisClient.set(lockoutKey, 'true', { PX: LOCKOUT_DURATION });
            await redisClient.del(attemptsKey);
            const lockoutMeta = {
                ip: sourceIp,
                userAgent: sourceUserAgent,
                deviceType: sourceDevice,
                identifier: lockoutIdentifier,
                lockedAt: new Date().toISOString(),
            };
            await redisClient.set(lockoutMetaKey, JSON.stringify(lockoutMeta), { PX: LOCKOUT_DURATION });
            throw new ServiceError(
                `Account locked due to ${MAX_ATTEMPTS} failed login attempts. Try again in ${Math.ceil(LOCKOUT_DURATION / 1000)} seconds.`,
                403,
                {
                    remainingSeconds: Math.ceil(LOCKOUT_DURATION / 1000),
                    identifier: lockoutIdentifier,
                    lockout: lockoutMeta,
                }
            );
        }
        throw new ServiceError('Invalid Credentials. Attempts remaining: ' + (MAX_ATTEMPTS - attempts), 400);
    }
    // Verify password using bcrypt to compare the provided password with the stored password hash. If the password does not match, increment the failed login attempts in Redis and check if the maximum attempts have been reached to trigger a lockout. If locked out, set a lockout key in Redis with an expiration time and throw a ServiceError indicating the account is locked. If not yet locked out, throw a ServiceError indicating invalid credentials and the number of remaining attempts. If the password is correct, reset the failed attempts in Redis and return the user credentials for successful login processing.
    const isMatch = await bcrypt.compare(password, credentials.password_hash);
    if (!isMatch) {
        // Increment failed attempts in Redis and check for lockout
        let attempts = await redisClient.incr(attemptsKey);
        //set expiration for attempts key on first failed attempt to ensure it doesn't persist indefinitely
        if (attempts === 1) {
            await redisClient.pExpire(attemptsKey, LOCKOUT_DURATION);
        }
        // If the number of failed attempts has reached or exceeded the maximum allowed, set a lockout key in Redis with an expiration time to prevent further login attempts for the duration of the lockout. Then, throw a ServiceError indicating that the account is locked and include the remaining lockout time in the error message. If the maximum attempts have not yet been reached, throw a ServiceError indicating that the credentials are invalid and include the number of remaining attempts before lockout.
        if (attempts >= MAX_ATTEMPTS) {
            await redisClient.set(lockoutKey, 'true', { PX: LOCKOUT_DURATION });
            await redisClient.del(attemptsKey);
            const lockoutMeta = {
                ip: sourceIp,
                userAgent: sourceUserAgent,
                deviceType: sourceDevice,
                identifier: lockoutIdentifier,
                lockedAt: new Date().toISOString(),
            };
            await redisClient.set(lockoutMetaKey, JSON.stringify(lockoutMeta), { PX: LOCKOUT_DURATION });
                // Throw error with correct remaining time
            throw new ServiceError(
                `Account locked due to ${MAX_ATTEMPTS} failed login attempts. Try again in ${Math.ceil(LOCKOUT_DURATION / 1000)} seconds.`,
                403,
                {
                    remainingSeconds: Math.ceil(LOCKOUT_DURATION / 1000),
                    identifier: lockoutIdentifier,
                    lockout: lockoutMeta,
                }
            );
        }
        // Throw error with remaining attempts
        throw new ServiceError('Invalid Credentials. Attempts remaining: ' + (MAX_ATTEMPTS - attempts), 400);
    }

    // Successful login → reset attempts
    await redisClient.del(attemptsKey);
    await redisClient.del(lockoutMetaKey);
    return credentials;
}
//function to generate a JSON Web Token (JWT) for authenticated users, signing the provided payload with a secret key and setting an expiration time for the token. This token can then be used for authenticating subsequent requests to protected routes in the application.
async function AccessTokens(payload){
    return jwt.sign(payload, process.env.ACCESS_TOKEN_JWT_SECRET, { expiresIn: '1h' });
}
//function to generate a refresh token, which is a longer-lived token used to obtain new access tokens without requiring the user to re-authenticate. This function signs the provided payload with a secret key and sets a longer expiration time for the refresh token compared to the access token.
async function RefreshTokens(payload){
    return jwt.sign(payload, process.env.REFRESH_TOKEN_JWT_SECRET, { expiresIn: '30d' });
}
async function createSessionId(credentials){
    const sessionId = uuidv4();
    await redisClient.set(
        `session:${sessionId}`,
        JSON.stringify(credentials),
        { EX: 60 * 60 * 24 * 30 }
    ); // Store as JSON string because Redis string values cannot be raw objects
    return sessionId;
}

async function logout(sessionId){
    await redisClient.del(`session:${sessionId}`);
}

async function getCredentials(loginIdentifier){
    const normalizedIdentifier = loginIdentifier?.trim();
    let credentials = null;
    if (isValidEmail(normalizedIdentifier)) {
        credentials = await getEmailandPasswordHashByEmail(normalizedIdentifier.toLowerCase());
        if(!credentials){
            credentials = await getStaffEmailAndPasswordHashByEmail(normalizedIdentifier.toLowerCase());
        }
    } else {
        credentials = await getEmailandPasswordHashByUsername(normalizedIdentifier);
        if(!credentials){
            credentials = await getStaffEmailAndPasswordHashByUsername(normalizedIdentifier);
        }
    }
    return credentials;
}
module.exports = {
    ServiceError,
    fetchAllUsers,
    findUserByEmail,
    registerUser,
    LoginUserOrEmail,
    AccessTokens,
    RefreshTokens,
    createSessionId,
    logout,
    getCredentials
};