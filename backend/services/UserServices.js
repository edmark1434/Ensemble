//library for password hashing
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
//import all the necessary repository functions for user and account management
const {
    getAllUsers,
    createUser,
    getUserByEmail,
    getEmailandPasswordHashByEmail,
    getEmailandPasswordHashByUsername,
    updateFirebaseUserUuid,
    getUserByListofIdsRepositories,
    getNameByUserId,
    updateUserDetails,
    getUserOnboardingStep
} = require('../repositories/UserRepositories');
const {
    createAccount,
    getAccountByHandle,
    grantBadgeToAccount
} = require('../repositories/AccountRepositories');
const {
    getStaffByEmail,
    getStaffByUsername,
    getStaffEmailAndPasswordHashByEmail,
    getStaffEmailAndPasswordHashByUsername
} = require('../repositories/StaffRepositories');

//library for interacting with Redis for login attempt tracking and lockout management
const redisClient = require('../lib/Redis');
//library for generating JSON Web Tokens for authentication
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

//constants for password hashing 
const SALT_ROUNDS = 10;
//number of allowed failed login attempts before lockout  duration of lockout in milliseconds
const MAX_ATTEMPTS = 3;
//duration of lockout in milliseconds
const LOCKOUT_DURATION = 3 * 60 * 1000; //3 minutes in milliseconds
const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9\s]).{8,}$/;
const ALLOWED_SUFFIXES = new Set(['Jr.', 'Sr.', 'II', 'III', 'IV', 'V']);

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
        middleName: payload.middleName?.trim() || null,
        lastName: payload.lastName?.trim() || null,
        suffix: payload.suffix?.trim() || null,
        username: payload.username?.trim() || null,
        emailAddress: (payload.emailAddress ?? payload.email)?.trim()?.toLowerCase() || null,
        password: (payload.passwordHash ?? payload.password)?.trim() || null,
        type: payload.type || 'User',
        signUpWithOAuth: payload.signUpWithOAuth || false,
        firebaseUserUuid: payload.firebase_user_uuid || null,
        firebaseIdToken: payload.firebaseIdToken || null,
    };
}

async function verifyFirebaseIdentityToken(idToken) {
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) throw new ServiceError('OAuth authentication is not configured', 503);
    if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 10000) {
        throw new ServiceError('Invalid OAuth identity token', 401);
    }
    try {
        const response = await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
            { idToken },
            { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
        );
        const identity = response.data?.users?.[0];
        if (!identity?.localId || !identity?.email || identity.emailVerified !== true) {
            throw new ServiceError('OAuth email is not verified', 401);
        }
        return identity;
    } catch (error) {
        if (error instanceof ServiceError) throw error;
        throw new ServiceError('Invalid or expired OAuth identity token', 401);
    }
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

async function getUsersByListOfIdsServices(userIds) { 
    if (!Array.isArray(userIds) || userIds.some(id => typeof id !== 'string')) {
        throw new ServiceError('Invalid user IDs format. Expected an array of strings.', 400);
    }
    return await getUserByListofIdsRepositories(userIds);
}

