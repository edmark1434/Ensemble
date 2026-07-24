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
} = require("../Repositories/AccountVerificationRepositories");

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

        const existingSession =
            await getReusableAccountVerificationSessionByAccountId(
                user.account_id
            );

        if (existingSession) {
            return existingSession;
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

        const verificationSession =
            await createAccountVerificationSessionRepository({
                account_id: user.account_id,
                didit_session_id: didit.session_id,
                verification_url: didit.url,
                kyc_status: didit.status,
            });

        return verificationSession;
    } catch (error) {
        console.error(
            "Failed to create account verification session:",
            error.response?.data || error.message
        );
        throw error;
    }
}

module.exports = {
    createAccountVerificationSession,
};