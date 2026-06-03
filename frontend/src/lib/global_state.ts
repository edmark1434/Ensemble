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

  // Actions
  setUser:            (user: any) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  setIsLoading:       (isLoading: boolean) => void
  clearUser:          () => void
  setAccessToken:     (accessToken: string) => void
}

// Pass type to create<GlobalState>
const useGlobalState = create<GlobalState>((set) => ({
  // Initial state
  user:            null,
  isAuthenticated: false,
  isLoading:       false,
  accessToken:     null,

  // Actions
  setUser:            (user) => set({ user, isAuthenticated: true }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setIsLoading:       (isLoading) => set({ isLoading }),
  clearUser:          () => set({ user: null, isAuthenticated: false }),
  setAccessToken:     (accessToken) => set({ accessToken }),
}))

export default useGlobalState