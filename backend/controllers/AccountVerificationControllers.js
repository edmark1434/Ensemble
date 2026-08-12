const {
    createAccountVerificationSession,
    appyForResubmissionServices,
    getAccountVerificationStatusServices,
    sendVerificationServices,
    createBusinessAccountVerificationServices
} = require('../services/AccountVerificationServices');
const {
    updateAccountVerificationSessionStatus,
    updateAccountVerifications,
    getAccountVerificationSessionBySessionId
} = require('../repositories/AccountVerificationRepositories');

const {
    updateUserDetailsByAccountId
} = require('../repositories/UserRepositories');

const {
    createNotification
} = require('../repositories/NotificationRepositories');

const {getIo} = require('../lib/WebSocket');

const redisClient = require('../lib/Redis');
const {
    getTeamOwnerVerificationEligibility
} = require('../repositories/TeamsRepositories');

async function createAccountVerificationController(req,res){
    try{
        const { userId } = req.session;
        const session = await createAccountVerificationSession(userId);
        res.status(200).json({ message: "Account verification session created successfully", session });
    }catch(err){
        console.error("Error creating account verification session:", err);
        res.status(500).json({ error: "Failed to create account verification session" });
    }
}

async function createBusinessVerificationController(req,res){
    try{
        const {
            account_id,
            business_type,
            registered_business_name,
            registration_number,
            registration_country,
            relationship_to_business,
            documents
        } = req.body || {};
        const requesterAccountId = req.session.account_id;

        const eligibility = await getTeamOwnerVerificationEligibility(
            account_id,
            requesterAccountId
        );

        if (!eligibility.is_owner) {
            return res.status(403).json({
                success: false,
                message: "Only the active Team owner can submit business verification"
            });
        }

        if (!eligibility.is_verified) {
            return res.status(403).json({
                success: false,
                message: "Verify your personal account before submitting business verification"
            });
        }

        const response = await createBusinessAccountVerificationServices(
            account_id,
            requesterAccountId,
            {
                business_type,
                registered_business_name,
                registration_number,
                registration_country,
                relationship_to_business
            },
            documents
        );
        res.status(201).json({
            success: true,
            message: "Business verification submitted for manual review",
            data: response
        });
    }catch(err){
        console.error("Error creating business verification:", err);
        res.status(400).json({
            success: false,
            message: err.message || "Failed to create business verification"
        });
    }
}

