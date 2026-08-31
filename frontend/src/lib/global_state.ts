import {create, type ExtractState, type StoreApi} from 'zustand'

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

  // Actions
  setIsSidebarCollapsed: (isCollapsed: boolean) => void
  setUser:            (user: any) => void
  setIsGuestMode:     (isGuestMode: boolean) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  setIsLoading:       (isLoading: boolean) => void
  clearUser:          () => void
  setAccessToken: (accessToken: string) => void
  setSignUpData: (data: any) => void
  setTheme: (theme: 'light' | 'dark') => void
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

  // Actions
  setIsSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
  setUser:            (user) => {
    localStorage.setItem('isGuestMode', 'false');
    set({ user, isAuthenticated: true, isGuestMode: false });
  },
  setIsGuestMode:     (isGuestMode) => {
    localStorage.setItem('isGuestMode', String(isGuestMode));
    set({ isGuestMode });
  },
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading:       (isLoading) => set({ isLoading }),
  clearUser:          () => {
    localStorage.setItem('isGuestMode', 'false');
    set({
      user: null,
      isAuthenticated: false,
      isGuestMode: false,
      accessToken: null,
      signUpData: null,
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
}))

const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

export default useGlobalState
