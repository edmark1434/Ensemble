import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";
import useGlobalState from "@/lib/global_state";

// Custom hook for Google OAuth signup
export const useGoogleAuth = () => {
  const { setUser, setIsAuthenticated, setAccessToken } = useGlobalState();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

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
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        setIsAuthenticated(true);
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

  return handleGoogleSignIn;
};