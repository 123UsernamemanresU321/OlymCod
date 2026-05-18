import { NotebookPrintCover } from "@/components/notebook/print/NotebookPrintCover";
import { NotebookPrintEntry } from "@/components/notebook/print/NotebookPrintEntry";
import { NotebookPrintTOC } from "@/components/notebook/print/NotebookPrintTOC";
import { notebookSectionEnabled } from "@/lib/notebook/defaultNotebookConfig";
import { cn } from "@/lib/utils/cn";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookPrintDocumentProps {
  config: NotebookConfig;
  items: NotebookItem[];
  itemCount: number;
  warning?: string;
}

function groupByTopic(items: NotebookItem[]) {
  return Array.from(
    items.reduce((map, item) => {
      const topic = item.topic || "Unsorted";
      map.set(topic, [...(map.get(topic) ?? []), item]);
      return map;
    }, new Map<string, NotebookItem[]>())
  );
}

export function NotebookPrintDocument({ config, items, itemCount, warning }: NotebookPrintDocumentProps) {
  const grouped = groupByTopic(items);
  const shouldBreakTopics = config.pageSettings.startEachTopicOnNewPage || notebookSectionEnabled(config, "pageBreakBetweenTopics");
  const isFormulaSheet = config.detailLevel === "Formula Sheet Mode" || config.layoutStyle === "Formula Sheet";

  if (!items.length) {
    return (
      <main className="print-document print-empty">
        <h1>No notebook items match these filters.</h1>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "print-document",
        isFormulaSheet && "print-document-formula-sheet",
        config.pageSettings.fontSize === "small" && "print-font-small",
        config.pageSettings.fontSize === "large" && "print-font-large"
      )}
    >
      {warning ? <p className="notebook-print-hidden print-warning">{warning}</p> : null}
      <NotebookPrintCover config={config} items={items} itemCount={itemCount} />
      <NotebookPrintTOC config={config} items={items} />

      {grouped.map(([topic, topicItems], index) => (
        <section
          key={topic}
          className={cn("print-topic", index > 0 && shouldBreakTopics && "print-topic-page-break")}
        >
          <h1 className="print-topic-title">{topic}</h1>
          <div className={cn("print-topic-entries", isFormulaSheet && "print-formula-grid")}>
            {topicItems.map((item) => (
              <NotebookPrintEntry key={`${item.sourceType}-${item.id}`} item={item} config={config} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
