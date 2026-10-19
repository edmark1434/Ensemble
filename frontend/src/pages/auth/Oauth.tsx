import { signInWithPopup, signOut, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import axios from "axios";
import useGlobalState from "@/lib/global_state";
import { standingFromPayload, type AccountStanding } from "@/components/ui/AccountStanding";

import { notifyOnboardingCompleted, notifyOnboardingStepChanged } from "@/lib/onboardingEvents";

// Custom hook for Google OAuth signup
export const useGoogleAuth = (onRestricted?: (standing: AccountStanding) => void) => {
  const { setUser, setIsAuthenticated } = useGlobalState();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const payload = {
        email: user.email,
        firebase_user_uuid: user.uid,
        firebaseIdToken: await user.getIdToken(),
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
        const loggedUser = response.data.credentials ?? response.data.result;
        setUser(loggedUser);
        setIsAuthenticated(true);
        const onboarding = response.data.onboarding ?? loggedUser?.onboarding;
        const accountId = loggedUser?.account_id || loggedUser?.accountId;
        if (onboarding?.completed && accountId) {
          notifyOnboardingCompleted(String(accountId));
        } else if (onboarding?.path && accountId) {
          notifyOnboardingStepChanged(onboarding.path, String(accountId));
        }
      } else {
        console.error('OAuth signup failed:', response.data.message);
      }
    } catch (error) {
      console.error('OAuth error:', error);
      if (axios.isAxiosError(error)) {
        const standing = standingFromPayload(error.response?.data);
        if (standing) {
          await signOut(auth).catch(() => undefined);
          onRestricted?.(standing);
          window.dispatchEvent(new CustomEvent('ensemble:account-restricted', {
            detail: error.response?.data,
          }));
        }
        console.error('Backend error:', error.response?.data?.message);
      }
    }
  };

  return handleGoogleSignIn;
};
