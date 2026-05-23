import { diagramRenderUrl } from "@/lib/utils/diagrams";
import { notebookSectionEnabled } from "@/lib/notebook/defaultNotebookConfig";
import { CONCEPT_LEVEL_LABELS, PROBLEM_DIFFICULTY_LABELS } from "@/lib/constants/notes";
import { noteTypeDifficultyMeta } from "@/lib/constants/note-formats";
import type {
  NotebookConfig,
  NotebookEntrySection,
  NotebookItem,
  NotebookSectionToggle,
  NotebookSectionKey
} from "@/lib/notebook/types";

const SECTION_LABELS: Record<NotebookSectionKey, string> = {
  statement: "Statement",
  formula: "Formula",
  core_idea: "Core Idea",
  key_relation: "Key Relation",
  configuration: "Configuration",
  when_to_use: "When To Use It",
  signs: "Signs",
  intuition: "Intuition",
  proof: "Proof",
  derivation: "Derivation",
  example: "Example",
  common_mistakes: "Common Mistakes",
  related: "Related Techniques",
  problems: "Problems Where This Appears",
  conditions: "Conditions",
  source: "Source",
  solution: "Solution",
  key_idea: "Key Idea",
  mistake: "Mistake",
  correct_principle: "Correct Principle",
  how_to_recognize: "How To Recognize It",
  traps: "Traps",
  diagram: "Diagram",
  why_it_happens: "Why It Happens",
  how_to_avoid: "How To Avoid It",
  first_paragraph: "Summary",
  full: "Full Note"
};

function firstPresent(item: NotebookItem, keys: NotebookSectionKey[]) {
  return keys.find((key) => item.extractedSections[key]?.trim());
}

function addSection(
  item: NotebookItem,
  sections: NotebookEntrySection[],
  key: NotebookSectionKey | undefined,
  label = key ? SECTION_LABELS[key] : ""
) {
  if (!key) return;
  const markdown = item.extractedSections[key]?.trim();
  if (markdown) sections.push({ label, markdown });
}

function primarySectionLabel(item: NotebookItem, key: NotebookSectionKey | undefined) {
  if (key !== "statement") return key ? SECTION_LABELS[key] : "";
  if (item.noteType === "Definition") return "Definition";
  if (item.noteType === "Past Problem") return "Problem Statement";
  if (item.noteType === "Example") return "Problem / Example";
  return "Statement";
}

function linkedList(items: Array<{ title: string; relation?: string | null; status?: string | null; mistakeType?: string | null }>) {
  return items
    .map((item) => {
      const detail = item.relation ?? item.status ?? item.mistakeType;
      return `- ${item.title}${detail ? ` (${detail})` : ""}`;
    })
    .join("\n");
}

function diagramMarkdown(item: NotebookItem) {
  return item.diagrams.map((path) => `![Diagram](${diagramRenderUrl(path)})`).join("\n\n");
}

