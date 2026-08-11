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
    isSidebarCollapsed: (state: ExtractState<StoreApi<GlobalState>>) => U;
  user:            any | null
  isAuthenticated: boolean
  isLoading:       boolean
  accessToken:     string | null
  signUpData:      any | null
  theme:           'light' | 'dark'

  // Actions
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
  user:            null,
  isAuthenticated: false,
  isLoading:       false,
  accessToken: null,
  signUpData: null,
  theme: (localStorage.getItem('theme') as 'light' | 'dark') || 'dark',

  // Actions
  setUser:            (user) => set({ user, isAuthenticated: true }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading:       (isLoading) => set({ isLoading }),
  clearUser:          () => set({ user: null, isAuthenticated: false }),
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