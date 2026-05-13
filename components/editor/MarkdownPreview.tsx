import ReactMarkdown from "react-markdown";
import { markdownRehypePlugins, markdownRemarkPlugins } from "@/lib/markdown/rendering";
import { cn } from "@/lib/utils/cn";

interface MarkdownPreviewProps {
  markdown: string;
  className?: string;
}

export function MarkdownPreview({ markdown, className }: MarkdownPreviewProps) {
  return (
    <article className={cn("codex-prose", className)}>
      <ReactMarkdown remarkPlugins={markdownRemarkPlugins} rehypePlugins={markdownRehypePlugins}>
        {markdown || "Nothing to preview yet."}
      </ReactMarkdown>
    </article>
  );
}
