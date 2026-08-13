const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const countries = require("i18n-iso-countries");
const en = require("i18n-iso-countries/langs/en.json");

countries.registerLocale(en);

const {
    getUserById,
} = require("../repositories/UserRepositories");

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
    createBusinessVerificationSubmissionRepository,
    getAccountVerificationSessionBySessionId,
    getPendingDiditVerificationSessions
} = require("../repositories/AccountVerificationRepositories");

const {
    getEmailAddressByAccountId
} = require("../repositories/ProfileRepositories");


const {
    sendVerificationEmail
} = require('../services/UserServices')

const {
    checkAccountId
} = require('../repositories/AccountRepositories')

const redisClient = require('../lib/Redis');
const { createNotification } = require('../repositories/NotificationRepositories');
const { updateUserDetailsByAccountId } = require('../repositories/UserRepositories');
const { getIo } = require('../lib/WebSocket');

function getDecisionPayload(payload) {
    return payload?.decision?.decision
        || payload?.data?.decision
        || payload?.decision
        || payload?.data
        || {};
}

async function processDiditVerificationStatusUpdate(webhookPayload) {
    const sessionId = webhookPayload?.session_id;
    const status = webhookPayload?.status;
    if (!sessionId || !status) {
        const error = new Error('Invalid verification status payload');
        error.statusCode = 400;
        throw error;
    }

    const session = await getAccountVerificationSessionBySessionId(sessionId);
    if (!session?.account_id) return { found: false };
    if (status === 'Kyc Expired') return { found: true, ignored: true };

    // Webhooks and reconciliation may deliver the same provider status more than once.
    // Reapplying it would duplicate notifications and side effects.
    if (session.kyc_status === status) return { found: true, unchanged: true };

    const accountId = session.account_id;
    const io = getIo();
    const decision = getDecisionPayload(webhookPayload);
    const referencePath = decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`;
    const notify = async (message, referenceId) => {
        const notification = await createNotification({
            message,
            is_read: false,
            reference_table: 'verifications',
            reference_prefix: 'VERIFICATION',
            reference_path: referencePath,
            reference_id: referenceId,
            account_id: accountId
        });
        io.to(notification.account_id).emit('notification', notification);
    };

    const payload = { kyc_status: status };
    switch (status) {
        case 'Approved':
        case 'In Review': {
            payload.verification_status = status;
            if (status === 'Approved') {
                const existingExpiry = session.expires_at ? new Date(session.expires_at) : null;
                if (existingExpiry && existingExpiry.getTime() > Date.now()) {
                    payload.expires_at = existingExpiry;
                } else {
                    const expiresAt = new Date();
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                    payload.expires_at = expiresAt;
                }
                const result = await updateAccountVerifications(accountId, {
                    is_verified: true,
                    verified_at: new Date(),
                    verification_session_id: session.verification_session_id || null
                });
                await notify('Your account verification has been approved.', result?.verification_id || accountId);
            }

            const verification = decision?.id_verifications?.[0];
            if (verification) {
                let firstName = verification.first_name || '';
                const middleName = verification.extra_fields?.middle_name || '';
                if (middleName && firstName.toLowerCase().endsWith(` ${middleName.toLowerCase()}`)) {
                    firstName = firstName.slice(0, firstName.length - middleName.length).trim();
                }
                const verificationDetails = {
                    first_name: firstName,
                    middle_name: middleName,
                    last_name: verification.last_name,
                    birth_date: verification.date_of_birth,
                };
                if (verification.extra_fields?.suffix) verificationDetails.suffix = verification.extra_fields.suffix;
                await updateUserDetailsByAccountId(accountId, verificationDetails);
            }
            break;
        }
        case 'Declined':
            await updateAccountVerifications(accountId, { is_verified: false, verified_at: null });
            await notify('Your account verification has been declined. Please complete the verification again.', accountId);
            await appyForResubmissionServices(sessionId, accountId, 'Please redo the required verification steps', {
                idDocument: true,
                liveness: true,
                faceMatch: true,
                ipAnalysis: true,
            });
            payload.kyc_status = 'Resubmitted';
            payload.verification_status = 'Pending';
            payload.expires_at = null;
            break;
        case 'Expired':
        case 'Abandoned':
            payload.verification_status = 'Rejected';
            payload.expires_at = null;
            await notify('Your account verification session has expired or was abandoned.', accountId);
            break;
        case 'Not Started':
        case 'In Progress':
        case 'Awaiting User':
        case 'Resubmitted':
            if (status === 'Resubmitted') {
                await updateAccountVerifications(accountId, { is_verified: false, verified_at: null });
                payload.expires_at = null;
            }
            payload.verification_status = 'Pending';
            await notify('You are required to complete the verification process.', accountId);
            break;
        default:
            return { found: true, ignored: true };
    }

    const updatedSession = await updateAccountVerificationSessionStatus(sessionId, payload);
    return { found: true, updated: true, session: updatedSession };
}

async function reconcileDiditVerificationSessionsServices() {
    if (!process.env.DIDIT_API_KEY) {
        console.warn('Skipping Didit verification reconciliation: DIDIT_API_KEY is not configured.');
        return { checked: 0, updated: 0, skipped: true };
    }

    const sessions = await getPendingDiditVerificationSessions();
    let updated = 0;
    for (const session of sessions) {
        try {
            const response = await axios.get(
                `https://verification.didit.me/v3/session/${encodeURIComponent(session.didit_session_id)}/decision/`,
                { headers: { 'x-api-key': process.env.DIDIT_API_KEY, Accept: 'application/json' } }
            );
            const providerPayload = response.data?.data || response.data || {};
            const result = await processDiditVerificationStatusUpdate({
                ...providerPayload,
                session_id: providerPayload.session_id || session.didit_session_id,
                status: providerPayload.status,
                decision: providerPayload.decision || providerPayload,
            });
            if (result.updated) updated += 1;
        } catch (error) {
            console.error(`Didit verification reconciliation failed for session ${session.verification_session_id}:`, error.response?.status || error.message);
        }
    }
    return { checked: sessions.length, updated, skipped: false };
}

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
                callback: `${process.env.FRONTEND_URL}/account-verification-status`,
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


