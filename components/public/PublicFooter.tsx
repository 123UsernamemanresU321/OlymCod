"use client";

import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#c3c6d0] bg-[#f9f9f9] px-4 py-8 text-sm text-[#43474f] lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Copyright {new Date().getFullYear()} Olympiad Codex. All rights reserved.</p>
        <nav className="flex flex-wrap gap-4" aria-label="Public footer">
          <Link href="/notes" className="font-medium text-[#0e3b69] hover:underline">
            Public Notes
          </Link>
          <Link href="/contribute" className="font-medium text-[#0e3b69] hover:underline">
            Contribute
          </Link>
          <Link href="/login" className="font-medium text-[#0e3b69] hover:underline">
            Login
          </Link>
        </nav>
      </div>
    </footer>
  );
}
