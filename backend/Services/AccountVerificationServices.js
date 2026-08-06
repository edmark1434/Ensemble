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
    updateAccountVerificationSessionById,
    getAccountVerificationStatusByAccountId,
    updateAccountVerifications,
    createBusinessVerificationSubmissionRepository
} = require("../Repositories/AccountVerificationRepositories");

const {
    getEmailAddressByAccountId
} = require("../Repositories/ProfileRepositories");


const {
    sendVerificationEmail
} = require('../Services/UserServices')

const {
    checkAccountId
} = require('../Repositories/AccountRepositories')

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
        const reusableDiditSession = diditResponse.data.results?.find(session =>
            reusableStatuses.includes(session.status)
        );

        if (reusableDiditSession) {
            let verificationSession;
            if (existingSessionByAccountId) {
                verificationSession = await updateAccountVerificationSessionById(
                    existingSessionByAccountId.verification_session_id,
                    {
                        didit_session_id: reusableDiditSession.session_id,
                        verification_url: reusableDiditSession.session_url,
                        kyc_status: reusableDiditSession.status,
                        verification_status: "Pending",
                        verified_by_account_id: null,
                        expires_at: null,
                    }
                );
            } else {
                verificationSession = await createAccountVerificationSessionRepository({
                    account_id: user.account_id,
                    didit_session_id: reusableDiditSession.session_id,
                    verification_url: reusableDiditSession.session_url,
                    kyc_status: reusableDiditSession.status,
                });
            }

            await updateAccountVerifications(user.account_id, {
                verification_session_id: verificationSession.verification_session_id,
                is_verified: false,
                verified_at: null,
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
            verificationSession = await updateAccountVerificationSessionById(
                existingSessionByAccountId.verification_session_id,
                {
                    didit_session_id: didit.session_id,
                    verification_url: didit.url,
                    kyc_status: didit.status,
                    verification_status: "Pending",
                    verified_by_account_id: null,
                    expires_at: null,
                }
            );
            await updateAccountVerifications(user.account_id, {
                verification_session_id: existingSessionByAccountId.verification_session_id,
                is_verified: false,
                verified_at: null,
            });
        } else {
            verificationSession =
                await createAccountVerificationSessionRepository({
                    account_id: user.account_id,
                    didit_session_id: didit.session_id,
                    verification_url: didit.url,
                    kyc_status: didit.status,
                });
                await updateAccountVerifications(user.account_id, {
                    verification_session_id: verificationSession.verification_session_id,
                    is_verified: false,
                    verified_at: null,
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


async function appyForResubmissionServices(sessionId,accountId,comment = "Please redo the required verification steps") {
    const emailResponse = await getEmailAddressByAccountId(accountId);
    try{
        let nodesToResubmit = [];
        try {
            const decisionResponse = await axios.get(
                `https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/decision/`,
                {
                    headers: {
                        "x-api-key": process.env.DIDIT_API_KEY,
                        Accept: "application/json",
                    },
                }
            );
            const responseBody = decisionResponse.data || {};
            const decision = responseBody.data?.decision
                || responseBody.decision
                || responseBody.data
                || responseBody;
            nodesToResubmit = [
                ...(decision.id_verifications || []).map(({ node_id }) => ({ node_id, feature: "OCR" })),
                ...(decision.nfc_verifications || []).map(({ node_id }) => ({ node_id, feature: "NFC" })),
                ...(decision.liveness_checks || []).map(({ node_id }) => ({ node_id, feature: "LIVENESS" })),
                ...(decision.face_matches || []).map(({ node_id }) => ({ node_id, feature: "FACE_MATCH" })),
                ...(decision.ip_analyses || []).map(({ node_id }) => ({ node_id, feature: "IP_ANALYSIS" })),
            ].filter(({ node_id }) => Boolean(node_id));
        } catch (decisionError) {
            console.warn(
                "Unable to load Didit nodes; requesting full-session resubmission:",
                decisionError.response?.status || decisionError.message
            );
        }

        const updatePayload = {
            new_status: "Resubmitted",
            send_email: true,
            email_address: emailResponse.email_address,
            comment
        };
        if (nodesToResubmit.length) updatePayload.nodes_to_resubmit = nodesToResubmit;

        const response = await axios.patch(
            `https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/update-status/`,
            updatePayload,
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


async function approvedVerificationServices(sessionId,accountId,validityDays = 365,comment = `Approved by Ensemble admin for ${validityDays} days`) {
    const emailResponse = await getEmailAddressByAccountId(accountId);
    try{
        const response = await axios.patch(
            `https://verification.didit.me/v3/session/${sessionId}/update-status`,
            {
                new_status: "Approved",
                comment,
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
        console.error("Error approving verification:", err);
        throw err;
    }
}

async function DeclinedVerificationServices(sessionId,accountId,comment = "Failed compliance check") {
    const emailResponse = await getEmailAddressByAccountId(accountId);
    try{
        const response = await axios.patch(
            `https://verification.didit.me/v3/session/${sessionId}/update-status`,
            {
                new_status: "Declined",
                comment,
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
        console.error("Error declining verification:", err);
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

async function createBusinessAccountVerificationServices(accountId, documentType, filePath) {
    if (!(await checkAccountId(accountId))) {
        throw new Error("Invalid accountId");
    }
    if (!documentType || !String(documentType).trim()) {
        throw new Error("Document type is required");
    }
    if (!Array.isArray(filePath) || filePath.length === 0) {
        throw new Error("No files provided for verification");
    }
    if (filePath.length > 10) {
        throw new Error("A maximum of 10 files can be submitted");
    }

    const allowedBusinessDocumentTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ]);

    const sanitizedFiles = filePath.map((file) => {
        const { name, path, mime_type, size_bytes } = file;
        if (!name || !path || !mime_type || !Number.isInteger(size_bytes) || size_bytes <= 0) {
            throw new Error("File details are incomplete");
        }
        if (!allowedBusinessDocumentTypes.has(String(mime_type))) {
            throw new Error(`Unsupported business document type: ${mime_type}`);
        }
        if (size_bytes > 5 * 1024 * 1024) {
            throw new Error(`${name} exceeds the 5 MB file limit`);
        }

        return {
            name: String(name).trim(),
            path: String(path).trim(),
            mime_type: String(mime_type).trim(),
            size_bytes,
        };
    });

    return createBusinessVerificationSubmissionRepository(
        accountId,
        String(documentType).trim(),
        sanitizedFiles
    );
}

module.exports = {
    createAccountVerificationSession,
    updateAccountVerifications,
    appyForResubmissionServices,
    approvedVerificationServices,
    DeclinedVerificationServices,
    getAccountVerificationStatusServices,
    sendVerificationServices,
    createBusinessAccountVerificationServices
};
