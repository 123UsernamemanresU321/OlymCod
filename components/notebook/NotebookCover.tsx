import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookCoverProps {
  config: NotebookConfig;
  itemCount: number;
  items: NotebookItem[];
}

export function NotebookCover({ config, itemCount, items }: NotebookCoverProps) {
  if (!config.pageSettings.includeCoverPage) return null;
  const topics = Array.from(new Set(items.map((item) => item.topic).filter(Boolean)));

  const formattedTopics = topics.length > 5 ? `${topics.length} selected topics` : topics.join(", ") || "All selected topics";

  return (
    <section className="notebook-cover mb-10 border border-[#e2e4ea] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-12 md:p-16 rounded-sm print:min-h-[45vh] print:border-0 print:p-0 print:shadow-none">
      <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#0e3b69]">
        Olympiad Codex · Academic Registry
      </p>
      <h1 className="mt-6 text-4xl font-semibold leading-tight text-[#1a1c1c] print:text-5xl">
        {config.coverTitle || "Olympiad Codex Notebook"}
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-[#43474f] border-l-2 border-[#0e3b69] pl-4">
        {config.coverSummary || "A printable mathematical notebook generated from Olympiad Codex."}
      </p>
      <div className="mt-12 grid gap-2 text-sm text-[#43474f] border-t border-[#f1f2f4] pt-6">
        <p><span className="font-semibold text-[#1a1c1c]">Detail Level:</span> {config.detailLevel}</p>
        <p><span className="font-semibold text-[#1a1c1c]">Items count:</span> {itemCount}</p>
        <p><span className="font-semibold text-[#1a1c1c]">Topics:</span> {formattedTopics}</p>
        <p><span className="font-semibold text-[#1a1c1c]">Generated:</span> {new Date().toLocaleDateString()}</p>
      </div>
    </section>
  );
}
