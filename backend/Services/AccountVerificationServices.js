const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();


async function createAccountVerificationSession() {
  try {
    const response = await axios.post(
      "https://verification.didit.me/v3/session/",
      {
        workflow_id: "11111111-2222-3333-4444-555555555555",
        vendor_data: "user-123",
        callback: "https://example.com/verification/callback",
        callback_method: "both",
        metadata: {
          user_type: "premium",
          account_id: "ABC123",
        },
        language: "en",
        contact_details: {
          email: "john.doe@example.com",
          send_notification_emails: true,
          email_lang: "en",
          phone: "+14155552671",
        },
        expected_details: {
          first_name: "John",
          last_name: "Doe",
          date_of_birth: "1990-05-15",
          id_country: "USA",
          expected_document_types: ["P", "ID"],
        },
      },
      {
        headers: {
          "x-api-key": process.env.DIDIT_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Session created successfully");
    console.log(response.data);

    console.log("Session ID:", response.data.session_id);
    console.log("Verification URL:", response.data.url);

    return response.data;
  } catch (error) {
    console.error(
      "Failed to create session:",
      error.response?.data || error.message
    );
    throw error;
  }
}


 

module.exports = {
    createAccountVerificationSession,
};