function learningList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function getNotebookEntrySections(item: NotebookItem, config: NotebookConfig): NotebookEntrySection[] {
  const sections: NotebookEntrySection[] = [];
  const show = (key: NotebookSectionToggle) => notebookSectionEnabled(config, key);

  if (config.detailLevel === "Index Mode") return sections;

  if (item.sourceType === "problem") {
    if (config.detailLevel === "Problem Booklet Mode" && show("showProblemStatements")) {
      addSection(item, sections, "first_paragraph", "Problem Statement");
    }
    if (show("showKeyIdeas")) addSection(item, sections, "key_idea", "Key Idea");
    if (show("showSolutionSummaries")) addSection(item, sections, "solution", "Solution Summary");
    if (show("showCommonMistakes")) addSection(item, sections, "mistake", "Mistake Made");
    if (show("showRelatedNotes") && item.linkedNotes.length) {
      sections.push({ label: "Linked Techniques", markdown: linkedList(item.linkedNotes) });
    }
    return sections;
  }

  if (item.sourceType === "mistake") {
    addSection(item, sections, "mistake", "Mistake");
    if (show("showCorrectPrinciples")) addSection(item, sections, "correct_principle", "Correct Principle");
    if (show("showExamples")) addSection(item, sections, "example", "Example");
    if (show("showRelatedNotes") && item.linkedNotes.length) {
      sections.push({ label: "Linked Notes", markdown: linkedList(item.linkedNotes) });
    }
    return sections;
  }

  if (item.sourceType === "capture" || item.sourceType === "diagram") {
    addSection(item, sections, item.sourceType === "diagram" ? "diagram" : "first_paragraph");
    return sections;
  }

  if (config.detailLevel === "Full Detail Mode") {
    if (item.bodyMarkdown) sections.push({ label: "Full Note", markdown: item.bodyMarkdown });
  } else if (config.detailLevel === "Formula Sheet Mode") {
    if (show("showStatements")) addSection(item, sections, firstPresent(item, ["formula", "statement", "first_paragraph"]), "Formula");
    if (show("showConditions")) addSection(item, sections, "conditions");
    if (show("showWhenToUse")) addSection(item, sections, "when_to_use", "Use Case");
  } else if (config.detailLevel === "Statement Mode") {
    if (show("showStatements")) {
      const key = firstPresent(item, ["statement", "formula", "core_idea", "key_relation", "configuration", "first_paragraph"]);
      addSection(item, sections, key, primarySectionLabel(item, key));
    }
  } else if (config.detailLevel === "Compact Revision Mode") {
    if (show("showStatements")) {
      const key = firstPresent(item, ["statement", "formula", "core_idea", "key_relation", "first_paragraph"]);
      addSection(item, sections, key, primarySectionLabel(item, key));
    }
    if (show("showWhenToUse")) addSection(item, sections, "when_to_use");
    if (show("showSigns")) addSection(item, sections, "signs");
    if (show("showCommonMistakes")) addSection(item, sections, "common_mistakes");
    if (show("showConditions")) addSection(item, sections, "conditions");
  } else {
    if (show("showStatements")) {
      const key = firstPresent(item, ["statement", "formula", "core_idea", "key_relation", "configuration", "first_paragraph"]);
      addSection(item, sections, key, primarySectionLabel(item, key));
    }
    if (show("showWhenToUse")) addSection(item, sections, "when_to_use");
    if (show("showSigns")) addSection(item, sections, "signs");
    if (show("showIntuition")) addSection(item, sections, "intuition");
    if (show("showHowToRecognize")) addSection(item, sections, "how_to_recognize");
    if (show("showExamples")) addSection(item, sections, "example");
    if (show("showCommonMistakes")) addSection(item, sections, "common_mistakes");
    if (show("showDiagramTraps")) addSection(item, sections, "traps", "Diagram Traps");
    if (show("showWhyItHappens")) addSection(item, sections, "why_it_happens");
    if (show("showHowToAvoid")) addSection(item, sections, "how_to_avoid");
    if (show("showProblemApplications")) addSection(item, sections, "problems");
    if (show("showRelatedNotes")) addSection(item, sections, "related");
  }

  if (show("showRecognitionTriggers") && item.recognitionTriggers.length && config.detailLevel !== "Statement Mode") {
    sections.push({ label: "Recognition Triggers", markdown: learningList(item.recognitionTriggers) });
  }
  if (show("showFalseUses") && item.falseUses.length && config.detailLevel !== "Statement Mode") {
    sections.push({ label: "Common False Uses", markdown: learningList(item.falseUses) });
  }

  if (show("showProofs")) addSection(item, sections, firstPresent(item, ["proof", "derivation"]));
  if (show("showDiagrams") && item.diagrams.length && config.detailLevel !== "Full Detail Mode") {
    sections.push({ label: "Diagrams", markdown: diagramMarkdown(item) });
  }
  if (show("showRelatedNotes") && item.linkedNotes.length) {
    sections.push({ label: "Related Notes", markdown: linkedList(item.linkedNotes) });
  }
  if (show("showLinkedProblems") && item.linkedProblems.length) {
    sections.push({ label: "Linked Problems", markdown: linkedList(item.linkedProblems) });
  }
  if (show("showLinkedMistakes") && item.linkedMistakes.length) {
    sections.push({ label: "Linked Mistakes", markdown: linkedList(item.linkedMistakes) });
  }

  return sections;
}

function metadataLine(item: NotebookItem, config: NotebookConfig) {
  const show = (key: NotebookSectionToggle) => notebookSectionEnabled(config, key);
  const difficultyLabel =
    item.sourceType === "problem"
      ? item.difficulty
        ? `Problem Difficulty ${item.difficulty}. ${PROBLEM_DIFFICULTY_LABELS[item.difficulty]}`
        : null
      : item.difficulty
        ? `${noteTypeDifficultyMeta(item.noteType).label} ${item.difficulty}. ${
            noteTypeDifficultyMeta(item.noteType).kind === "problem"
              ? PROBLEM_DIFFICULTY_LABELS[item.difficulty]
              : CONCEPT_LEVEL_LABELS[item.difficulty]
          }`
        : null;
  const parts = [
    show("showMetadata") ? item.topic : null,
    show("showMetadata") ? item.noteType : null,
    show("showDifficulty") ? difficultyLabel : null,
    show("showReviewStatus") && item.reviewStatus ? `Review ${item.reviewStatus}` : null,
    item.problemStatus ? `Status ${item.problemStatus}` : null,
    show("showDates") && item.updatedAt ? `Updated ${item.updatedAt.slice(0, 10)}` : null
  ].filter(Boolean);
  return parts.length ? `_${parts.join(" · ")}_` : "";
}

export function renderNotebookMarkdown(items: NotebookItem[], config: NotebookConfig) {
  const show = (key: NotebookSectionToggle) => notebookSectionEnabled(config, key);
  const lines = [
    `# ${config.coverTitle || "Olympiad Codex Notebook Export"}`,
    "",
    `Generated: ${new Date().toISOString()}`,
    `Detail Level: ${config.detailLevel}`,
    `Topics: ${config.topics.length ? config.topics.join(", ") : "All"}`,
    ""
  ];

  let currentTopic = "";
  for (const item of items) {
    const topic = item.topic || "Unsorted";
    if (topic !== currentTopic) {
      currentTopic = topic;
      lines.push("", `## ${topic}`, "");
    }

    lines.push(`### ${item.title}`);
    const meta = metadataLine(item, config);
    if (meta) lines.push("", meta);
    if (show("showDescriptions") && item.description) lines.push("", item.description);
    if (show("showTags") && item.tags.length) lines.push("", `Tags: ${item.tags.join(", ")}`);
    if (show("showSourceReferences") && item.sourceReference) lines.push("", `Source: ${item.sourceReference}`);

    for (const section of getNotebookEntrySections(item, config)) {
      lines.push("", `#### ${section.label}`, "", section.markdown);
    }

    lines.push("");
  }

  return lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
}
