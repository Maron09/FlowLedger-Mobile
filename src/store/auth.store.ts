import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
  lastWorkspaceId?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, refreshToken: string) => Promise<void>
  setToken: (token: string) => void
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  setAuth: async (user, token, refreshToken) => {
    await AsyncStorage.setItem('accessToken', token)
    await AsyncStorage.setItem('refreshToken', refreshToken)
    set({ user, token, isAuthenticated: true })
  },

  setToken: (token) => {
    AsyncStorage.setItem('accessToken', token)
    set({ token })
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken'])
    set({ user: null, token: null, isAuthenticated: false })
  },

  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem('accessToken')
    if (token) {
      set({ token, isAuthenticated: true })
    }
  },
}))