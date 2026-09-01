import { createContext, useContext } from 'react'
import type { CurrentUser } from '../lib/types'
import type { LoginInput } from '../services/auth'

export interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
  login: (input: LoginInput) => Promise<CurrentUser>
  logout: () => Promise<void>
  isLoggingIn: boolean
  isLoggingOut: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
