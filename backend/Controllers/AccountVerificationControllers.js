const {
    createAccountVerificationSession,
    appyForResubmissionServices,
    getAccountVerificationStatusServices
} = require('../Services/AccountVerificationServices');
const {
    updateAccountVerificationSessionStatus,
    updateAccountVerifications,
    getAccountVerificationSessionBySessionId
} = require('../Repositories/AccountVerificationRepositories');

const {
    updateUserDetailsByAccountId
} = require('../Repositories/UserRepositories');

const {getIo} = require('../lib/websocket');

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
                    await updateAccountVerifications(req.body.metadata?.account_id, { is_verified: true, verified_at: new Date(),verification_session_id: session?.verification_session_id || null });
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
                const data = await applyForResubmission(sessionId,req.body.metadata?.account_id);
                payload.verification_status = "Pending";
                break;
            case "Expired":
            case "Abandoned":
                payload.verification_status = "Rejected";
                break;

            case "Not Started":
            case "In Progress":
            case "Awaiting User":
            case "Resubmitted":
                if(status === "Resubmitted"){
                    await updateAccountVerifications(req.body.metadata?.account_id, { is_verified: false, verified_at: null });
                }
                payload.verification_status = "Pending";
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

module.exports = {
    createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,
    getAccountVerificationStatusController
};
