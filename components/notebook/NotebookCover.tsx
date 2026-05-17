import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookCoverProps {
  config: NotebookConfig;
  itemCount: number;
  items: NotebookItem[];
}

export function NotebookCover({ config, itemCount, items }: NotebookCoverProps) {
  if (!config.pageSettings.includeCoverPage) return null;
  const topics = Array.from(new Set(items.map((item) => item.topic).filter(Boolean)));

  return (
    <section className="notebook-cover mb-8 rounded-lg border border-[#c3c6d0] bg-white p-8 print:min-h-[45vh] print:border-0 print:p-0">
      <p className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#0e3b69]">
        Olympiad Codex
      </p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#1a1c1c] print:text-5xl">
        {config.coverTitle || "Olympiad Codex Notebook"}
      </h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-[#43474f]">
        {config.coverSummary || "A printable mathematical notebook generated from Olympiad Codex."}
      </p>
      <div className="mt-8 grid gap-2 text-sm text-[#43474f]">
        <p>Detail level: {config.detailLevel}</p>
        <p>Items: {itemCount}</p>
        <p>Topics: {topics.length ? topics.join(", ") : "All selected topics"}</p>
        <p>Generated: {new Date().toLocaleString()}</p>
      </div>
    </section>
  );
}