//function to register a new user, handling both standard email/password registration and OAuth-based registration, including validation of input, checking for existing users, creating accounts and users in the database, hashing passwords, and returning the created user and account information
async function registerUser(signupPayload = {}, options = {}) {

    //normalize and validate the signup input
    const {
        firstName,
        middleName,
        lastName,
        suffix,
        username,
        emailAddress,
        password,
        type,
        signUpWithOAuth,
        firebaseUserUuid,
        firebaseIdToken
    } = normalizeSignupInput(signupPayload);
    if (middleName && middleName.length > 64) {
        throw new ServiceError('Middle name must be 64 characters or fewer', 400);
    }
    if (suffix && !ALLOWED_SUFFIXES.has(suffix)) {
        throw new ServiceError('Invalid suffix', 400);
    }
    if (signUpWithOAuth) {
        const identity = await verifyFirebaseIdentityToken(firebaseIdToken);
        if (identity.email.toLowerCase() !== emailAddress || identity.localId !== firebaseUserUuid) {
            throw new ServiceError('OAuth identity does not match the requested account', 401);
        }
    }
    //check if its using oauth signup, if not validate the required fields for standard registration and check for username uniqueness. If using oauth, only validate email format and check for existing user with that email, if exists update firebase uuid if not already set.
    if(!signUpWithOAuth){
        if (!options.emailVerified) {
            throw new ServiceError('Email verification is required before signup can be completed', 403);
        }
        //if not signing up with OAuth, validate all required fields and check for username uniqueness. If signing up with OAuth, only validate email format and check for existing user with that email, if exists update firebase uuid if not already set.
        if(!firstName || !lastName){
            throw new ServiceError('First name and last name are required', 400);
        }
        if (!emailAddress || (!password && !options.passwordHash)) {
            throw new ServiceError('Email and password are required', 400);
        }
        if (!options.passwordHash && !STRONG_PASSWORD_PATTERN.test(password)) {
            throw new ServiceError('Password must be at least 8 characters and include one uppercase letter, one lowercase letter, and one special character.', 400);
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
                account_id: userCredentials.account_id,
                displayName: userCredentials.display_name,
                type: userCredentials.type
            }
        };
    }
    //create account and user in the database, hash the password if provided, and return the created user and account information
    const account = await createAccount({
        displayName: [firstName, middleName, lastName, suffix].filter(Boolean).join(' ') || null,
        handle: username ?? `${firstName?.toLowerCase() || 'user'}${lastName ? lastName.toLowerCase() : ''}${Math.floor(1000 + Math.random() * 9000)}`,
        type: type ?? 'User',
        status: 'active',
    });
    //hash the password if provided, otherwise set to null for OAuth users
    const passwordHash = options.passwordHash || (password ? await bcrypt.hash(password, SALT_ROUNDS) : null);

    //create the user in the database with the associated account ID and return the created user information along with the account ID
    const user = await createUser({
        account_id: account.account_id,
        firstName,
        middleName,
        lastName,
        suffix,
        emailAddress,
        passwordHash,
        firebaseUserUuid,
        isEmailVerified: Boolean(signUpWithOAuth || options.emailVerified),
    });
    
    // Automatically grant the Alpha Tester badge to all new accounts
    try {
        await grantBadgeToAccount(account.account_id, 'acc-alpha', 1); // displayOrder = 1
    } catch (e) {
        console.error("Failed to grant Alpha badge to new user", e);
    }

    await redisClient.del(`sessionCredentials:${emailAddress}`);
    await redisClient.del(`verificationCode:${emailAddress}`);
    //return the created user and account information
    return {
        credentials:{
            userId: user.user_id,
            email: user.email_address,
            username: account.handle,
            account_id: account.account_id,
            displayName: account.display_name,
            type: account.type
        },
        success: true,
        message: 'User and account created successfully',
    };
}

