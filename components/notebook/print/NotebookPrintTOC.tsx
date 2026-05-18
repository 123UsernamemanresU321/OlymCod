import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { notebookSectionEnabled } from "@/lib/notebook/defaultNotebookConfig";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookPrintTOCProps {
  config: NotebookConfig;
  items: NotebookItem[];
}

export function NotebookPrintTOC({ config, items }: NotebookPrintTOCProps) {
  if (!config.pageSettings.includeTableOfContents || !notebookSectionEnabled(config, "showTableOfContents")) return null;

  const grouped = Array.from(
    items.reduce((map, item) => {
      const topic = item.topic || "Unsorted";
      map.set(topic, [...(map.get(topic) ?? []), item]);
      return map;
    }, new Map<string, NotebookItem[]>())
  );

  return (
    <section className="print-toc">
      <h1>Table of Contents</h1>
      <div className="print-toc-grid">
        {grouped.map(([topic, topicItems]) => (
          <section key={topic} className="print-toc-topic">
            <h2>{topic}</h2>
            <ol>
              {topicItems.map((item) => (
                <li key={`${item.sourceType}-${item.id}`}>
                  <InlineMarkdown text={item.title} />
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}
