import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";

export const markdownRemarkPlugins = [remarkGfm, remarkMath];
export const markdownRehypePlugins = [rehypeSanitize, rehypeKatex];

export function normalizeMathDelimiters(markdown: string) {
  return markdown
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part) => {
      if (part.startsWith("`")) return part;
      return part
        .replace(/\\\[([\s\S]*?)\\\]/g, (_match, content: string) => `$$\n${content.trim()}\n$$`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_match, content: string) => `$${content.trim()}$`);
    })
    .join("");
}
