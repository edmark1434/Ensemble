const {
    createAccountVerificationSession,
    getAccountVerificationStatusServices,
    sendVerificationServices,
    createBusinessAccountVerificationServices,
    processDiditVerificationStatusUpdate
} = require('../services/AccountVerificationServices');

const redisClient = require('../lib/Redis');
const {
    getTeamOwnerVerificationEligibility
} = require('../repositories/TeamsRepositories');

async function createAccountVerificationController(req,res){
    try{
        const { account_id } = req.session;
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
        const result = await processDiditVerificationStatusUpdate(req.body);
        if (!result.found) {
            return res.status(404).json({ success: false, message: 'Verification session not found' });
        }

        return res.status(200).json({
            message: "Webhook received successfully",
        });
    } catch (err) {
        console.error("Error handling verification webhook:", err);

        return res.status(err.statusCode || 500).json({
            error: "Failed to handle verification webhook",
        });
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
    forceVerifyController,
    createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,
    getAccountVerificationStatusController,
    sendVerificationController,
    verifyCode,
    createBusinessVerificationController
};


async function forceVerifyController(req, res) {
    try {
        const { account_id } = req.session;
        const { is_verified } = req.body;
        
        const { updateAccountVerifications } = require('../repositories/AccountVerificationRepositories');
        
        await updateAccountVerifications(account_id, {
            is_verified: is_verified,
            verified_at: is_verified ? new Date() : null
        });

        res.status(200).json({ message: "Verification status forced successfully", is_verified });
    } catch(err) {
        console.error("Error forcing verification:", err);
        res.status(500).json({ error: "Failed to force verification" });
    }
}
