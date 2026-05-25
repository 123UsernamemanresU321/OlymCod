import { cn } from "@/lib/utils/cn";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg" | "xl";
}

export function PageShell({ children, className, size = "lg" }: PageShellProps) {
  return (
    <div
      className={cn(
        "codex-page-shell",
        size === "md" && "max-w-5xl",
        size === "lg" && "max-w-6xl",
        size === "xl" && "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ actions, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className={cn("codex-page-header", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0e3b69]">{eyebrow}</p>
        ) : null}
        <h1 className="mt-1 text-3xl font-semibold leading-tight text-[#1a1c1c]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#43474f]">{description}</p> : null}
      </div>
      {actions ? <div className="codex-toolbar shrink-0">{actions}</div> : null}
    </header>
  );
}

interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "section" | "article" | "aside";
  muted?: boolean;
}

export function Surface({ as = "section", children, className, muted = false, ...props }: SurfaceProps) {
  const Comp = as;
  return (
    <Comp className={cn(muted ? "codex-surface-muted" : "codex-surface", "p-4 sm:p-5", className)} {...props}>
      {children}
    </Comp>
  );
}

export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("codex-toolbar", className)}>{children}</div>;
}

interface FilterDisclosureProps {
  title: string;
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function FilterDisclosure({ children, className, defaultOpen = false, summary, title }: FilterDisclosureProps) {
  return (
    <details className={cn("codex-filter-summary group", className)} open={defaultOpen}>
      <summary aria-label={`${title}: ${summary}`}>
        <span>
          <span className="block text-sm font-semibold text-[#1a1c1c]">{title}</span>
          <span className="text-xs leading-5 text-[#5d6470]">{summary}</span>
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3b69] group-open:hidden">
          Open
        </span>
        <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-[#0e3b69] group-open:inline">
          Close
        </span>
      </summary>
      <div className="border-t border-[#e2e4ea] px-4 pb-4 pt-3">{children}</div>
    </details>
  );
}

export function StatusMessage({
  children,
  tone = "default",
  className
}: {
  children: React.ReactNode;
  tone?: "default" | "error" | "success" | "warning";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "codex-status",
        tone === "error" && "codex-status-error",
        tone === "success" && "codex-status-success",
        tone === "warning" && "codex-status-warning",
        className
      )}
    >
      {children}
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn("codex-skeleton rounded", className)} aria-hidden="true" />;
}
