const {
    createAccountVerificationSession,
    appyForResubmissionServices,
    getAccountVerificationStatusServices,
    sendVerificationServices
} = require('../Services/AccountVerificationServices');
const {
    updateAccountVerificationSessionStatus,
    updateAccountVerifications,
    getAccountVerificationSessionBySessionId
} = require('../Repositories/AccountVerificationRepositories');

const {
    updateUserDetailsByAccountId
} = require('../Repositories/UserRepositories');

const {
    createNotification
} = require('../Repositories/NotificationRepositories');

const {getIo} = require('../lib/websocket');

const redisClient = require('../lib/redis');

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

async function handleVerificationWebhookStatusUpdated(req, res) {
    try {
        console.log("Received verification webhook:", req.body);
        const io = getIo();
        io.emit("verificationWebhook", req.body);
        const {
            session_id: sessionId,
            status,
        } = req.body;

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
                    const expiresAt = new Date();
                    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
                    payload.expires_at = expiresAt;
                    const session = await getAccountVerificationSessionBySessionId(sessionId);
                    console.log("Updating account verification status to verified for account:", session.verification_session_id);
                    const result = await updateAccountVerifications(req.body.metadata?.account_id, { is_verified: true, verified_at: new Date(),verification_session_id: session?.verification_session_id || null });
                
                    const notification = await createNotification({
                        message: `Your account verification has been approved.`,
                        is_read: false,
                        reference_table: "verifications",
                        reference_prefix: "VERIFICATION",
                        reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                        reference_id: result.verification_id,
                        account_id: req.body.metadata?.account_id
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
                    console.log("Updating user details with verification details:", verificationDetails);
                    await updateUserDetailsByAccountId(req.body.metadata?.account_id, verificationDetails);

                    // TODO:
                    // await saveVerificationDetails(sessionId, verificationDetails);
                }

                break;
            }

            case "Declined":
                await updateAccountVerifications(req.body.metadata?.account_id, { is_verified: false, verified_at: null });
                const notificationDeclined = await createNotification({
                    message: `Your account verification has been declined.`,
                    is_read: false,
                    reference_table: "verifications",
                    reference_prefix: "VERIFICATION",
                    reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                    reference_id: req.body.metadata?.account_id,
                    account_id: req.body.metadata?.account_id
                });
                io.to(notificationDeclined.account_id).emit("notification", notificationDeclined);
                payload.verification_status = "Rejected";
                const data = await applyForResubmission(sessionId,req.body.metadata?.account_id);
                payload.verification_status = "Pending";
                break;
            case "Expired":
            case "Abandoned":
                payload.verification_status = "Rejected";
                const notificationRejected = await createNotification({
                    message: `Your account verification session has expired or was abandoned.`,
                    is_read: false,
                    reference_table: "verifications",
                    reference_prefix: "VERIFICATION",
                    reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                    reference_id: req.body.metadata?.account_id,
                    account_id: req.body.metadata?.account_id
                });
                io.to(notificationRejected.account_id).emit("notification", notificationRejected);
                break;

            case "Not Started":
            case "In Progress":
            case "Awaiting User":
            case "Resubmitted":
                if(status === "Resubmitted"){
                    await updateAccountVerifications(req.body.metadata?.account_id, { is_verified: false, verified_at: null });
                }
                payload.verification_status = "Pending";
                const notificationPending = await createNotification({
                    message: `Your are required to complete the verification process.`,
                    is_read: false,
                    reference_table: "verifications",
                    reference_prefix: "VERIFICATION",
                    reference_path: `${req.body?.decision?.session_url || `${process.env.FRONTEND_URL}/account-verification-status`}`,
                    reference_id: req.body.metadata?.account_id,
                    account_id: req.body.metadata?.account_id
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
    verifyCode
};
