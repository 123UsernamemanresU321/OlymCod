import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";

export const markdownRemarkPlugins = [remarkGfm, remarkMath];
export const markdownRehypePlugins = [rehypeSanitize, rehypeKatex];