async function appyForResubmissionServices(sessionId,accountId,comment = "Please redo the required verification steps", requirements = {}) {
    const emailResponse = await getEmailAddressByAccountId(accountId);
    const selected = {
        idDocument: requirements?.idDocument === true,
        liveness: requirements?.liveness === true,
        faceMatch: requirements?.faceMatch === true,
        ipAnalysis: requirements?.ipAnalysis === true,
    };
    if (!Object.values(selected).some(Boolean)) {
        const error = new Error('Select at least one verification item to resubmit');
        error.statusCode = 400;
        throw error;
    }
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
                ...(selected.idDocument
                    ? (decision.id_verifications || []).map(({ node_id }) => ({ node_id, feature: "OCR" }))
                    : []),
                ...(selected.liveness
                    ? (decision.liveness_checks || []).map(({ node_id }) => ({ node_id, feature: "LIVENESS" }))
                    : []),
                ...(selected.faceMatch
                    ? (decision.face_matches || []).map(({ node_id }) => ({ node_id, feature: "FACE_MATCH" }))
                    : []),
                ...(selected.ipAnalysis
                    ? (decision.ip_analyses || []).map(({ node_id }) => ({ node_id, feature: "IP_ANALYSIS" }))
                    : []),
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
        if (!nodesToResubmit.length) {
            const error = new Error('The selected verification items are unavailable for this Didit session');
            error.statusCode = 422;
            throw error;
        }
        updatePayload.nodes_to_resubmit = nodesToResubmit;

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

const BUSINESS_DOCUMENT_REQUIREMENTS = {
    "Sole Proprietorship": ["DTI_CERTIFICATE"],
    "One Person Corporation": ["SEC_CERTIFICATE"],
    Corporation: ["SEC_CERTIFICATE"],
    Partnership: ["SEC_CERTIFICATE"],
    Cooperative: ["CDA_CERTIFICATE"],
    "Non-Profit Organization": ["NON_PROFIT_REGISTRATION"],
    "Educational Institution": ["GOVERNMENT_RECOGNITION"],
    "Government Organization": ["GOVERNMENT_AUTHORIZATION"],
    "Foreign Registered Business": ["FOREIGN_BUSINESS_REGISTRATION"],
    Other: ["OTHER_BUSINESS_DOCUMENT"],
};

const BUSINESS_DOCUMENT_OPTIONS = {
    "Sole Proprietorship": ["DTI_CERTIFICATE", "BIR_CERTIFICATE", "BUSINESS_PERMIT"],
    "One Person Corporation": ["SEC_CERTIFICATE", "GENERAL_INFORMATION_SHEET", "ARTICLES_OF_INCORPORATION", "BIR_CERTIFICATE", "BUSINESS_PERMIT"],
    Corporation: ["SEC_CERTIFICATE", "GENERAL_INFORMATION_SHEET", "ARTICLES_OF_INCORPORATION", "BIR_CERTIFICATE", "BUSINESS_PERMIT"],
    Partnership: ["SEC_CERTIFICATE", "PARTNERSHIP_REGISTRATION", "BIR_CERTIFICATE"],
    Cooperative: ["CDA_CERTIFICATE", "CERTIFICATE_OF_COMPLIANCE"],
    "Non-Profit Organization": ["NON_PROFIT_REGISTRATION", "SEC_CERTIFICATE", "BIR_CERTIFICATE"],
    "Educational Institution": ["GOVERNMENT_RECOGNITION"],
    "Government Organization": ["GOVERNMENT_AUTHORIZATION"],
    "Foreign Registered Business": ["FOREIGN_BUSINESS_REGISTRATION"],
    Other: ["OTHER_BUSINESS_DOCUMENT"],
};

const BUSINESS_RELATIONSHIPS = new Set([
    "Owner",
    "Sole Proprietor",
    "Director",
    "Partner",
    "President",
    "Corporate Officer",
    "Authorized Representative",
    "Employee",
    "Other",
]);

const RELATIONSHIPS_REQUIRING_AUTHORIZATION = new Set([
    "Authorized Representative",
    "Employee",
    "Other",
]);

const AUTHORIZATION_DOCUMENT_TYPES = new Set([
    "AUTHORIZATION_LETTER",
    "SECRETARY_CERTIFICATE",
    "BOARD_RESOLUTION",
    "SPECIAL_POWER_OF_ATTORNEY",
    "PROOF_OF_EMPLOYMENT",
    "OTHER_AUTHORIZATION",
]);

async function createBusinessAccountVerificationServices(
    accountId,
    submitterAccountId,
    businessDetails,
    documents
) {
    if (!(await checkAccountId(accountId))) {
        throw new Error("Invalid accountId");
    }

    const normalizedDetails = {
        business_type: String(businessDetails?.business_type || "").trim(),
        registered_business_name: String(
            businessDetails?.registered_business_name || ""
        ).trim(),
        registration_number: String(
            businessDetails?.registration_number || ""
        ).trim(),
        registration_country: String(
            businessDetails?.registration_country || ""
        ).trim(),
        relationship_to_business: String(
            businessDetails?.relationship_to_business || ""
        ).trim(),
    };

    if (!BUSINESS_DOCUMENT_REQUIREMENTS[normalizedDetails.business_type]) {
        throw new Error("Invalid business type");
    }
    if (!normalizedDetails.registered_business_name) {
        throw new Error("Registered business name is required");
    }
    if (!normalizedDetails.registration_number) {
        throw new Error("Registration number is required");
    }
    if (!normalizedDetails.registration_country) {
        throw new Error("Registration country is required");
    }
    if (!BUSINESS_RELATIONSHIPS.has(normalizedDetails.relationship_to_business)) {
        throw new Error("Invalid relationship to business");
    }

    if (!Array.isArray(documents) || documents.length === 0) {
        throw new Error("No files provided for verification");
    }
    if (documents.length > 10) {
        throw new Error("A maximum of 10 files can be submitted");
    }

    const allowedBusinessDocumentTypes = new Set([
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    ]);

    const seenDocumentTypes = new Set();
    const sanitizedDocuments = documents.map((document) => {
        const documentType = String(document?.document_type || "").trim();
        const file = document?.file || {};
        const { name, path, mime_type, size_bytes } = file;
        if (!documentType || seenDocumentTypes.has(documentType)) {
            throw new Error("Each document type can only be submitted once");
        }
        const isAuthorizationDocument = AUTHORIZATION_DOCUMENT_TYPES.has(documentType);
        const isBusinessDocument = BUSINESS_DOCUMENT_OPTIONS[
            normalizedDetails.business_type
        ].includes(documentType);
        if (!isBusinessDocument && !isAuthorizationDocument) {
            throw new Error("Document type is not valid for the selected business type");
        }
        if (isAuthorizationDocument && !RELATIONSHIPS_REQUIRING_AUTHORIZATION.has(
            normalizedDetails.relationship_to_business
        )) {
            throw new Error("Authorization document is not valid for this relationship");
        }
        seenDocumentTypes.add(documentType);
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
            document_type: documentType,
            is_required:
                BUSINESS_DOCUMENT_REQUIREMENTS[normalizedDetails.business_type].includes(
                    documentType
                ) || isAuthorizationDocument,
            file: {
                name: String(name).trim(),
                path: String(path).trim(),
                mime_type: String(mime_type).trim(),
                size_bytes,
            },
        };
    });

    const missingRequiredDocument = BUSINESS_DOCUMENT_REQUIREMENTS[
        normalizedDetails.business_type
    ].find((documentType) => !seenDocumentTypes.has(documentType));
    if (missingRequiredDocument) {
        throw new Error(`Required document is missing: ${missingRequiredDocument}`);
    }

    if (
        RELATIONSHIPS_REQUIRING_AUTHORIZATION.has(
            normalizedDetails.relationship_to_business
        ) &&
        ![...seenDocumentTypes].some((type) =>
            AUTHORIZATION_DOCUMENT_TYPES.has(type)
        )
    ) {
        throw new Error("An authorization document is required for this relationship");
    }

    return createBusinessVerificationSubmissionRepository(
        accountId,
        submitterAccountId,
        normalizedDetails,
        sanitizedDocuments
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
    createBusinessAccountVerificationServices,
    processDiditVerificationStatusUpdate,
    reconcileDiditVerificationSessionsServices
};
