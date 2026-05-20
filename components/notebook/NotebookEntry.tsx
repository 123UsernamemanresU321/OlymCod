import { InlineMarkdown } from "@/components/editor/InlineMarkdown";
import { NotebookSection } from "@/components/notebook/NotebookSection";
import { Badge, DifficultyBadge } from "@/components/ui/Badge";
import { notebookSectionEnabled } from "@/lib/notebook/defaultNotebookConfig";
import { getNotebookEntrySections } from "@/lib/notebook/renderNotebookMarkdown";
import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

interface NotebookEntryProps {
  item: NotebookItem;
  config: NotebookConfig;
}

export function NotebookEntry({ item, config }: NotebookEntryProps) {
  const sections = getNotebookEntrySections(item, config);
  const show = (key: keyof NotebookConfig["sectionToggles"]) => notebookSectionEnabled(config, key);

  return (
    <article className="notebook-entry rounded-lg border border-[#d5d7de] bg-white p-5 shadow-sm print:break-inside-avoid print:border-[#d0d0d0] print:shadow-none">
      <header>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          {show("showMetadata") && item.topic ? <Badge tone="blue">{item.topic}</Badge> : null}
          {show("showMetadata") && item.noteType ? <Badge>{item.noteType}</Badge> : null}
          {show("showDifficulty") ? (
            <DifficultyBadge
              value={item.difficulty ?? null}
              noteType={item.noteType}
              kind={item.sourceType === "problem" ? "problem" : "concept"}
            />
          ) : null}
          {show("showReviewStatus") && item.reviewStatus ? (
            <Badge tone="green">{item.reviewStatus.replaceAll("_", " ")}</Badge>
          ) : null}
          {item.problemStatus ? <Badge>{item.problemStatus.replaceAll("_", " ")}</Badge> : null}
        </div>

        <h3 className="mt-3 text-2xl font-semibold leading-tight text-[#1a1c1c] print:text-xl">
          <InlineMarkdown text={item.title} />
        </h3>

        {show("showDescriptions") && item.description ? (
          <InlineMarkdown text={item.description} className="mt-2 block text-sm leading-6 text-[#43474f]" />
        ) : null}

        {show("showSourceReferences") && item.sourceReference ? (
          <p className="mt-2 text-sm text-[#43474f]">Source: {item.sourceReference}</p>
        ) : null}

        {show("showTags") && item.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.tags.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        ) : null}
      </header>

      {sections.length ? (
        <div className="mt-4">
          {sections.map((section, index) => (
            <NotebookSection key={`${section.label}-${index}`} label={section.label} markdown={section.markdown} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#43474f]">No selected sections are available for this item.</p>
      )}
    </article>
  );
}
