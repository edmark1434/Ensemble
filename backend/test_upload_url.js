const axios = require('axios');

async function testUploadUrl() {
  try {
    const res = await axios.post('http://localhost:4000/api/files/upload-url', {
      folder: "gallery",
      filename: "test.png",
      contentType: "image/png"
    }, {
      // Need a valid token to test this, so we might get 401 Unauthorized, 
      // but if we get 400 it means something is wrong with the body parsing
    });
    console.log("Success:", res.data);
  } catch (err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", err.response.data);
    } else {
      console.log("Error:", err.message);
    }
  }
}

testUploadUrl();