//function to handle user login by validating the provided login identifier (email or username) and password, checking for account lockout due to failed attempts, verifying credentials, and returning the user credentials if successful or throwing appropriate ServiceErrors for various failure cases
async function LoginUserOrEmail(loginIdentifier, password, context = {}) {
    let credentialsSession = null;
    if (isValidEmail(loginIdentifier)) { 
        credentialsSession = await getEmailandPasswordHashByEmail(loginIdentifier.toLowerCase());
    } else {
        credentialsSession = await getEmailandPasswordHashByUsername(loginIdentifier);
    }
    if (!credentialsSession && isValidEmail(loginIdentifier)) { 
        const credentialsInSession = await redisClient.get(`sessionCredentials:${loginIdentifier.toLowerCase()}`);
        if (credentialsInSession) {
            credentialsSession = JSON.parse(credentialsInSession);
            if (credentialsSession.passwordHash && loginIdentifier.toLowerCase() === credentialsSession.email.toLowerCase() && await bcrypt.compare(password, credentialsSession.passwordHash)) {
                const verifyCodeSession = await redisClient.get(`verificationCode:${credentialsSession.email}`);
                if (!verifyCodeSession) {
                    const verificationCode = await sendVerificationEmail(credentialsSession.email, credentialsSession.firstName, credentialsSession.lastName);
                    await redisClient.set(`verificationCode:${credentialsSession.email}`, verificationCode, { EX: 10 * 60 });
                }
                return {
                    email: credentialsSession.email,
                    firstName: credentialsSession.firstName,
                    lastName: credentialsSession.lastName,
                    username: credentialsSession.username,
                    existSession: true,
                };
            }
        }
    }
        
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

async function getNameByUserIdServices(userId) {
    return await getNameByUserId(userId);
}

async function signUpSaveSession(credentials) {
    // Implementation for signing up and saving session

    try {
        let errorList = {}
        const email = credentials.email?.trim().toLowerCase();
        const firstName = credentials.firstName?.trim();
        const middleName = credentials.middleName?.trim() || null;
        const lastName = credentials.lastName?.trim();
        const suffix = credentials.suffix?.trim() || null;
        const username = credentials.username?.trim();
        if(!isValidEmail(email)) {
            errorList.email = "Invalid email format";
        }
        if(await getEmailandPasswordHashByEmail(email)) {
            errorList.email = "Email already in use";
        }
        if(await getEmailandPasswordHashByUsername(username)) {
            errorList.username = "Username already in use";
        }
        if (!email) {
            errorList.email = "Email and password are required";
        }
        if(!credentials.password) {
            errorList.password = "Email and password are required";
        }
        if (!firstName) {
            errorList.firstName = "First name is required";
        }
        if (!lastName) {
            errorList.lastName = "Last name is required";
        }
        if (middleName && middleName.length > 64) {
            errorList.middleName = "Middle name must be 64 characters or fewer";
        }
        if (suffix && !ALLOWED_SUFFIXES.has(suffix)) {
            errorList.suffix = "Select a valid suffix";
        }

        if (!username) {
            errorList.username = "Username is required";
        }

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
            errorList.username = "Username must be 3-20 characters and contain only letters, numbers, or underscores";
        }
        if (credentials.password && !STRONG_PASSWORD_PATTERN.test(credentials.password)) {
            errorList.password = 'Password must be at least 8 characters and include one uppercase letter, one lowercase letter, and one special character.';
        }
        
        if(Object.keys(errorList).length > 0){
            throw new ServiceError('Validation errors', 400, errorList);
        } else {
            const pending = {
                email,
                firstName,
                middleName,
                lastName,
                suffix,
                username,
                passwordHash: await bcrypt.hash(credentials.password, SALT_ROUNDS),
            };
            await redisClient.set(`sessionCredentials:${email}`, JSON.stringify(pending), { EX: 60 * 60 * 24 });
            const checkCodeSession = await redisClient.get(`verificationCode:${email}`);
            if(!checkCodeSession){
                const verificationCode = await sendVerificationEmail(email, firstName, lastName);
                await redisClient.set(`verificationCode:${email}`, verificationCode, { EX: 10 * 60 });
            }
            return { email, firstName, middleName, lastName, suffix, username };
        }
    }catch(err){
        console.error(`Error signing up and saving session:`, err);
        throw err;
    }
}

async function checkVerificationCode(email, code) { 
    const normalizedEmail = email?.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail) || !/^\d{6}$/.test(String(code || ''))) {
        throw new ServiceError('Invalid verification request', 400);
    }
    const storedCode = await redisClient.get(`verificationCode:${normalizedEmail}`);
    if (!storedCode) {
        throw new ServiceError('Verification code expired', 400);
    }
    if (storedCode !== code) {
        throw new ServiceError('Invalid verification code', 400);
    }
    if (storedCode === code) {
        const credentialsInSession = await redisClient.get(`sessionCredentials:${normalizedEmail}`);
        if (!credentialsInSession) {
            throw new ServiceError('Session expired or not found', 400);
        }
        const pending = JSON.parse(credentialsInSession);
        const result = await registerUser({
            firstName: pending.firstName,
            middleName: pending.middleName,
            lastName: pending.lastName,
            suffix: pending.suffix,
            username: pending.username,
            email: pending.email,
            type: 'User',
        }, { emailVerified: true, passwordHash: pending.passwordHash });
        await redisClient.del(`verificationCode:${normalizedEmail}`);
        await redisClient.del(`sessionCredentials:${normalizedEmail}`);
        return result;
    }
}




async function sendVerificationEmailServices(email) {
    try {
        const normalizedEmail = email?.trim().toLowerCase();
        const pendingRaw = await redisClient.get(`sessionCredentials:${normalizedEmail}`);
        if (!pendingRaw) throw new ServiceError('Pending signup not found or expired', 400);
        const pending = JSON.parse(pendingRaw);
        const sixDigitCode = await sendVerificationEmail(normalizedEmail, pending.firstName, pending.lastName);
        await redisClient.set(`verificationCode:${normalizedEmail}`, sixDigitCode, { EX: 10 * 60 });
        return true;
    }
    catch (err) {
        console.error(`Error sending verification email:`, err);
        throw err;
    }

}



