"use client";

import {
  Bell,
  BookOpen,
  Calculator,
  FileText,
  Grid2X2,
  Home,
  Inbox,
  LogOut,
  Plus,
  Search,
  Settings,
  Shapes,
  UserCircle
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: Home, exact: true },
  { href: "/app/notes", label: "Notes", icon: FileText },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/notes?topic=Geometry", label: "Geometry", icon: Shapes },
  { href: "/app/formula-bank", label: "Formula Bank", icon: Calculator },
  { href: "/app/settings", label: "Settings", icon: Settings }
];

const MOBILE_ITEMS = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/notes", label: "Notes", icon: FileText },
  { href: "/app/formula-bank", label: "Library", icon: BookOpen },
  { href: "/app/notes", label: "Search", icon: Search }
];

interface AppShellProps {
  children: React.ReactNode;
  email?: string;
}

export function AppShell({ children, email }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-[#c3c6d0] bg-[#f9f9f9] py-10 lg:flex">
        <div className="px-6">
          <Link href="/app" className="block text-5xl font-semibold leading-[0.98] text-[#0e3b69]">
            Olympiad
            <br />
            Codex
          </Link>
          <p className="mt-2 text-[13px] font-medium tracking-[0.05em] text-[#43474f]">
            Academic Registry
          </p>
        </div>

        <div className="px-6 pt-8">
          <Link
            href="/app/notes/new"
            className="flex min-h-9 items-center justify-center gap-2 border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white hover:bg-[#23466f]"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New Note
          </Link>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto">
          <div className="grid gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-4 px-6 py-2 text-base text-[#43474f] transition-colors hover:bg-white hover:text-[#0e3b69]",
                    active && "border-r-2 border-[#0e3b69] font-bold text-[#0e3b69]"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-[#c3c6d0] px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full border border-[#c3c6d0] bg-white text-[#0e3b69]">
              <UserCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
                {email ?? "Researcher"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 border border-[#c3c6d0] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69] hover:bg-white"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#c3c6d0] bg-[#f9f9f9]/95 px-6 backdrop-blur lg:hidden">
        <Link href="/app" className="text-2xl font-semibold text-[#0e3b69]">
          Olympiad Codex
        </Link>
        <div className="flex items-center gap-4 text-[#43474f]">
          <Bell className="h-5 w-5" aria-hidden="true" />
          <Link href="/app/settings" aria-label="Settings">
            <UserCircle className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="min-h-screen pb-24 pt-16 lg:ml-64 lg:pb-0 lg:pt-0">{children}</main>

      <Link
        href="/app/notes/new"
        className="fixed bottom-24 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#2c5282] text-white shadow-[0_16px_30px_rgba(26,32,44,0.2)] lg:hidden"
        aria-label="New note"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-[#c3c6d0] bg-[#f9f9f9] lg:hidden">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[12px] font-medium text-[#43474f]",
                active && "text-[#0e3b69]"
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
