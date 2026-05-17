import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookPrintCoverProps {
  config: NotebookConfig;
  items: NotebookItem[];
  itemCount: number;
}

export function NotebookPrintCover({ config, items, itemCount }: NotebookPrintCoverProps) {
  if (!config.pageSettings.includeCoverPage) return null;

  const topics = Array.from(new Set(items.map((item) => item.topic).filter(Boolean)));

  return (
    <section className="print-cover">
      <p className="print-kicker">Olympiad Codex</p>
      <h1>{config.coverTitle || "Olympiad Codex Notebook"}</h1>
      <p className="print-cover-summary">
        {config.coverSummary || "A printable mathematical notebook generated from Olympiad Codex."}
      </p>
      <dl className="print-cover-meta">
        <div>
          <dt>Detail Level</dt>
          <dd>{config.detailLevel}</dd>
        </div>
        <div>
          <dt>Items</dt>
          <dd>{itemCount}</dd>
        </div>
        <div>
          <dt>Topics</dt>
          <dd>{topics.length ? topics.join(", ") : "All selected topics"}</dd>
        </div>
        <div>
          <dt>Generated</dt>
          <dd>{new Date().toLocaleDateString()}</dd>
        </div>
      </dl>
    </section>
  );
}
