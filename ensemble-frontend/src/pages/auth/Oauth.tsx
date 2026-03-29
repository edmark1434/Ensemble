import { signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";
import {auth} from "../firebase";
import axios from "axios";

export const GoogleAuth = async () => {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const additionalInfo = getAdditionalUserInfo(result);

    console.log("Firebase User:", user);
    console.log("Is New User:", additionalInfo?.isNewUser);

    const payload = {
      email: user.email,
      firebase_user_uuid: user.uid,
      firstName: user.displayName?.split(' ')[0] || 'User',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
      signUpWithOAuth: true,
    };

    const response = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/users/signup`,
      payload,
      { withCredentials: true }
    );

    if (response.data.success) {
      console.log('OAuth signup/login successful:', response.data);
      localStorage.setItem('accessToken', response.data.accessToken);
      window.location.href = '/dashboard';
    } else {
      console.error('OAuth signup failed:', response.data.message);
    }
  } catch (error) {
    console.error('OAuth error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Backend error:', error.response?.data?.message);
    }
  }
};