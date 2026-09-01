import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../lib/types'

export function RoleGate({
  maximumRole,
  children,
  fallback = null,
}: {
  maximumRole: UserRole
  children: ReactNode
  fallback?: ReactNode
}) {
  const { user } = useAuth()
  return user && user.role <= maximumRole ? children : fallback
}
