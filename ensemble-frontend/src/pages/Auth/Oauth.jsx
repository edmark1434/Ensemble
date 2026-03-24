import { getAuth, signInWithPopup, GoogleAuthProvider,getAdditionalUserInfo } from "firebase/auth";
import app from "../../firebase";
export const GoogleAuth = () => {
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider(); // <-- define provider

  signInWithPopup(auth, provider)
    .then((result) => {
      // Google Access Token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      // Signed-in user info
      const user = result.user;

      // Additional info (like new user)
      const additionalInfo = getAdditionalUserInfo(result);

      console.log("User:", user);
      console.log("Token:", token);
      console.log("Additional Info:", additionalInfo);

      // Here you can send token to your backend for DB storage
    })
    .catch((error) => {
      const errorCode = error.code;
      const errorMessage = error.message;
      const email = error.customData?.email; // optional chaining
      const credential = GoogleAuthProvider.credentialFromError(error);

      console.error("Error code:", errorCode);
      console.error("Error message:", errorMessage);
      console.error("Email:", email);
      console.error("Credential:", credential);
    });
};