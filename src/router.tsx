import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppShell } from './components/main/AppShell'
import { LoadingState } from './components/ui'
import { useAuth } from './hooks/useAuth'
import { isStaff } from './lib/utils'
import { LoginPage } from './pages/LoginPage'
import { PapersPage } from './pages/PapersPage'
import { PendingPapersPage } from './pages/PendingPapersPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <LoadingState label="Restoring your session…" />
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return children
}

function StaffRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return isStaff(user?.role) ? children : <Navigate to="/papers" replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/papers" replace />} />
        <Route path="/papers" element={<PapersPage />} />
        <Route
          path="/pending"
          element={
            <StaffRoute>
              <PendingPapersPage />
            </StaffRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/papers" replace />} />
    </Routes>
  )
}
