"use client";

import {
  BookOpen,
  ClipboardList,
  FileText,
  Home,
  Image,
  LogOut,
  Network,
  NotebookTabs,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Table2,
  Target,
  UserCircle,
  XCircle
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
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
  { href: "/app/notebook", label: "Notebook", icon: BookOpen },
  { href: "/app/workspace", label: "Workspace", icon: NotebookTabs },
  { href: "/app/graph", label: "Graph", icon: Network },
  { href: "/app/media", label: "Media / Diagrams", icon: Image },
  { href: "/app/manage", label: "Manage", icon: Table2 },
  { href: "/app/settings", label: "Settings", icon: Settings }
];

const MOBILE_ITEMS = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/notes", label: "Notes", icon: FileText },
  { href: "/app/notebook", label: "Notebook", icon: BookOpen },
  { href: "/app/capture", label: "Capture", icon: Plus },
  { href: "/app/review-notes", label: "Review", icon: Target }
];

const SIDEBAR_STORAGE_KEY = "olympiad-codex:sidebar-collapsed";
const SIDEBAR_STORAGE_EVENT = "olympiad-codex:sidebar-collapsed-change";

function getSidebarSnapshot() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function subscribeSidebarSnapshot(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(SIDEBAR_STORAGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SIDEBAR_STORAGE_EVENT, handler);
  };
}

interface AppShellProps {
  children: React.ReactNode;
  email?: string;
  role?: string;
}

export function AppShell({ children, email, role }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isEditingNote = pathname === "/app/notes/new" || pathname.endsWith("/edit");
  const sidebarCollapsed = useSyncExternalStore(subscribeSidebarSnapshot, getSidebarSnapshot, () => false);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(SIDEBAR_STORAGE_EVENT));
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell-root min-h-screen bg-[#f9f9f9] text-[#1a1c1c]">
      <aside
        className={cn(
          "app-shell-sidebar fixed inset-y-0 left-0 hidden flex-col border-r border-[#c3c6d0] bg-[#f9f9f9] py-6 transition-[width] lg:flex",
          sidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn("px-4", !sidebarCollapsed && "px-6")}>
          <button
            type="button"
            onClick={toggleSidebar}
            className="mb-4 grid h-9 w-9 place-items-center rounded border border-[#c3c6d0] bg-white text-[#0e3b69] hover:bg-[#eef4ff]"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <Link
            href="/app"
            className={cn(
              "block font-semibold leading-[0.98] text-[#0e3b69]",
              sidebarCollapsed ? "text-center text-xl" : "text-5xl"
            )}
          >
            {sidebarCollapsed ? (
              "OC"
            ) : (
              <>
                Olympiad
                <br />
                Codex
              </>
            )}
          </Link>
          {!sidebarCollapsed ? (
            <p className="mt-2 text-[13px] font-medium tracking-[0.05em] text-[#43474f]">
              Academic Registry
            </p>
          ) : null}
        </div>

        <div className={cn("pt-8", sidebarCollapsed ? "px-3" : "px-6")}>
          <Link
            href="/app/notes/new"
            className="flex min-h-9 items-center justify-center gap-2 border border-[#2c5282] bg-[#2c5282] px-3 py-2 text-[13px] font-medium tracking-[0.04em] text-white hover:bg-[#23466f]"
            aria-label="New Note"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            {!sidebarCollapsed ? "New Note" : null}
          </Link>
          {!sidebarCollapsed ? (
            <div className="mt-2 grid gap-2">
              <QuickCapture enableShortcut />
              <CommandPalette />
            </div>
          ) : null}
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
                    "flex items-center gap-4 py-2 text-base text-[#43474f] transition-colors hover:bg-white hover:text-[#0e3b69]",
                    sidebarCollapsed ? "justify-center px-0" : "px-6",
                    active && "border-r-2 border-[#0e3b69] font-bold text-[#0e3b69]"
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {!sidebarCollapsed ? item.label : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className={cn("border-t border-[#c3c6d0] pt-6", sidebarCollapsed ? "px-3" : "px-6")}>
          <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center")}>
            <div className="grid h-8 w-8 place-items-center rounded-full border border-[#c3c6d0] bg-white text-[#0e3b69]">
              <UserCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            {!sidebarCollapsed ? <div className="min-w-0">
              <p className="truncate text-[13px] font-medium tracking-[0.04em] text-[#43474f]">
                {email ?? "Researcher"}
              </p>
              <p className="text-[12px] capitalize text-[#0e3b69]">{role ?? "owner"}</p>
            </div> : null}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 flex w-full items-center justify-center gap-2 border border-[#c3c6d0] px-3 py-2 text-[13px] font-medium tracking-[0.04em] text-[#0e3b69] hover:bg-white"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            {!sidebarCollapsed ? "Sign out" : null}
          </button>
        </div>
      </aside>

      <header className="app-shell-mobile-header fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#c3c6d0] bg-[#f9f9f9]/95 px-6 backdrop-blur lg:hidden">
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

      <main
        className={cn(
          "app-shell-main min-h-screen pb-24 pt-16 transition-[margin] lg:pb-0 lg:pt-0",
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        {children}
      </main>

      <div className="notebook-print-hidden">{!isEditingNote ? <QuickCapture floating /> : null}</div>

      <nav className="app-shell-mobile-nav fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-[#c3c6d0] bg-[#f9f9f9] lg:hidden">
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
