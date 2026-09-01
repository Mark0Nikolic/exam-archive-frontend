import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useMockData } from "../../lib/config";
import { cn } from "../../lib/utils";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed(true)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "z-30 flex h-16 shrink-0 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-[padding] duration-300 sm:px-6",
            collapsed ? "lg:px-3" : "lg:px-8",
          )}
        >
          <button
            type="button"
            aria-label="Open navigation"
            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Expand sidebar"
            aria-expanded={false}
            className={cn(
              "hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950",
              collapsed && "lg:block",
            )}
            onClick={() => setCollapsed(false)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
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
            Signed in as{" "}
            <span className="font-semibold text-slate-700">
              {user.username}
            </span>
          </p>
        </header>
        <main
          className={cn(
            "min-h-0 flex-1 overflow-y-auto p-4 transition-[padding] duration-300 sm:p-6 lg:py-8",
            collapsed ? "lg:px-3" : "lg:px-8",
          )}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}