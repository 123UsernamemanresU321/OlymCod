import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { NotebookPrintSection } from "@/components/notebook/print/NotebookPrintSection";
import { getNotebookEntrySections } from "@/lib/notebook/renderNotebookMarkdown";
import { cn } from "@/lib/utils/cn";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookPrintEntryProps {
  item: NotebookItem;
  config: NotebookConfig;
}

function estimatedEntryLength(item: NotebookItem) {
  return [
    item.title,
    item.description,
    item.bodyMarkdown,
    ...Object.values(item.extractedSections),
    ...item.tags,
    ...item.linkedNotes.map((note) => note.title),
    ...item.linkedProblems.map((problem) => problem.title),
    ...item.linkedMistakes.map((mistake) => mistake.title)
  ]
    .filter(Boolean)
    .join(" ").length;
}

function metadataParts(item: NotebookItem, config: NotebookConfig) {
  return [
    config.sectionToggles.showMetadata ? item.topic : null,
    config.sectionToggles.showMetadata ? item.noteType : null,
    config.sectionToggles.showDifficulty && item.difficulty ? `Difficulty ${item.difficulty}` : null,
    config.sectionToggles.showReviewStatus && item.reviewStatus ? `Review ${item.reviewStatus.replaceAll("_", " ")}` : null,
    item.problemStatus ? `Status ${item.problemStatus.replaceAll("_", " ")}` : null,
    config.sectionToggles.showSourceReferences && item.sourceReference ? item.sourceReference : null,
    config.sectionToggles.showDates && item.updatedAt ? `Updated ${item.updatedAt.slice(0, 10)}` : null
  ].filter(Boolean);
}

export function NotebookPrintEntry({ item, config }: NotebookPrintEntryProps) {
  const sections = getNotebookEntrySections(item, config);
  const longEntry = estimatedEntryLength(item) > 3200 || sections.length > 7 || config.detailLevel === "Full Detail Mode";
  const parts = metadataParts(item, config);

  return (
    <article
      className={cn(
        "print-entry",
        longEntry && "long-entry",
        config.detailLevel === "Index Mode" && "print-entry-index",
        config.detailLevel === "Formula Sheet Mode" && "print-entry-formula"
      )}
    >
      <header className="print-entry-header">
        <h2>
          <InlineMarkdown text={item.title} />
        </h2>
        {parts.length || (config.sectionToggles.showTags && item.tags.length) ? (
          <p className="print-metadata">
            {[...parts, config.sectionToggles.showTags && item.tags.length ? `Tags: ${item.tags.join(", ")}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}
        {config.sectionToggles.showDescriptions && item.description ? (
          <InlineMarkdown text={item.description} className="print-description" />
        ) : null}
      </header>

      {sections.length ? (
        <div className="print-entry-sections">
          {sections.map((section, index) => (
            <NotebookPrintSection key={`${section.label}-${index}`} label={section.label} markdown={section.markdown} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
