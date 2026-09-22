import { useState } from "react";
import { BookOpen, FileText, Home, PanelLeftClose, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import academyLogo from "../../assets/akademija-logo-dark.png";
import { useAuth } from "../../hooks/useAuth";
import { cn, isAdmin, roleName } from "../../lib/utils";
import { Button } from "../ui";

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
}

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

const homeItem = {
  to: "/home",
  labelKey: "shell.home",
  icon: Home,
} satisfies NavItem;

const libraryItems = [
  {
    to: "/papers",
    labelKey: "shell.papers",
    icon: FileText,
  },
] satisfies NavItem[];

const catalogueItem = {
  to: "/admin/catalogue",
  labelKey: "shell.catalogue",
  icon: BookOpen,
} satisfies NavItem;

function SidebarNavLink({
  item,
  collapsed,
  onMobileClose,
}: {
  item: NavItem;
  collapsed: boolean;
  onMobileClose: () => void;
}) {
  const { t } = useTranslation();
  const ItemIcon = item.icon;

  return (
    <NavLink
      to={item.to}
      title={collapsed ? t(item.labelKey) : undefined}
      onClick={onMobileClose}
      className={({ isActive }) =>
        cn(
          "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors duration-200",
          isActive
            ? "bg-indigo-50 text-indigo-700"
            : "text-slate-600 hover:bg-accent-wash hover:text-slate-950",
          collapsed && "lg:justify-center lg:gap-0",
        )
      }
    >
      <span className="transition-transform duration-200 group-hover:scale-105">
        <ItemIcon
          className="h-5 w-5 shrink-0"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>
      <span
        className={cn(
          "max-w-40 overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-300",
          collapsed && "lg:max-w-0 lg:opacity-0",
        )}
      >
        {t(item.labelKey)}
      </span>
    </NavLink>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
}: SidebarProps) {
  const { t } = useTranslation();
  const { user, logout, isLoggingOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        aria-label={t("shell.closeNavigationOverlay")}
        tabIndex={mobileOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/35 transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onMobileClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 shadow-xl transition-[width,transform] duration-300 ease-in-out lg:relative lg:z-20 lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:w-0 lg:border-r-0" : "lg:w-64",
        )}
      >
        <div
          className={cn(
            "flex h-full w-full min-w-0 flex-col overflow-hidden transition-opacity duration-200",
            collapsed && "lg:pointer-events-none lg:opacity-0",
          )}
        >
          <div className="relative flex h-16 shrink-0 items-center gap-1 border-b border-slate-200 bg-white px-3">
            <img
              src={academyLogo}
              alt={t("common.brand")}
              className="h-11 w-auto max-w-[11rem] object-contain object-left"
            />

            <button
              type="button"
              aria-label={t("shell.closeNavigation")}
              className="ml-auto shrink-0 rounded-md p-2 text-slate-500 transition-colors hover:bg-accent-wash hover:text-slate-900 lg:hidden"
              onClick={onMobileClose}
            >
              <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
            </button>

            <button
              type="button"
              aria-label={t("shell.collapseSidebar")}
              className="ml-auto hidden shrink-0 rounded-md p-2 text-slate-500 transition-colors hover:bg-accent-wash hover:text-slate-900 lg:block"
              onClick={onCollapse}
            >
              <PanelLeftClose
                className="h-5 w-5"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </button>
          </div>

          <nav
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4"
            aria-label={t("shell.mainNavigation")}
          >
            <SidebarNavLink
              item={homeItem}
              collapsed={collapsed}
              onMobileClose={onMobileClose}
            />

            <div className="my-4 border-t border-slate-200" />
            <p
              className={cn(
                "mb-2 max-h-5 overflow-hidden px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-[max-height,opacity] duration-300",
                collapsed && "lg:mb-0 lg:max-h-0 lg:opacity-0",
              )}
            >
              {t("shell.library")}
            </p>
            <div className="space-y-1">
              {libraryItems.map((item) => (
                <SidebarNavLink
                  key={item.to}
                  item={item}
                  collapsed={collapsed}
                  onMobileClose={onMobileClose}
                />
              ))}
            </div>
            {isAdmin(user.role) && (
              <>
                <div className="my-4 border-t border-slate-200" />
                <p
                  className={cn(
                    "mb-2 max-h-5 overflow-hidden px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-[max-height,opacity] duration-300",
                    collapsed && "lg:mb-0 lg:max-h-0 lg:opacity-0",
                  )}
                >
                  {t("shell.administration")}
                </p>
                <SidebarNavLink
                  item={catalogueItem}
                  collapsed={collapsed}
                  onMobileClose={onMobileClose}
                />
              </>
            )}
          </nav>

          <div className="relative shrink-0 border-t border-slate-200 p-3">
            {profileOpen && (
              <div
                className={cn(
                  "absolute bottom-[calc(100%-4px)] left-3 right-3 z-10 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl",
                  collapsed &&
                    "lg:bottom-3 lg:left-[calc(100%+8px)] lg:right-auto lg:w-56",
                )}
              >
                <div className="border-b border-slate-100 px-2 py-2">
                  <p className="truncate text-sm font-bold">{user.username}</p>
                  <p className="text-xs text-slate-500">
                    {t(`common.roles.${roleName(user.role)}`)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="mt-1 w-full justify-start text-rose-600 hover:bg-rose-50"
                  disabled={isLoggingOut}
                  onClick={() => logout()}
                >
                  {isLoggingOut ? t("shell.signingOut") : t("shell.signOut")}
                </Button>
              </div>
            )}

            <button
              type="button"
              aria-expanded={profileOpen}
              aria-label={t("shell.openProfileMenu")}
              title={collapsed ? user.username : undefined}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors duration-200 hover:bg-accent-wash",
                collapsed && "lg:justify-center lg:gap-0",
              )}
              onClick={() => setProfileOpen((open) => !open)}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-bold uppercase text-white">
                {user.username.slice(0, 2)}
              </span>
              <span
                className={cn(
                  "min-w-0 max-w-40 overflow-hidden whitespace-nowrap opacity-100 transition-[max-width,opacity] duration-300",
                  collapsed && "lg:max-w-0 lg:opacity-0",
                )}
              >
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {user.username}
                </span>
                <span className="block truncate text-xs text-slate-500">
                  {t(`common.roles.${roleName(user.role)}`)}
                </span>
              </span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}