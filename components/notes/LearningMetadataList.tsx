import { MarkdownPreview } from "@/components/editor/MarkdownPreview";
import { cn } from "@/lib/utils/cn";

interface LearningMetadataListProps {
  title: string;
  description?: string;
  items: string[];
  tone?: "blue" | "red";
  compact?: boolean;
}

export function LearningMetadataList({
  title,
  description,
  items,
  tone = "blue",
  compact = false
}: LearningMetadataListProps) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);
  if (!cleanItems.length) return null;

  return (
    <section
      className={cn(
        "rounded-lg border p-4",
        tone === "blue" && "border-[#c3c6d0] bg-[#f9f9f9]",
        tone === "red" && "border-[#ffd2cc] bg-[#fff7f5]",
        compact && "p-3"
      )}
    >
      <h2
        className={cn(
          "text-sm font-semibold uppercase tracking-[0.08em]",
          tone === "blue" ? "text-[#0e3b69]" : "text-[#8f1d15]"
        )}
      >
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm text-[#43474f]">{description}</p> : null}
      <ul className={cn("mt-3 grid gap-2", compact && "gap-1")}>
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
    </section>
  );
}
