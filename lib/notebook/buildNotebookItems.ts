import { topicIncludes } from "@/lib/constants/notes";
import { diagramRenderUrl } from "@/lib/utils/diagrams";
import { extractNotebookSections } from "@/lib/notebook/extractSections";
import { sortNotebookItems } from "@/lib/notebook/sortNotebookItems";
import type { NotebookConfig, NotebookItem, NotebookRawData } from "@/lib/notebook/types";
import type { Diagram, MistakeLog, Note, NoteLink, NoteReview, ProblemLog } from "@/lib/types";

const PREVIEW_LIMIT = 50;
const LARGE_EXPORT_LIMIT = 300;

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function noteIsFormula(note: Note) {
  return note.note_type === "Formula" || note.note_type === "Formula Log" || topicIncludes(note.topic, "Formula Bank");
}

function isDueReview(review?: NoteReview) {
  if (!review || review.review_status === "ignored") return false;
  if (!review.next_review_at) return true;
  return review.next_review_at <= new Date().toISOString().slice(0, 10);
}

function matchesTopics(topic: string | null | undefined, config: NotebookConfig) {
  if (!config.topics.length) return true;
  return config.topics.some((filter) => topicIncludes(topic ?? "", filter));
}

function matchesTags(tags: string[], config: NotebookConfig) {
  if (!config.tags.length) return true;
  const normalized = tags.map((tag) => tag.toLowerCase());
  return config.tags.some((tag) => normalized.includes(tag.toLowerCase()));
}

function matchesDifficulty(difficulty: number | null | undefined, config: NotebookConfig) {
  if (difficulty == null) return true;
  return difficulty >= config.difficultyMin && difficulty <= config.difficultyMax;
}

function matchesReviewStatus(status: string | null | undefined, config: NotebookConfig) {
  if (!config.reviewStatuses.length) return true;
  return Boolean(status && config.reviewStatuses.includes(status));
}

function matchesProblemStatus(status: string | null | undefined, config: NotebookConfig) {
  if (!config.problemStatuses.length) return true;
  return Boolean(status && config.problemStatuses.includes(status));
}

function sourceReference(problem: ProblemLog) {
  return [problem.source, problem.olympiad, problem.year, problem.problem_number ? `#${problem.problem_number}` : null]
    .filter(Boolean)
    .join(" ");
}

function mapLinkedNotes(ids: string[], noteMap: Map<string, Note>) {
  return ids.flatMap((id) => {
    const note = noteMap.get(id);
    return note ? [{ id: note.id, title: note.title, relation: null }] : [];
  });
}

function linkedFromNote(note: Note, links: NoteLink[], noteMap: Map<string, Note>) {
  return links
    .filter((link) => link.source_note_id === note.id)
    .flatMap((link) => {
      const target = noteMap.get(link.target_note_id);
      return target ? [{ id: target.id, title: target.title, relation: link.relation_type }] : [];
    });
}

function diagramsForNote(note: Note, diagrams: Diagram[]) {
  return unique([
    ...(note.diagram_urls ?? []),
    ...diagrams.filter((diagram) => diagram.note_id === note.id).map((diagram) => diagram.storage_path)
  ]);
}

function noteItem(
  note: Note,
  raw: NotebookRawData,
  noteMap: Map<string, Note>,
  reviewMap: Map<string, NoteReview>
): NotebookItem {
  const problems = raw.problems.filter((problem) => problem.linked_note_ids.includes(note.id));
  const mistakes = raw.mistakes.filter((mistake) => mistake.linked_note_ids.includes(note.id));
  return {
    id: note.id,
    sourceType: "note",
    title: note.title,
    topic: note.topic,
    noteType: note.note_type,
    difficulty: note.difficulty,
    tags: note.tags ?? [],
    description: note.description,
    bodyMarkdown: note.body_markdown,
    recognitionTriggers: note.recognition_triggers ?? [],
    falseUses: note.false_uses ?? [],
    extractedSections: extractNotebookSections(note.body_markdown),
    diagrams: diagramsForNote(note, raw.diagrams),
    linkedNotes: linkedFromNote(note, raw.noteLinks, noteMap),
    linkedProblems: problems.map((problem) => ({ id: problem.id, title: problem.title, status: problem.status })),
    linkedMistakes: mistakes.map((mistake) => ({ id: mistake.id, title: mistake.title, mistakeType: mistake.mistake_type })),
    reviewStatus: reviewMap.get(note.id)?.review_status ?? null,
    createdAt: note.created_at,
    updatedAt: note.updated_at
  };
}

