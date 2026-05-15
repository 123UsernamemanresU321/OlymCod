import ReactMarkdown from "react-markdown";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
  normalizeMathDelimiters
} from "@/lib/markdown/rendering";
import { cn } from "@/lib/utils/cn";
import { normalizeDiagramImageUrl } from "@/lib/utils/diagrams";

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  return (
    <article className={cn("codex-prose", className)}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={{
          img: ({ src, alt, ...props }) => (
            // Markdown images can point at private Supabase storage paths; rewrite those to a signed render route.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              {...props}
              src={typeof src === "string" ? normalizeDiagramImageUrl(src) : src}
              alt={alt ?? ""}
            />
          )
        }}
      >
        {normalizeMathDelimiters(markdown || "Nothing to preview yet.")}
      </ReactMarkdown>
    </article>
  );
}
