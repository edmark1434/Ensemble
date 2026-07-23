const {
    createAccountVerificationSession 
} = require('../Services/AccountVerificationServices');

async function createAccountVerificationController(req,res){
    try{
        const session = await createAccountVerificationSession();
        res.status(200).json({ message: "Account verification session created successfully", session });
    }catch(err){
        console.error("Error creating account verification session:", err);
        res.status(500).json({ error: "Failed to create account verification session" });
    }
}

async function handleVerificationWebhookStatusUpdated(req, res) {
    try{
        console.log("Received verification webhook:", req.body);
        res.status(200).json({ message: "Webhook received successfully" });
    }catch(err){
        console.error("Error handling verification webhook:", err);
        res.status(500).json({ error: "Failed to handle verification webhook" });
    }
}




module.exports = {
    createAccountVerificationController,
    handleVerificationWebhookStatusUpdated,

};