async function updatePersonalDetails(userId, details) {
    try{
        const result = await updateUserPersonalDetails(userId, details);
        return result;
    } catch (err) { 
        console.error(`Error updating personal details for user ${userId}:`, err);
        throw err;
    }

}


async function sendVerificationEmail(email, firstName, lastName) { 
    const sixDigitCode = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    const payload = emailPayload(email, firstName, lastName, sixDigitCode);
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'Accept': 'application/json'
        }
    });
    return sixDigitCode;
}

async function updateUserPersonalDetails(userId,details) {
    const { middleName, suffix, birthDate, country, zipCode, address } = details;
    console.log('Updating personal details for user:', userId, details);
    let listErrors = {};
    if (!birthDate) listErrors.birthDate = "Birth date is required";
    if (!country) listErrors.country = "Country is required";
    if (!zipCode) listErrors.zipCode = "Zip code is required";
    if (!address) listErrors.address = "Address is required";
    if(!typeof birthDate === 'string' || isNaN(Date.parse(birthDate))) listErrors.birthDate = "Birth date must be a valid date string";
    if(Object.keys(listErrors).length > 0){
        throw new ServiceError('Validation errors', 400, listErrors);
    } else {
        try {
            const updatedUser = await updateUserDetails(userId, {
                middle_name: middleName,
                suffix,
                birth_date: birthDate,
                country,
                zip_code: zipCode,
                address
            });
            return updatedUser;
        } catch (err) {
            console.error(`Error updating personal details for user ${userId}:`, err);
            throw err;
        }
    }


}



function emailPayload(email, firstName, lastName, sixDigitCode) {
    return {
        sender: {
            name: "Ensemble",
            email: "ensemble.support@ensemble.software"
        },
        to: [
            {
                email,
                name: `${firstName} ${lastName}`
            }
        ],
        subject: `Your Ensemble Verification Code: ${sixDigitCode}`,
        htmlContent: getVerificationEmailHtml(firstName, sixDigitCode)
    };
} 


function getVerificationEmailHtml(firstName, sixDigitCode) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Account</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
<tr>
<td align="center">

<table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.05);">

<tr>
<td align="center" style="padding:32px 20px 10px;">
<img
    src="https://i.pinimg.com/736x/4c/0e/41/4c0e41b328ad5f3bc015686827b05fa9.jpg"
    width="120"
    alt="Ensemble"
    style="display:block;border-radius:8px;">
</td>
</tr>

<tr>
<td style="padding:20px 40px 40px;text-align:center;">

<h2 style="margin:0 0 12px;color:#1e1e2f;">
Hi ${firstName},
</h2>

<p style="font-size:15px;line-height:1.6;color:#555;">
Use the verification code below to verify your identity on
<strong>Ensemble</strong>. This code is valid for
<strong>10 minutes</strong>.
</p>

<table width="100%" cellpadding="0" cellspacing="0"
style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
<tr>
<td align="center"
style="padding:20px;font-size:32px;font-weight:bold;letter-spacing:6px;color:#6366f1;font-family:Courier,monospace;">
${sixDigitCode}
</td>
</tr>
</table>

<p style="font-size:13px;color:#94a3b8;line-height:1.6;">
If you didn't request this code, you can safely ignore this email.
</p>

</td>
</tr>

<tr>
<td align="center"
style="padding:20px;background:#fafafa;border-top:1px solid #eeeeee;font-size:12px;color:#999;">
© 2026 Ensemble. Security Notification.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
}


async function isUsernameUnique(username) {
    if (!username) {
        throw new ServiceError('Username is required', 400);
    }
    if (username.length < 8 || username.length > 20) {
        throw new ServiceError('Username must be between 8 and 20 characters', 400);
    }
    try {
        const result = await getAccountByHandle(username);
        if (result) {
            return false; // Username is not unique
        }
        return true; // Username is unique
    }catch (err) {
        console.error(`Error checking username uniqueness for ${username}:`, err);
        throw new ServiceError('Error checking username uniqueness', 500);
    }
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
    getCredentials,
    getUsersByListOfIdsServices,
    getNameByUserIdServices,
    signUpSaveSession,
    checkVerificationCode,
    sendVerificationEmailServices,
    updatePersonalDetails,
    isUsernameUnique,
    sendVerificationEmail
};
