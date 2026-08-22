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
  isAuthenticated: boolean
  isLoading:       boolean
  accessToken:     string | null
  signUpData:      any | null
  theme:           'light' | 'dark'

  // Actions
  setIsSidebarCollapsed: (isCollapsed: boolean) => void
  setUser:            (user: any) => void
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
  isAuthenticated: false,
  isLoading:       false,
  accessToken: null,
  signUpData: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',

  // Actions
  setIsSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
  setUser:            (user) => set({ user, isAuthenticated: true }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading:       (isLoading) => set({ isLoading }),
  clearUser:          () => set({
    user: null,
    isAuthenticated: false,
    accessToken: null,
    signUpData: null,
  }),
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
