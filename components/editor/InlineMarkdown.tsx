import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
  normalizeMathDelimiters
} from "@/lib/markdown/rendering";
import { cn } from "@/lib/utils/cn";

interface InlineMarkdownProps {
  text: string;
  className?: string;
}

function InlineOnly({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export function InlineMarkdown({ text, className }: InlineMarkdownProps) {
  return (
    <span className={cn("codex-inline-markdown", className)}>
      <ReactMarkdown
        skipHtml
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={{
          p: InlineOnly,
          h1: InlineOnly,
          h2: InlineOnly,
          h3: InlineOnly,
          h4: InlineOnly,
          h5: InlineOnly,
          h6: InlineOnly,
          ul: InlineOnly,
          ol: InlineOnly,
          li: InlineOnly,
          blockquote: InlineOnly,
          pre: InlineOnly,
          img: () => null
        }}
      >
        {normalizeMathDelimiters(text)}
      </ReactMarkdown>
    </span>
  );
}