function problemItem(problem: ProblemLog, noteMap: Map<string, Note>): NotebookItem {
  const linkedNotes = mapLinkedNotes(problem.linked_note_ids, noteMap);
  return {
    id: problem.id,
    sourceType: "problem",
    title: problem.title,
    topic: problem.topic ?? (linkedNotes[0]?.title ? noteMap.get(problem.linked_note_ids[0])?.topic : null),
    noteType: "Problem Log",
    difficulty: problem.difficulty,
    tags: problem.tags ?? [],
    description: problem.key_idea,
    bodyMarkdown: problem.problem_text,
    extractedSections: {
      first_paragraph: problem.problem_text ?? problem.key_idea ?? "",
      key_idea: problem.key_idea ?? "",
      solution: problem.solution_summary ?? "",
      mistake: problem.mistake_made ?? ""
    },
    recognitionTriggers: [],
    falseUses: problem.mistake_category ? [problem.mistake_category] : [],
    diagrams: [],
    linkedNotes,
    linkedProblems: [],
    linkedMistakes: [],
    problemStatus: problem.status,
    sourceReference: sourceReference(problem),
    createdAt: problem.created_at,
    updatedAt: problem.updated_at
  };
}

function mistakeItem(mistake: MistakeLog, noteMap: Map<string, Note>): NotebookItem {
  return {
    id: mistake.id,
    sourceType: "mistake",
    title: mistake.title,
    topic: mistake.topic,
    noteType: mistake.mistake_type ?? "Mistake",
    difficulty: mistake.severity,
    tags: [],
    description: mistake.description,
    bodyMarkdown: [mistake.description, mistake.correct_principle, mistake.example].filter(Boolean).join("\n\n"),
    recognitionTriggers: [],
    falseUses: [mistake.description].filter(Boolean),
    extractedSections: {
      mistake: mistake.description,
      correct_principle: mistake.correct_principle ?? "",
      example: mistake.example ?? ""
    },
    diagrams: [],
    linkedNotes: mapLinkedNotes(mistake.linked_note_ids, noteMap),
    linkedProblems: mistake.linked_problem_id ? [{ id: mistake.linked_problem_id, title: "Linked problem" }] : [],
    linkedMistakes: [],
    createdAt: mistake.created_at,
    updatedAt: mistake.updated_at
  };
}

function captureItem(capture: NotebookRawData["captures"][number]): NotebookItem {
  return {
    id: capture.id,
    sourceType: "capture",
    title: capture.raw_text.split(/\r?\n/)[0]?.slice(0, 90) || "Quick Capture",
    topic: capture.topic_guess,
    noteType: capture.capture_type,
    tags: capture.tags ?? [],
    description: capture.raw_text,
    bodyMarkdown: capture.raw_text,
    recognitionTriggers: [],
    falseUses: [],
    extractedSections: { first_paragraph: capture.raw_text, full: capture.raw_text },
    diagrams: capture.attachment_urls ?? [],
    linkedNotes: [],
    linkedProblems: capture.converted_note_id ? [{ id: capture.converted_note_id, title: "Converted note" }] : [],
    linkedMistakes: [],
    createdAt: capture.created_at,
    updatedAt: capture.updated_at
  };
}

function diagramItem(diagram: Diagram, noteMap: Map<string, Note>): NotebookItem {
  const note = diagram.note_id ? noteMap.get(diagram.note_id) : null;
  return {
    id: diagram.id,
    sourceType: "diagram",
    title: diagram.caption || diagram.filename,
    topic: note?.topic ?? "Geometry",
    noteType: "Diagram",
    tags: [],
    description: note ? `Attached to ${note.title}` : "Unattached diagram",
    bodyMarkdown: `![${diagram.caption || diagram.filename}](${diagramRenderUrl(diagram.storage_path)})`,
    recognitionTriggers: [],
    falseUses: [],
    extractedSections: { diagram: `![${diagram.caption || diagram.filename}](${diagramRenderUrl(diagram.storage_path)})` },
    diagrams: [diagram.storage_path],
    linkedNotes: note ? [{ id: note.id, title: note.title, relation: "diagram" }] : [],
    linkedProblems: [],
    linkedMistakes: [],
    createdAt: diagram.created_at,
    updatedAt: diagram.updated_at
  };
}

