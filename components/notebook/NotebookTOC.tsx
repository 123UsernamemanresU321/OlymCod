import { notebookSectionEnabled } from "@/lib/notebook/defaultNotebookConfig";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookTOCProps {
  config: NotebookConfig;
  items: NotebookItem[];
}

export function NotebookTOC({ config, items }: NotebookTOCProps) {
  if (!config.pageSettings.includeTableOfContents || !notebookSectionEnabled(config, "showTableOfContents")) return null;
  const grouped = Array.from(
    items.reduce((map, item) => {
      const topic = item.topic || "Unsorted";
      map.set(topic, [...(map.get(topic) ?? []), item]);
      return map;
    }, new Map<string, NotebookItem[]>())
  );

  return (
    <section className="mb-10 border border-[#e2e4ea] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-10 md:p-12 rounded-sm print:border-[#d0d0d0] print:shadow-none">
      <h2 className="text-2xl font-semibold text-[#1a1c1c] border-b border-[#dfe3ea] pb-2">Table of Contents</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {grouped.map(([topic, topicItems]) => (
          <div key={topic} className="space-y-2">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#0e3b69] border-b border-[#f1f2f4] pb-1">{topic}</h3>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[#43474f]">
              {topicItems.map((item) => (
                <li key={`${item.sourceType}-${item.id}`} className="hover:text-[#0e3b69] transition-colors">{item.title}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
