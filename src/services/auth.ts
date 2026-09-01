import { api } from '../lib/axios'
import { useMockData } from '../lib/config'
import type { CurrentUser } from '../lib/types'
import { mockGetCurrentUser, mockLogin, mockLogout } from '../mocks/backend'

export interface LoginInput {
  username: string
  password: string
}

export async function login(input: LoginInput) {
  if (useMockData) return mockLogin(input)
  const { data } = await api.post<CurrentUser>('/api/login', input)
  return data
}

export async function getCurrentUser() {
  if (useMockData) return mockGetCurrentUser()
  const { data } = await api.get<CurrentUser>('/api/me')
  return data
}

export async function logout() {
  if (useMockData) return mockLogout()
  await api.post('/api/logout')
}
