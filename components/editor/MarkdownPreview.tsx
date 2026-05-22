import ReactMarkdown from "react-markdown";
import type React from "react";
import { InlineNoteEmbed } from "@/components/notes/InlineNoteEmbed";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
  normalizeMathDelimiters
} from "@/lib/markdown/rendering";
import { slugHeading } from "@/lib/markdown/sections";
import { cn } from "@/lib/utils/cn";
import { normalizeDiagramImageUrl } from "@/lib/utils/diagrams";

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  function nodeText(children: React.ReactNode): string {
    if (typeof children === "string" || typeof children === "number") return String(children);
    if (Array.isArray(children)) return children.map(nodeText).join("");
    return "";
  }

  function headingId(children: React.ReactNode) {
    return slugHeading(nodeText(children));
  }

  return (
    <article className={cn("codex-prose", className)}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={{
          p: ({ children, ...props }) => {
            const text = nodeText(children).trim();
            const embed = text.match(/^\[\[note:([^\]]+)\]\]$/);
            return embed ? <InlineNoteEmbed reference={embed[1]} /> : <p {...props}>{children}</p>;
          },
          h1: ({ children, ...props }) => <h1 id={headingId(children)} {...props}>{children}</h1>,
          h2: ({ children, ...props }) => <h2 id={headingId(children)} {...props}>{children}</h2>,
          h3: ({ children, ...props }) => <h3 id={headingId(children)} {...props}>{children}</h3>,
          h4: ({ children, ...props }) => <h4 id={headingId(children)} {...props}>{children}</h4>,
          h5: ({ children, ...props }) => <h5 id={headingId(children)} {...props}>{children}</h5>,
          h6: ({ children, ...props }) => <h6 id={headingId(children)} {...props}>{children}</h6>,
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
