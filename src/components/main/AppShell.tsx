import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useMockData } from '../../lib/config'
import { USER_ROLES } from '../../lib/types'
import { cn, roleLabel } from '../../lib/utils'
import { RoleGate } from '../auth/RoleGate'
import { Button } from '../ui'

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

const navItems = [
  {
    to: '/papers',
    label: 'Papers',
    icon: (
      <Icon>
        <path d="M7 3.75h7.5L19 8.25v12H7z" />
        <path d="M14.5 3.75v4.5H19M10 12h6M10 15.5h6" />
      </Icon>
    ),
    staffOnly: false,
  },
  {
    to: '/pending',
    label: 'Pending papers',
    icon: (
      <Icon>
        <path d="M12 8v4l2.5 1.5" />
        <circle cx="12" cy="12" r="8.25" />
      </Icon>
    ),
    staffOnly: true,
  },
]

export function AppShell() {
  const { user, logout, isLoggingOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  if (!user) return null

  const sidebar = (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-slate-200 bg-slate-950 text-white transition-[width] duration-200',
        collapsed ? 'lg:w-20' : 'lg:w-64',
        'w-72',
      )}
    >
      <div className="flex h-18 items-center gap-3 border-b border-white/10 px-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-500 font-black">E</div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Exam Archive</p>
            <p className="text-xs text-slate-400">Paper management</p>
          </div>
        )}
        <button
          type="button"
          aria-label="Close navigation"
          className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          ×
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const link = (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                  isActive
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-950/30'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  collapsed && 'lg:justify-center',
                )
              }
            >
              {item.icon}
              <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
            </NavLink>
          )
          return item.staffOnly ? (
            <RoleGate key={item.to} maximumRole={USER_ROLES.Moderator}>
              {link}
            </RoleGate>
          ) : (
            link
          )
        })}
      </nav>

      <div className="relative border-t border-white/10 p-3">
        {profileOpen && (
          <div className="absolute bottom-[calc(100%-4px)] left-3 right-3 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
            <div className="border-b border-slate-100 px-2 py-2">
              <p className="truncate text-sm font-bold">{user.username}</p>
              <p className="text-xs text-slate-500">{roleLabel(user.role)}</p>
            </div>
            <Button
              variant="ghost"
              className="mt-1 w-full justify-start text-rose-600 hover:bg-rose-50"
              disabled={isLoggingOut}
              onClick={() => logout()}
            >
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        )}
        <button
          type="button"
          aria-expanded={profileOpen}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10',
            collapsed && 'lg:justify-center',
          )}
          onClick={() => setProfileOpen((open) => !open)}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-700 text-sm font-bold uppercase">
            {user.username.slice(0, 2)}
          </span>
          <span className={cn('min-w-0', collapsed && 'lg:hidden')}>
            <span className="block truncate text-sm font-semibold">{user.username}</span>
            <span className="block text-xs text-slate-400">{roleLabel(user.role)}</span>
          </span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden shrink-0 lg:block">{sidebar}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-slate-950/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Open navigation"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Icon>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </Icon>
          </button>
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:block"
            onClick={() => setCollapsed((value) => !value)}
          >
            <Icon>
              <path d={collapsed ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
            </Icon>
          </button>
          {useMockData && (
            <span
              className="ml-3 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-200"
              title="Mock changes are kept in memory and reset when the page refreshes."
            >
              Mock mode
            </span>
          )}
          <p className="ml-auto text-sm text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{user.username}</span>
          </p>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
