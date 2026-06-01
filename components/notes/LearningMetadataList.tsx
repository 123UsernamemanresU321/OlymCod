import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { cn } from "@/lib/utils/cn";

interface LearningMetadataListProps {
  title: string;
  description?: string;
  items: string[];
  tone?: "blue" | "red";
  compact?: boolean;
  defaultOpen?: boolean;
}

export function LearningMetadataList({
  title,
  description,
  items,
  tone = "blue",
  compact = false,
  defaultOpen = !compact
}: LearningMetadataListProps) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);
  if (!cleanItems.length) return null;

  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-lg border",
        tone === "blue" && "border-[#c3c6d0] bg-[#f9f9f9]",
        tone === "red" && "border-[#ffd2cc] bg-[#fff7f5]",
        compact && "text-sm"
      )}
    >
      <summary className={cn("flex cursor-pointer list-none items-start justify-between gap-3", compact ? "p-3" : "p-4")}>
        <span>
          <span
            className={cn(
              "block text-sm font-semibold uppercase tracking-[0.08em]",
              tone === "blue" ? "text-[#0e3b69]" : "text-[#8f1d15]"
            )}
          >
            {title}
          </span>
          <span className="mt-1 block text-xs leading-5 text-[#5d6470]">
            {description ? `${description} · ` : null}
            {cleanItems.length} {cleanItems.length === 1 ? "item" : "items"}
          </span>
        </span>
        <span className="rounded border border-[#c3c6d0] bg-white px-2 py-1 text-xs font-medium text-[#0e3b69] group-open:hidden">
          Open
        </span>
        <span className="hidden rounded border border-[#c3c6d0] bg-white px-2 py-1 text-xs font-medium text-[#0e3b69] group-open:inline">
          Hide
        </span>
      </summary>
      <ul className={cn("grid gap-2 border-t border-[#d5d7de] p-4 pt-3", compact && "gap-1 p-3")}>
        {cleanItems.map((item) => (
          <li
            key={item}
            className={cn(
              "rounded border bg-white px-3 py-2 text-sm leading-6",
              tone === "blue" ? "border-[#c3c6d0] text-[#1a1c1c]" : "border-[#ffd2cc] text-[#573733]"
            )}
          >
            <MarkdownPreview markdown={item} className="codex-metadata-markdown" />
          </li>
        ))}
      </ul>
    </details>
  );
}
