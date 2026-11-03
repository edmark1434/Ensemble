import {create} from 'zustand'

// Define User type
// interface User {
//   id:    number
//   name:  string
//   email: string
//   role:  string
//   plan?: string        // optional
// }

// Define Store type
interface GlobalState {
  // State
  isSidebarCollapsed: boolean
  user:            any | null
  isGuestMode:     boolean
  isAuthenticated: boolean
  isLoading:       boolean
  accessToken:     string | null
  signUpData:      any | null
  theme:           'light' | 'dark'
  isVerificationModalOpen: boolean
  verificationModalMessage?: string
  isVerified: boolean
  subscriptionPlan: string | null
  isFloatingChatHidden: boolean
  isDevModeOpen: boolean

  // Actions
  setIsSidebarCollapsed: (isCollapsed: boolean) => void
  setUser:            (user: any) => void
  setSubscriptionPlan: (plan: string) => void
  setIsGuestMode:     (isGuestMode: boolean) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  setIsLoading:       (isLoading: boolean) => void
  clearUser:          () => void
  setAccessToken: (accessToken: string) => void
  setSignUpData: (data: any) => void
  setTheme: (theme: 'light' | 'dark') => void
  setIsVerificationModalOpen: (isOpen: boolean, message?: string) => void
  setIsVerified: (isVerified: boolean) => void
  setIsFloatingChatHidden: (hidden: boolean) => void
  setIsDevModeOpen: (isOpen: boolean) => void
}

// Pass type to create<GlobalState>
const useGlobalState = create<GlobalState>((set) => ({
  // Initial state
  isSidebarCollapsed: false,
  user:            null,
  isGuestMode:     localStorage.getItem('isGuestMode') === 'true',
  isAuthenticated: false,
  isLoading:       false,
  accessToken: null,
  signUpData: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',
  isVerificationModalOpen: false,
  verificationModalMessage: undefined,
  isVerified: typeof window !== 'undefined' ? localStorage.getItem('ensemble:is_verified') === 'true' : false,
  subscriptionPlan: null,
  isFloatingChatHidden: false,
  isDevModeOpen: false,

  // Actions
  setIsSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
  setIsFloatingChatHidden: (hidden) => set({ isFloatingChatHidden: hidden }),
  setIsDevModeOpen: (isOpen) => set({ isDevModeOpen: isOpen }),
  setSubscriptionPlan: (plan: string) => set({ subscriptionPlan: plan }),
  setUser:            (user) => {
    localStorage.setItem('isGuestMode', 'false');
    const isVerified = user?.is_verified ?? user?.isVerified ?? (user?.verification_status === true || user?.verification_status === "Verified");
    if (typeof isVerified === 'boolean') {
      try {
        localStorage.setItem('ensemble:is_verified', String(isVerified));
      } catch (_) {}
    }
    set({
      user,
      isAuthenticated: true,
      isGuestMode: false,
      ...(typeof isVerified === 'boolean' ? { isVerified } : {}),
    });
  },
  setIsGuestMode:     (isGuestMode) => {
    localStorage.setItem('isGuestMode', String(isGuestMode));
    set({ isGuestMode });
  },
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading:       (isLoading) => set({ isLoading }),
  clearUser:          () => {
    localStorage.setItem('isGuestMode', 'false');
    try {
      localStorage.removeItem('ensemble:is_verified');
    } catch (_) {}
    set({
      user: null,
      isAuthenticated: false,
      isGuestMode: false,
      accessToken: null,
      signUpData: null,
      isVerified: false,
    });
  },
  setAccessToken: (accessToken) => set({ accessToken }),
  setSignUpData: (data) => set({ signUpData: data }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  setIsVerificationModalOpen: (isOpen, message) => set({ isVerificationModalOpen: isOpen, verificationModalMessage: message }),
  setIsVerified: (isVerified) => {
    try {
      localStorage.setItem('ensemble:is_verified', String(isVerified));
    } catch (_) {}
    set({ isVerified });
  },
}))

const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

export default useGlobalState
