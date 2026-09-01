import type { UserRole, ValidationErrors } from './types'
import { USER_ROLES } from './types'

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function isStaff(role?: UserRole) {
  return role !== undefined && role <= USER_ROLES.Moderator
}

export function isAdmin(role?: UserRole) {
  return role !== undefined && role <= USER_ROLES.Admin
}

export function roleLabel(role: UserRole) {
  return Object.entries(USER_ROLES).find(([, value]) => value === role)?.[0] ?? 'User'
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export function fieldError(errors: ValidationErrors, name: string) {
  const entry = Object.entries(errors).find(([key]) => key.toLowerCase() === name.toLowerCase())
  return entry?.[1]?.[0]
}

export const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
