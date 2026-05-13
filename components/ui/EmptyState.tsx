import { BookOpen, SearchX } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  variant?: "notes" | "search";
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({
  variant = "notes",
  title,
  body,
  actionHref,
  actionLabel
}: EmptyStateProps) {
  const Icon = variant === "search" ? SearchX : BookOpen;

  return (
    <div className="grid min-h-[360px] place-items-center rounded-lg border border-[#c3c6d0] bg-[#f9f9f9] p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-[#e2e2e2] text-[#0e3b69]">
          <Icon className="h-10 w-10" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-[#1a1c1c]">{title}</h2>
        <p className="mt-3 text-base leading-7 text-[#43474f]">{body}</p>
        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="mt-6 inline-flex min-h-9 items-center justify-center rounded border border-[#2c5282] bg-[#2c5282] px-4 py-2 text-[13px] font-medium tracking-[0.04em] text-white hover:bg-[#23466f]"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
