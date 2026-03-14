"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTRPC } from "~/trpc/react";

const navItems: { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, adminOnly: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const trpc = useTRPC();
  const { data: user, isPending } = useQuery(trpc.auth.me.queryOptions());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isPending && !user) {
      router.replace("/login");
    }
  }, [isPending, user, router]);

  if (!isPending && !user) {
    return null;
  }

  const handleLogout = () => {
    document.cookie = "billing_session=; path=/; max-age=0";
    router.replace("/login");
    router.refresh();
  };

  const visibleNav = navItems.filter((n) => !n.adminOnly || user?.role === "admin");
  const activeNav =
    [...visibleNav].reverse().find(
      (n) => pathname === n.href || pathname.startsWith(n.href + "/"),
    ) ?? visibleNav[0];

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || (user?.email?.[0]?.toUpperCase() ?? "U");

  const showNewInvoiceQuickAction =
    user?.subscriptionActive && !pathname.startsWith("/dashboard/invoices/new");

  const sidebarHandleLeft = sidebarCollapsed ? "4rem" : "16rem";

  return (
    <div className="relative flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur md:flex ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        <div
          className={`flex h-16 items-center border-b border-slate-200 ${
            sidebarCollapsed ? "justify-center px-0" : "gap-2 px-5"
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            B
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                Billing System
              </span>
              <span className="text-xs text-slate-500">
                Invoicing &amp; GST for India
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-4 px-3 py-4">
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Main
              </p>
            )}
            <div className="space-y-1">
              {navItems
                .filter((item) => !item.adminOnly || user?.role === "admin")
                .map((item) => {
                  const Icon = item.icon;
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-slate-900 text-slate-50 shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      } ${sidebarCollapsed ? "justify-center" : "gap-3"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
            </div>
          </div>
        </nav>

        <div className="border-t border-slate-200 px-3 py-3">
          <div
            className={`flex items-center rounded-lg py-2 ${
              sidebarCollapsed
                ? "justify-center bg-transparent px-0"
                : "justify-between bg-slate-50 px-3"
            }`}
          >
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-800">
                  {user?.companyName ?? "Your company"}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {user?.email}
                </p>
                {user?.role && (
                  <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
                    {user.role === "admin" ? "Admin" : "Staff"}
                  </p>
                )}
              </div>
            )}
            <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              {initials}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={`mt-2 flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${
              sidebarCollapsed ? "justify-center gap-0" : "justify-center gap-2"
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar collapse handle on vertical border (desktop only) */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed((prev) => !prev)}
        className="absolute top-1/2 z-30 hidden -translate-y-1/2 -translate-x-1/2 md:inline-flex"
        style={{ left: sidebarHandleLeft }}
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-100">
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 flex md:hidden"
          aria-hidden={!mobileNavOpen}
        >
          <button
            type="button"
            className="h-full w-full bg-black/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
                B
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight">
                  Billing System
                </span>
                <span className="text-xs text-slate-500">
                  Invoicing &amp; GST for India
                </span>
              </div>
            </div>

            <nav className="flex-1 space-y-4 px-3 py-4">
              <div>
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Main
                </p>
                <div className="space-y-1">
                  {navItems
                    .filter((item) => !item.adminOnly || user?.role === "admin")
                    .map((item) => {
                      const Icon = item.icon;
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                            active
                              ? "bg-slate-900 text-slate-50 shadow-sm"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                </div>
              </div>
            </nav>

            <div className="border-t border-slate-200 px-3 py-3">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {user?.companyName ?? "Your company"}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-slate-400">
                      {user.role === "admin" ? "Admin" : "Staff"}
                    </p>
                  )}
                </div>
                <div className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {initials}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/40 md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileNavOpen}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {activeNav.label}
                </p>
                <h1 className="text-xl font-semibold text-slate-900">
                  {activeNav.label === "Overview" ? "Dashboard" : activeNav.label}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {showNewInvoiceQuickAction && (
                <Link
                  href="/dashboard/invoices/new"
                  className="hidden rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800 sm:inline-flex"
                >
                  New invoice
                </Link>
              )}
              {user && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    user.subscriptionActive
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                  }`}
                >
                  {user.subscriptionActive ? "Subscription active" : "Subscription expired"}
                </span>
              )}
            </div>
          </div>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </main>
    </div>
  );
}
