"use client";

import {
  ClipboardList,
  FileText,
  Home,
  Image,
  LogOut,
  NotebookTabs,
  Plus,
  Search,
  Settings,
  Target,
  UserCircle,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CommandPalette } from "@/components/command/CommandPalette";
import { QuickCapture } from "@/components/capture/QuickCapture";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: Home, exact: true },
  { href: "/app/notes", label: "Notes", icon: FileText },
  { href: "/app/capture", label: "Capture", icon: Plus },
  { href: "/app/problems", label: "Problems", icon: ClipboardList },
  { href: "/app/mistakes", label: "Mistakes", icon: XCircle },
  { href: "/app/review-notes", label: "Review", icon: NotebookTabs },
  { href: "/app/diagrams", label: "Diagrams", icon: Image },
  { href: "/app/settings", label: "Settings", icon: Settings }
];

const MOBILE_ITEMS = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/notes", label: "Notes", icon: FileText },
  { href: "/app/capture", label: "Capture", icon: Plus },
  { href: "/app/review-notes", label: "Review", icon: Target },
  { href: "/app/notes", label: "Search", icon: Search }
];

interface AppShellProps {
  children: React.ReactNode;
  email?: string;
  role?: string;
}

export function AppShell({ children, email, role }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isEditingNote = pathname === "/app/notes/new" || pathname.endsWith("/edit");

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
          <div className="mt-2 grid gap-2">
            <QuickCapture enableShortcut />
            <CommandPalette />
          </div>
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
              <p className="text-[12px] capitalize text-[#0e3b69]">{role ?? "owner"}</p>
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
        <div className="flex items-center gap-2 text-[#43474f]">
          <CommandPalette enableShortcut={false} />
          <Link href="/app/settings" aria-label="Settings">
            <UserCircle className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="min-h-screen pb-24 pt-16 lg:ml-64 lg:pb-0 lg:pt-0">{children}</main>

      {!isEditingNote ? (
        <QuickCapture floating />
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-[#c3c6d0] bg-[#f9f9f9] lg:hidden">
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
