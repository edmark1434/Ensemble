const {
    createAccountVerificationSession 
} = require('../Services/AccountVerificationServices');
const {
    updateAccountVerificationSessionStatus
} = require('../Repositories/AccountVerificationRepositories');

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
            case "In Review":
                payload.verification_status = "In Review";
                break;

            case "Declined":
            case "Expired":
            case "Abandoned":
                payload.verification_status = "Rejected";
                break;

            case "Not Started":
            case "In Progress":
            case "Awaiting User":
            case "Resubmitted":
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




module.exports = {
    createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,

};
