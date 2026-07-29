const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const countries = require("i18n-iso-countries");
const en = require("i18n-iso-countries/langs/en.json");

countries.registerLocale(en);

const {
    getUserById,
} = require("../Repositories/UserRepositories");

const {
    getReusableAccountVerificationSessionByAccountId,
    createAccountVerificationSessionRepository,
    createAccountVerificationRepository,
    getAccountVerificationByAccountId,
    getAccountVerificationSessionsByAccountId,
    updateAccountVerificationSessionStatus,
    getAccountVerificationStatusByAccountId
} = require("../Repositories/AccountVerificationRepositories");

const {
    getEmailAddressByAccountId
} = require("../Repositories/ProfileRepositories");


const {
    sendVerificationEmail
} = require('../Services/UserServices')

const redisClient = require('../lib/redis');

async function createAccountVerificationSession(userId) {
    try {
        // ============================================================
        // 1. Fetch user
        // ============================================================
        
        const user = await getUserById(userId);

        if (!user) {
            throw new Error("User not found.");
        }

        // ============================================================
        // 2. Check reusable session in database
        // ============================================================

        const [existingSession, existingVerification,existingSessionByAccountId] = await Promise.all([
            getReusableAccountVerificationSessionByAccountId(user.account_id),
            getAccountVerificationByAccountId(user.account_id),
            getAccountVerificationSessionsByAccountId(user.account_id)
        ]);
        if (existingSession) {
            return existingSession;
        }
        if(!existingVerification){
            await createAccountVerificationRepository(user.account_id);
        }
        // ============================================================
        // 3. Check existing reusable Didit session
        // ============================================================

        const reusableStatuses = [
            "Not Started",
            "In Progress",
            "Awaiting User",
            "In Review",
            "Resubmitted",
        ];

        const diditResponse = await axios.get(
            "https://verification.didit.me/v3/sessions",
            {
                headers: {
                    "x-api-key": process.env.DIDIT_API_KEY,
                },
                params: {
                    vendor_data: `account-${user.account_id}`,
                },
            }
        );
        console.log("Didit sessions response:", diditResponse);
        const reusableDiditSession = diditResponse.data.results?.find(session =>
            reusableStatuses.includes(session.status)
        );

        if (reusableDiditSession) {
            const verificationSession =
                await createAccountVerificationSessionRepository({
                    account_id: user.account_id,
                    didit_session_id: reusableDiditSession.session_id,
                    verification_url: reusableDiditSession.session_url,
                    kyc_status: reusableDiditSession.status,
                });

            return verificationSession;
        }

        // ============================================================
        // 4. Build expected details
        // ============================================================

        const alpha2 = countries.getAlpha2Code(user.country, "en");

        const alpha3 = alpha2
            ? countries.alpha2ToAlpha3(alpha2)
            : "PHL";

        const dateOfBirth = user.date_of_birth
            ? new Date(user.date_of_birth).toISOString().split("T")[0]
            : undefined;

        const expectedDetails = {};

        if (user.first_name)
            expectedDetails.first_name = user.first_name;

        if (user.last_name)
            expectedDetails.last_name = user.last_name;

        if (dateOfBirth)
            expectedDetails.date_of_birth = dateOfBirth;

        if (alpha3)
            expectedDetails.id_country = alpha3;

        // ============================================================
        // 5. Create Didit session
        // ============================================================

        const response = await axios.post(
            "https://verification.didit.me/v3/session/",
            {
                workflow_id: process.env.DIDIT_WORKFLOW_ID,

                vendor_data: `account-${user.account_id}`,

                callback: `${process.env.FRONTEND_URL}/verification/result`,

                callback_method: "both",

                metadata: {
                    account_id: user.account_id,
                },

                language: "en",

                contact_details: {
                    email: user.email_address,
                    send_notification_emails: true,
                    email_lang: "en",
                },

                expected_details: expectedDetails,
            },
            {
                headers: {
                    "x-api-key": process.env.DIDIT_API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        const didit = response.data;

        // ============================================================
        // 6. Save session
        // ============================================================
        let verificationSession;
        if (existingSessionByAccountId) {
            verificationSession = await updateAccountVerificationSessionStatus(
                existingSessionByAccountId.session_id,
                {
                    didit_session_id: didit.session_id,
                    verification_url: didit.url,
                    kyc_status: didit.status,
                    verification_status: "Pending",
                }
            );
        } else {
            verificationSession =
                await createAccountVerificationSessionRepository({
                    account_id: user.account_id,
                    didit_session_id: didit.session_id,
                    verification_url: didit.url,
                    kyc_status: didit.status,
                });
        }

        return verificationSession;
    } catch (error) {
        console.error(
            "Failed to create account verification session:",
            error.response?.data || error.message
        );
        throw error;
    }
}


async function appyForResubmissionServices(sessionId,accountId) {
    const emailResponse = await getEmailAddressByAccountId(accountId);
    try{
        const response = await axios.patch(
            `https://verification.didit.me/v3/session/${sessionId}/update-status`,
            {
                new_status: "Resubmitted",
                send_email: true,
                email_address: emailResponse.email_address,
            },
            {
                headers: {
                    "x-api-key": process.env.DIDIT_API_KEY,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.data;
    }catch(err){
        console.error("Error applying for resubmission:", err);
        throw err;
    }
}

async function getAccountVerificationStatusServices(accountId) {
    try {
        const verificationSession = await getAccountVerificationStatusByAccountId(accountId);
        return verificationSession;
    } catch (error) {
        console.error("Error fetching account verification status:", error);
        throw error;
    }
}


async function sendVerificationServices(email, first_name, last_name) {
    try {
        const sixDigits = await sendVerificationEmail(email, first_name, last_name);
        redisClient.set(`verification_code:${email}`, sixDigits, 'EX', 600); // Store for 10 minutes
        return sixDigits;
    }catch(err){
        console.error("Error sending verification email:", err);
        throw err;
    }
}

module.exports = {
    createAccountVerificationSession,
    appyForResubmissionServices,
    getAccountVerificationStatusServices,
    sendVerificationServices
};