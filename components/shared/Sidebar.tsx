"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileStack,
  Inbox,
  Settings,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/templates",
    label: "Templates",
    icon: FileStack,
    exact: false,
  },
  {
    href: "/dashboard/reviews",
    label: "Review Queue",
    icon: Inbox,
    exact: false,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    exact: true,
  },
];

export function Sidebar({ orgName }: { orgName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white">
            <Sparkles className="h-4 w-4" />
          </span>

          <span className="text-sm font-semibold text-foreground">
            OnboardOS
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // IMPORTANT:
          // fixed + inset-y-0 keeps the sidebar attached
          // to the viewport even when the main page scrolls.
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-background",

          // Mobile drawer behaviour
          "transition-transform duration-200",

          open ? "translate-x-0" : "-translate-x-full",

          // Desktop: ALWAYS fixed and visible
          "md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {orgName}
              </p>

              <p className="text-xs text-muted-foreground">
                OnboardOS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",

                  isActive
                    ? "bg-primary text-white shadow-[0_0_0_1px_rgba(124,58,237,0.4),0_4px_14px_-4px_rgba(124,58,237,0.6)]"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />

                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="mt-auto shrink-0 border-t border-border p-3">
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}