function matchesWhitelist(item: NotebookItem, config: NotebookConfig) {
  if (config.noteIds.length && !config.noteIds.includes(item.id)) return false;
  if (!matchesTopics(item.topic, config)) return false;
  if (item.sourceType === "note" && config.noteTypes.length && !config.noteTypes.includes(item.noteType ?? "")) return false;
  if (!matchesDifficulty(item.difficulty, config)) return false;
  if (!matchesTags(item.tags, config)) return false;
  if (!matchesReviewStatus(item.reviewStatus, config)) return false;
  if (item.sourceType === "problem" && !matchesProblemStatus(item.problemStatus, config)) return false;
  return true;
}

function arrayIntersects(values: string[], filters: string[]) {
  if (!filters.length) return false;
  const normalized = values.map((value) => value.toLowerCase());
  return filters.some((filter) => normalized.includes(filter.toLowerCase()));
}

function topicHitsBlacklist(topic: string | null | undefined, config: NotebookConfig) {
  return config.excludeTopics.some((filter) => topicIncludes(topic ?? "", filter));
}

function difficultyHitsBlacklist(difficulty: number | null | undefined, config: NotebookConfig) {
  if (difficulty == null) return false;
  if (config.excludeDifficultyMin == null || config.excludeDifficultyMax == null) return false;
  return difficulty >= config.excludeDifficultyMin && difficulty <= config.excludeDifficultyMax;
}

function matchesBlacklist(item: NotebookItem, config: NotebookConfig) {
  if (config.excludeNoteIds.includes(item.id)) return false;
  if (topicHitsBlacklist(item.topic, config)) return false;
  if (item.sourceType === "note" && config.excludeNoteTypes.includes(item.noteType ?? "")) return false;
  if (difficultyHitsBlacklist(item.difficulty, config)) return false;
  if (arrayIntersects(item.tags, config.excludeTags)) return false;
  if (item.reviewStatus && config.excludeReviewStatuses.includes(item.reviewStatus)) return false;
  if (config.excludeMastered && item.reviewStatus === "mastered") return false;
  if (item.sourceType === "problem" && item.problemStatus && config.excludeProblemStatuses.includes(item.problemStatus)) return false;
  return true;
}

function matchesConfig(item: NotebookItem, config: NotebookConfig) {
  const passesSelection =
    config.selectionMode === "blacklist" ? matchesBlacklist(item, config) : matchesWhitelist(item, config);
  if (!passesSelection) return false;
  if (config.detailLevel === "Formula Sheet Mode" && !(item.sourceType === "note" && (item.noteType === "Formula" || item.noteType === "Formula Log" || topicIncludes(item.topic ?? "", "Formula Bank")))) return false;
  if (config.detailLevel === "Problem Booklet Mode" && item.sourceType !== "problem") return false;
  return true;
}

export function buildNotebookItems(raw: NotebookRawData, config: NotebookConfig) {
  const noteMap = new Map(raw.notes.map((note) => [note.id, note]));
  const reviewMap = new Map(raw.reviews.map((review) => [review.note_id, review]));
  const itemMap = new Map<string, NotebookItem>();

  for (const note of raw.notes) {
    const review = reviewMap.get(note.id);
    const include =
      config.contentSources.notes ||
      (config.contentSources.formulaBank && noteIsFormula(note)) ||
      (config.contentSources.reviewDueNotes && isDueReview(review)) ||
      (config.contentSources.quickCaptures && (note.topic === "Inbox" || note.note_type === "Inbox"));
    if (include) itemMap.set(`note:${note.id}`, noteItem(note, raw, noteMap, reviewMap));
  }

  if (config.contentSources.problemLogs || config.detailLevel === "Problem Booklet Mode") {
    for (const problem of raw.problems) itemMap.set(`problem:${problem.id}`, problemItem(problem, noteMap));
  }

  if (config.contentSources.mistakeLogs) {
    for (const mistake of raw.mistakes) itemMap.set(`mistake:${mistake.id}`, mistakeItem(mistake, noteMap));
  }

  if (config.contentSources.quickCaptures) {
    for (const capture of raw.captures.filter((capture) => !capture.is_archived)) {
      itemMap.set(`capture:${capture.id}`, captureItem(capture));
    }
  }

  if (config.contentSources.diagrams) {
    for (const diagram of raw.diagrams) itemMap.set(`diagram:${diagram.id}`, diagramItem(diagram, noteMap));
  }

  const items = sortNotebookItems([...itemMap.values()].filter((item) => matchesConfig(item, config)), config.sortOrder);

  return {
    config,
    items,
    previewItems: items.slice(0, PREVIEW_LIMIT),
    itemCount: items.length,
    warning:
      items.length > LARGE_EXPORT_LIMIT
        ? "This export may be large. Consider filtering by topic or using compact mode."
        : undefined
  };
}
