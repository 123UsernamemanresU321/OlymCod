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
    <section className="mb-8 rounded-lg border border-[#c3c6d0] bg-white p-5 print:border-[#d0d0d0]">
      <h2 className="text-xl font-semibold text-[#1a1c1c]">Table of Contents</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {grouped.map(([topic, topicItems]) => (
          <div key={topic}>
            <h3 className="text-sm font-semibold text-[#0e3b69]">{topic}</h3>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-[#43474f]">
              {topicItems.map((item) => (
                <li key={`${item.sourceType}-${item.id}`}>{item.title}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}
