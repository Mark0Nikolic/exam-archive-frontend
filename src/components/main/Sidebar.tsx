import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { cn, roleLabel } from '../../lib/utils'
import { Button } from '../ui'

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onCollapse: () => void
  onMobileClose: () => void
}

function Icon({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-5 w-5 shrink-0', className)}
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
        <path d="M6.75 3.75h7.5l4.5 4.5v12H6.75z" />
        <path d="M14.25 3.75v4.5h4.5M9.75 12h6M9.75 15.5h6" />
      </Icon>
    ),
  },
]

export function Sidebar({ collapsed, mobileOpen, onCollapse, onMobileClose }: SidebarProps) {
  const { user, logout, isLoggingOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  if (!user) return null

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation overlay"
        tabIndex={mobileOpen ? 0 : -1}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/35 transition-opacity duration-300 lg:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onMobileClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 shadow-xl transition-[width,transform] duration-300 ease-in-out lg:relative lg:z-20 lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-0 lg:border-r-0' : 'lg:w-64',
        )}
      >
        <div
          className={cn(
            'flex h-full w-full min-w-0 flex-col overflow-hidden transition-opacity duration-200',
            collapsed && 'lg:pointer-events-none lg:opacity-0',
          )}
        >
        <div className="relative flex h-[72px] shrink-0 items-center border-b border-slate-200 px-[18px]">
          <div className={cn('flex min-w-0 items-center gap-3', collapsed && 'lg:mx-auto lg:gap-0')}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white shadow-sm shadow-blue-200">
              E
            </span>
            <span
              className={cn(
                'max-w-40 overflow-hidden whitespace-nowrap text-sm font-bold text-slate-900 transition-[max-width,opacity,margin] duration-300',
                collapsed ? 'lg:ml-0 lg:max-w-0 lg:opacity-0' : 'ml-0 max-w-40 opacity-100',
              )}
            >
              Exam Archive
            </span>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            className="ml-auto rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            onClick={onMobileClose}
          >
            <Icon className="h-4 w-4">
              <path d="m6 6 12 12M18 6 6 18" />
            </Icon>
          </button>

          <button
            type="button"
            aria-label="Collapse sidebar"
            className="ml-auto hidden rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:block"
            onClick={onCollapse}
          >
            <Icon className="h-4 w-4">
              <path d="m14 7-5 5 5 5" />
              <path d="M19 5v14" />
            </Icon>
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Main navigation">
          <p
            className={cn(
              'mb-2 max-h-5 overflow-hidden px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-[max-height,opacity] duration-300',
              collapsed && 'lg:mb-0 lg:max-h-0 lg:opacity-0',
            )}
          >
            Library
          </p>
          <div className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                onClick={onMobileClose}
                className={({ isActive }) =>
                  cn(
                    'group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-200',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                    collapsed && 'lg:justify-center lg:gap-0',
                  )
                }
              >
                <span className="transition-transform duration-200 group-hover:scale-105">{item.icon}</span>
                <span
                  className={cn(
                    'max-w-40 overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-300',
                    collapsed && 'lg:max-w-0 lg:opacity-0',
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="relative shrink-0 border-t border-slate-200 p-3">
          {profileOpen && (
            <div
              className={cn(
                'absolute bottom-[calc(100%-4px)] left-3 right-3 z-10 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl',
                collapsed && 'lg:bottom-3 lg:left-[calc(100%+8px)] lg:right-auto lg:w-56',
              )}
            >
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
            aria-label="Open profile menu"
            title={collapsed ? user.username : undefined}
            className={cn(
              'flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors duration-200 hover:bg-slate-100',
              collapsed && 'lg:justify-center lg:gap-0',
            )}
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-bold uppercase text-white">
              {user.username.slice(0, 2)}
            </span>
            <span
              className={cn(
                'min-w-0 max-w-40 overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-300',
                collapsed && 'lg:max-w-0 lg:opacity-0',
              )}
            >
              <span className="block truncate text-sm font-semibold text-slate-900">{user.username}</span>
              <span className="block truncate text-xs text-slate-500">{roleLabel(user.role)}</span>
            </span>
          </button>
        </div>
        </div>

      </aside>
    </>
  )
}