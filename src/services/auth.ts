import { api } from '../lib/axios'
import type { CurrentUser } from '../lib/types'

export interface LoginInput {
  username: string
  password: string
}

export async function login(input: LoginInput) {
  const { data } = await api.post<CurrentUser>('/api/login', input)
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get<CurrentUser>('/api/me')
  return data
}

export async function logout() {
  await api.post('/api/logout')
}
