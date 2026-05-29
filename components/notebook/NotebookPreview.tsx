import { NotebookCover } from "@/components/notebook/NotebookCover";
import { NotebookEntry } from "@/components/notebook/NotebookEntry";
import { NotebookTOC } from "@/components/notebook/NotebookTOC";
import { Button } from "@/components/ui/Button";
import { notebookSectionEnabled } from "@/lib/notebook/defaultNotebookConfig";
import { cn } from "@/lib/utils/cn";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

// NotebookEntry renders each body section through MarkdownPreview so the preview keeps KaTeX behavior consistent.
interface NotebookPreviewProps {
  config: NotebookConfig;
  items: NotebookItem[];
  itemCount: number;
  warning?: string;
  renderAll: boolean;
  onRenderAll: () => void;
  onClearFilters: () => void;
}

export function NotebookPreview({
  config,
  items,
  itemCount,
  warning,
  renderAll,
  onRenderAll,
  onClearFilters
}: NotebookPreviewProps) {
  const grouped = Array.from(
    items.reduce((map, item) => {
      const topic = item.topic || "Unsorted";
      map.set(topic, [...(map.get(topic) ?? []), item]);
      return map;
    }, new Map<string, NotebookItem[]>())
  );

  const columnClass = config.pageSettings.columns === "two" ? "xl:grid-cols-2" : "grid-cols-1";
  const shouldBreakTopics = notebookSectionEnabled(config, "pageBreakBetweenTopics");

  if (!items.length) {
    return (
      <div className="rounded-lg border border-[#c3c6d0] bg-white p-8 text-center">
        <h2 className="text-xl font-semibold text-[#1a1c1c]">No notebook items match these filters.</h2>
        <p className="mt-2 text-sm leading-6 text-[#43474f]">Clear filters or load the Full Personal Notebook preset.</p>
        <Button type="button" className="mt-4" variant="secondary" onClick={onClearFilters}>
          Clear Filters
        </Button>
      </div>
    );
  }

  return (
    <div className="notebook-document mx-auto max-w-5xl">
      {warning ? (
        <div className="notebook-print-hidden mb-4 rounded border border-[#f4c26b] bg-[#fff8e6] p-3 text-sm text-[#6b4a00]">
          {warning}
        </div>
      ) : null}

      {!renderAll && itemCount > items.length ? (
        <div className="notebook-print-hidden mb-4 flex flex-col gap-3 rounded border border-[#c3c6d0] bg-white p-4 text-sm text-[#43474f] sm:flex-row sm:items-center sm:justify-between">
          <span>Previewing {items.length} of {itemCount} items.</span>
          <Button type="button" variant="secondary" onClick={onRenderAll}>
            Render all
          </Button>
        </div>
      ) : null}

      <NotebookCover config={config} itemCount={itemCount} items={items} />
      <NotebookTOC config={config} items={items} />

      <div className="grid gap-8">
        {grouped.map(([topic, topicItems], index) => (
          <section
            key={topic}
            className={cn(
              "notebook-topic-section border border-[#e2e4ea] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] p-10 md:p-12 rounded-sm print:border-0 print:shadow-none print:p-0",
              index > 0 && shouldBreakTopics && "notebook-page-break"
            )}
          >
            <div className="mb-6 border-b border-[#dfe3ea] pb-2">
              <h2 className="text-2xl font-semibold text-[#1a1c1c]">{topic}</h2>
            </div>
            <div className={cn("grid gap-6", columnClass)}>
              {topicItems.map((item) => (
                <NotebookEntry key={`${item.sourceType}-${item.id}`} item={item} config={config} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