async function handleVerificationWebhookStatusUpdated(req, res) {
    try {
        const io = getIo();
        const {
            session_id: sessionId,
            status,
        } = req.body;
        if (!sessionId || !status) return res.status(400).json({ success: false, message: 'Invalid verification webhook payload' });
        const session = await getAccountVerificationSessionBySessionId(sessionId);
        if (!session?.account_id) return res.status(404).json({ success: false, message: 'Verification session not found' });
        const accountId = session.account_id;

        // Ignore Kyc Expired completely
        if (status === "Kyc Expired") {
            return res.status(200).json({
                message: "Kyc Expired ignored.",
            });
        }

        const payload = {
            kyc_status: status,
        };

        switch (status) {
            case "Approved":
            case "In Review": {
                payload.verification_status = status;
                if(status === "Approved"){
                    const existingExpiry = session?.expires_at ? new Date(session.expires_at) : null;
                    // Admin approval stores a custom future expiry before asking Didit to approve.
                    // A normal user-completed session has no expiry yet and receives the one-year default.
                    if (existingExpiry && existingExpiry.getTime() > Date.now()) {
                        payload.expires_at = existingExpiry;
                    } else {
                        const expiresAt = new Date();
                        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                        payload.expires_at = expiresAt;
                    }
                    const result = await updateAccountVerifications(accountId, { is_verified: true, verified_at: new Date(),verification_session_id: session?.verification_session_id || null });
                
                    const notification = await createNotification({
                        message: `Your account verification has been approved.`,
                        is_read: false,
                        reference_table: "verifications",
                        reference_prefix: "VERIFICATION",
                        reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                        reference_id: result.verification_id,
                        account_id: accountId
                    });
                    io.to(notification.account_id).emit("notification", notification);
                }
                
                const verification =
                    req.body.decision?.id_verifications?.[0];

                if (verification) {
                    let firstName = verification.first_name || "";
                    const middleName =
                        verification.extra_fields?.middle_name || "";

                    // Remove middle name if appended to first name
                    if (
                        middleName &&
                        firstName
                            .toLowerCase()
                            .endsWith(` ${middleName.toLowerCase()}`)
                    ) {
                        firstName = firstName
                            .slice(0, firstName.length - middleName.length)
                            .trim();
                    }

                    const verificationDetails = {
                        first_name: firstName,
                        middle_name: middleName,
                        last_name: verification.last_name,
                        birth_date: verification.date_of_birth,
                    };

                    if (verification.extra_fields?.suffix) {
                        verificationDetails.suffix = verification.extra_fields.suffix;
                    }
                    await updateUserDetailsByAccountId(accountId, verificationDetails);

                    // TODO:
                    // await saveVerificationDetails(sessionId, verificationDetails);
                }

                break;
            }

            case "Declined":
                await updateAccountVerifications(accountId, { is_verified: false, verified_at: null });
                const notificationDeclined = await createNotification({
                    message: `Your account verification has been declined. Please complete the verification again.`,
                    is_read: false,
                    reference_table: "verifications",
                    reference_prefix: "VERIFICATION",
                    reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                    reference_id: accountId,
                    account_id: accountId
                });
                io.to(notificationDeclined.account_id).emit("notification", notificationDeclined);
                await applyForResubmission(sessionId, accountId);
                payload.kyc_status = "Resubmitted";
                payload.verification_status = "Pending";
                payload.expires_at = null;
                break;
            case "Expired":
            case "Abandoned":
                payload.verification_status = "Rejected";
                payload.expires_at = null;
                const notificationRejected = await createNotification({
                    message: `Your account verification session has expired or was abandoned.`,
                    is_read: false,
                    reference_table: "verifications",
                    reference_prefix: "VERIFICATION",
                    reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                    reference_id: accountId,
                    account_id: accountId
                });
                io.to(notificationRejected.account_id).emit("notification", notificationRejected);
                break;

            case "Not Started":
            case "In Progress":
            case "Awaiting User":
            case "Resubmitted":
                if(status === "Resubmitted"){
                    await updateAccountVerifications(accountId, { is_verified: false, verified_at: null });
                    payload.expires_at = null;
                }
                payload.verification_status = "Pending";
                const notificationPending = await createNotification({
                    message: `Your are required to complete the verification process.`,
                    is_read: false,
                    reference_table: "verifications",
                    reference_prefix: "VERIFICATION",
                    reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                    reference_id: accountId,
                    account_id: accountId
                });
                io.to(notificationPending.account_id).emit("notification", notificationPending);
                break;

            default:
                console.warn(`Unknown Didit status: ${status}`);
                break;
        }

        await updateAccountVerificationSessionStatus(sessionId, payload);

        return res.status(200).json({
            message: "Webhook received successfully",
        });
    } catch (err) {
        console.error("Error handling verification webhook:", err);

        return res.status(500).json({
            error: "Failed to handle verification webhook",
        });
    }
}

async function applyForResubmission(sessionId, accountId) {
    try{
        const response = await appyForResubmissionServices(sessionId, accountId);
        return response;
    }catch(err){
        console.error("Error applying for resubmission:", err);
        throw err;
    }
}

async function getAccountVerificationStatusController(req, res) {
    try{
        const {account_id} = req.session;
        const verificationStatus = await getAccountVerificationStatusServices(account_id);
        return res.status(200).json({
            success: true,
            data: verificationStatus
        });
    }catch(err){
        console.error("Error fetching account verification status:", err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while fetching the account verification status. Please try again.'
        });
    }
}

async function sendVerificationController(req, res) { 
    const { email, first_name, last_name } = req.body;
    try {
        const sixDigits = await sendVerificationServices(email, first_name, last_name);
        return res.status(200).json({
            success: true,
            message: 'Verification email sent successfully',
        });
    } catch (err) {
        console.error("Error sending verification email:", err);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while sending the verification email. Please try again.'
        });
    }
}

async function verifyCode(req, res) { 
    const { email, code } = req.body;
    try {
        const storedCode = await redisClient.get(`verification_code:${email}`);
        if (!storedCode) {
            return res.status(400).json({
                success: false,
                message: 'Verification code has expired or does not exist',
            });
        }
        if (storedCode !== code) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification code',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Verification code is valid',
        });
    } catch (err) {
        console.error('Error verifying code:', err);
        if (err instanceof ServiceError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                details: err.details || null,
            });
        }
    }
}

module.exports = {
    createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,
    getAccountVerificationStatusController,
    sendVerificationController,
    verifyCode,
    createBusinessVerificationController
};
