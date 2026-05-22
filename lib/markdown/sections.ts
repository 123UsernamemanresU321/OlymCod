export interface MarkdownHeading {
  id: string;
  level: number;
  title: string;
  startLine: number;
  endLine: number;
  content: string;
}

export function slugHeading(title: string) {
  return title
    .toLowerCase()
    .replace(/[`*_()[\]{}$\\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const lines = markdown.split(/\r?\n/);
  const headings: Array<Omit<MarkdownHeading, "endLine" | "content">> = [];
  let inFence = false;

  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (!match) return;
    const title = match[2].trim();
    headings.push({
      id: `${slugHeading(title) || "section"}-${index}`,
      level: match[1].length,
      title,
      startLine: index
    });
  });

  return headings.map((heading, index) => {
    const next = headings.slice(index + 1).find((candidate) => candidate.level <= heading.level);
    const endLine = next ? next.startLine - 1 : lines.length - 1;
    return {
      ...heading,
      endLine,
      content: lines.slice(heading.startLine + 1, endLine + 1).join("\n").trim()
    };
  });
}

export function replaceHeadingSection(markdown: string, heading: MarkdownHeading, replacementMarkdown: string) {
  const lines = markdown.split(/\r?\n/);
  const next = [
    ...lines.slice(0, heading.startLine),
    ...replacementMarkdown.trimEnd().split(/\r?\n/),
    ...lines.slice(heading.endLine + 1)
  ];
  return next.join("\n").trimEnd();
}

export function extractSpecificSection(markdown: string, title: string) {
  const wanted = title.trim().toLowerCase();
  return parseMarkdownHeadings(markdown).find((heading) => heading.title.trim().toLowerCase() === wanted);
}
