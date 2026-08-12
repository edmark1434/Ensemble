const axios = require('axios');

async function testInbox() {
  try {
    // We expect a 401 Unauthorized if the cookie is missing,
    // but if it returns 400 Bad Request even without a cookie, 
    // it means there's a routing or middleware issue throwing 400.
    const res = await axios.get('http://localhost:4000/api/inbox');
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

testInbox();
