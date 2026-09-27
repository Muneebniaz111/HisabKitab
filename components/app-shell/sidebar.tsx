"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  FileBarChart,
  Settings,
  BookOpenText,
  Menu,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Brand() {
  return (
    <span className="flex items-center gap-2 min-w-0">
      <BookOpenText className="size-5 text-accent shrink-0" strokeWidth={1.75} />
      <span className="font-display italic text-lg truncate">Hisab-Kitab</span>
    </span>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 py-6">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
              active ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            <Icon className="size-[17px]" strokeWidth={1.75} />
            {label}
            <span
              className={cn(
                "absolute left-5 right-5 -bottom-px h-px bg-ink origin-left transition-transform",
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ userEmail }: { userEmail: string | null | undefined }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Desktop rail — narrower than a typical dashboard sidebar on purpose. */}
      <aside className="hidden lg:flex w-52 shrink-0 border-r border-rule flex-col">
        <div className="h-16 flex items-center px-5 border-b border-rule">
          <Brand />
        </div>
        <NavLinks />
        <div className="px-5 py-4 border-t border-rule space-y-2">
          {userEmail && <p className="text-xs text-ink-muted truncate">{userEmail}</p>}
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile top bar — same h-16 as the desktop brand row and every
          PageHeader, so the horizontal rule lines up no matter the viewport. */}
      <div className="lg:hidden sticky top-0 z-30 h-16 flex items-center justify-between px-4 border-b border-rule bg-paper">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 text-ink"
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 max-w-[80vw] bg-paper border-r border-rule flex flex-col">
            <div className="h-16 flex items-center justify-between px-5 border-b border-rule">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="p-1 text-ink-muted hover:text-ink"
              >
                <X className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <div className="px-5 py-4 border-t border-rule space-y-2">
              {userEmail && <p className="text-xs text-ink-muted truncate">{userEmail}</p>}
              <SignOutButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
