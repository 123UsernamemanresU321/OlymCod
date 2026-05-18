import { NOTE_TYPES, TOPICS } from "@/lib/constants/notes";
import type {
  NotebookConfig,
  NotebookContentSource,
  NotebookDetailLevel,
  NotebookLayoutStyle,
  NotebookPresetDefinition,
  NotebookSectionToggle,
  NotebookSortOrder
} from "@/lib/notebook/types";

export const NOTEBOOK_CONTENT_SOURCES: Array<{ key: NotebookContentSource; label: string }> = [
  { key: "notes", label: "Notes" },
  { key: "formulaBank", label: "Formula Bank" },
  { key: "problemLogs", label: "Problem Logs" },
  { key: "mistakeLogs", label: "Mistake Logs" },
  { key: "quickCaptures", label: "Quick Captures / Inbox" },
  { key: "diagrams", label: "Diagrams" },
  { key: "reviewDueNotes", label: "Review Due Notes" }
];

export const NOTEBOOK_DETAIL_LEVELS: NotebookDetailLevel[] = [
  "Index Mode",
  "Statement Mode",
  "Compact Revision Mode",
  "Standard Notebook Mode",
  "Full Detail Mode",
  "Formula Sheet Mode",
  "Problem Booklet Mode"
];

export const NOTEBOOK_LAYOUT_STYLES: NotebookLayoutStyle[] = [
  "Clean Notebook",
  "Compact Handbook",
  "Formula Sheet",
  "Problem Booklet",
  "Print Friendly",
  "Minimal Exam Revision"
];

export const NOTEBOOK_SORT_ORDERS: NotebookSortOrder[] = [
  "Topic then type",
  "Topic then difficulty",
  "Recently updated",
  "Alphabetical",
  "Difficulty ascending",
  "Difficulty descending",
  "Review priority"
];

export const NOTEBOOK_SECTION_TOGGLES: Array<{ key: NotebookSectionToggle; label: string }> = [
  { key: "showMetadata", label: "Show metadata badges" },
  { key: "showTags", label: "Show tags" },
  { key: "showDifficulty", label: "Show difficulty" },
  { key: "showDescriptions", label: "Show descriptions" },
  { key: "showStatements", label: "Show statements" },
  { key: "showWhenToUse", label: "Show when to use" },
  { key: "showSigns", label: "Show recognition signs" },
  { key: "showIntuition", label: "Show intuition" },
  { key: "showConditions", label: "Show conditions" },
  { key: "showHowToRecognize", label: "Show how to recognize it" },
  { key: "showProofs", label: "Show proofs" },
  { key: "showExamples", label: "Show examples" },
  { key: "showCommonMistakes", label: "Show common mistakes" },
  { key: "showDiagramTraps", label: "Show diagram traps" },
  { key: "showWhyItHappens", label: "Show why it happens" },
  { key: "showHowToAvoid", label: "Show how to avoid it" },
  { key: "showRecognitionTriggers", label: "Show recognition triggers" },
  { key: "showFalseUses", label: "Show common false uses" },
  { key: "showRelatedNotes", label: "Show related notes" },
  { key: "showBacklinks", label: "Show backlinks" },
  { key: "showLinkedProblems", label: "Show linked problems" },
  { key: "showLinkedMistakes", label: "Show linked mistakes" },
  { key: "showDiagrams", label: "Show diagrams" },
  { key: "showProblemStatements", label: "Show problem statements" },
  { key: "showSolutionSummaries", label: "Show solution summaries" },
  { key: "showSourceReferences", label: "Show source references" },
  { key: "showKeyIdeas", label: "Show key ideas" },
  { key: "showCorrectPrinciples", label: "Show correct principles" },
  { key: "showProblemApplications", label: "Show problems where this appears" },
  { key: "showDates", label: "Show dates" },
  { key: "showReviewStatus", label: "Show review status" },
  { key: "pageBreakBetweenTopics", label: "Page breaks between topics" },
  { key: "showTableOfContents", label: "Show table of contents" }
];

const defaultSectionToggles: NotebookConfig["sectionToggles"] = {
  showMetadata: true,
  showTags: true,
  showDifficulty: true,
  showDescriptions: true,
  showStatements: true,
  showWhenToUse: true,
  showSigns: true,
  showIntuition: true,
  showConditions: true,
  showHowToRecognize: true,
  showProofs: true,
  showExamples: true,
  showCommonMistakes: true,
  showDiagramTraps: true,
  showWhyItHappens: true,
  showHowToAvoid: true,
  showRecognitionTriggers: true,
  showFalseUses: true,
  showRelatedNotes: true,
  showBacklinks: false,
  showLinkedProblems: true,
  showLinkedMistakes: true,
  showDiagrams: true,
  showProblemStatements: true,
  showSolutionSummaries: true,
  showSourceReferences: true,
  showKeyIdeas: true,
  showCorrectPrinciples: true,
  showProblemApplications: true,
  showDates: false,
  showReviewStatus: true,
  pageBreakBetweenTopics: false,
  showTableOfContents: true
};

type NotebookConfigOverride = Omit<Partial<NotebookConfig>, "contentSources" | "sectionToggles" | "pageSettings"> & {
  contentSources?: Partial<NotebookConfig["contentSources"]>;
  sectionToggles?: Partial<NotebookConfig["sectionToggles"]>;
  pageSettings?: Partial<NotebookConfig["pageSettings"]>;
};

export const DEFAULT_NOTEBOOK_CONFIG: NotebookConfig = {
  contentSources: {
    notes: true,
    formulaBank: true,
    problemLogs: false,
    mistakeLogs: false,
    quickCaptures: false,
    diagrams: false,
    reviewDueNotes: false
  },
  selectionMode: "whitelist",
  noteIds: [],
  topics: [],
  noteTypes: [],
  difficultyMin: 1,
  difficultyMax: 12,
  tags: [],
  reviewStatuses: [],
  problemStatuses: [],
  excludeNoteIds: [],
  excludeTopics: [],
  excludeNoteTypes: [],
  excludeDifficultyMin: null,
  excludeDifficultyMax: null,
  excludeTags: [],
  excludeReviewStatuses: [],
  excludeProblemStatuses: [],
  excludeMastered: false,
  detailLevel: "Standard Notebook Mode",
  sectionSelectionMode: "whitelist",
  sectionToggles: defaultSectionToggles,
  layoutStyle: "Clean Notebook",
  sortOrder: "Topic then type",
  pageSettings: {
    pageSize: "A4",
    margins: "normal",
    fontSize: "normal",
    columns: "one",
    includeCoverPage: true,
    includeTableOfContents: true,
    startEachTopicOnNewPage: false
  },
  coverTitle: "Olympiad Codex Notebook",
  coverSummary: "A printable mathematical notebook generated from Olympiad Codex."
};

function withConfig(update: NotebookConfigOverride): NotebookConfig {
  return {
    ...DEFAULT_NOTEBOOK_CONFIG,
    ...update,
    contentSources: { ...DEFAULT_NOTEBOOK_CONFIG.contentSources, ...update.contentSources },
    sectionToggles: { ...DEFAULT_NOTEBOOK_CONFIG.sectionToggles, ...update.sectionToggles },
    pageSettings: { ...DEFAULT_NOTEBOOK_CONFIG.pageSettings, ...update.pageSettings }
  };
}

export function normalizeNotebookConfig(input: unknown): NotebookConfig {
  if (!input || typeof input !== "object") return DEFAULT_NOTEBOOK_CONFIG;
  const value = input as Partial<NotebookConfig>;
  return withConfig({
    ...value,
    contentSources: value.contentSources,
    sectionToggles: value.sectionToggles,
    pageSettings: value.pageSettings,
    topics: Array.isArray(value.topics) ? value.topics.filter(Boolean).map(String) : [],
    noteTypes: Array.isArray(value.noteTypes) ? value.noteTypes.filter(Boolean).map(String) : [],
    tags: Array.isArray(value.tags) ? value.tags.filter(Boolean).map(String) : [],
    reviewStatuses: Array.isArray(value.reviewStatuses) ? value.reviewStatuses.filter(Boolean).map(String) : [],
    problemStatuses: Array.isArray(value.problemStatuses) ? value.problemStatuses.filter(Boolean).map(String) : [],
    selectionMode: value.selectionMode === "blacklist" ? "blacklist" : "whitelist",
    sectionSelectionMode: value.sectionSelectionMode === "blacklist" ? "blacklist" : "whitelist",
    noteIds: Array.isArray(value.noteIds) ? value.noteIds.filter(Boolean).map(String) : [],
    excludeNoteIds: Array.isArray(value.excludeNoteIds) ? value.excludeNoteIds.filter(Boolean).map(String) : [],
    excludeTopics: Array.isArray(value.excludeTopics) ? value.excludeTopics.filter(Boolean).map(String) : [],
    excludeNoteTypes: Array.isArray(value.excludeNoteTypes) ? value.excludeNoteTypes.filter(Boolean).map(String) : [],
    excludeTags: Array.isArray(value.excludeTags) ? value.excludeTags.filter(Boolean).map(String) : [],
    excludeReviewStatuses: Array.isArray(value.excludeReviewStatuses) ? value.excludeReviewStatuses.filter(Boolean).map(String) : [],
    excludeProblemStatuses: Array.isArray(value.excludeProblemStatuses) ? value.excludeProblemStatuses.filter(Boolean).map(String) : [],
    excludeDifficultyMin: value.excludeDifficultyMin == null ? null : Math.min(12, Math.max(1, Number(value.excludeDifficultyMin))),
    excludeDifficultyMax: value.excludeDifficultyMax == null ? null : Math.min(12, Math.max(1, Number(value.excludeDifficultyMax))),
    excludeMastered: Boolean(value.excludeMastered),
    difficultyMin: Math.min(12, Math.max(1, Number(value.difficultyMin ?? 1))),
    difficultyMax: Math.min(12, Math.max(1, Number(value.difficultyMax ?? 12)))
  });
}

export function notebookSectionEnabled(
  config: Pick<NotebookConfig, "sectionSelectionMode" | "sectionToggles">,
  key: NotebookSectionToggle
) {
  return config.sectionSelectionMode === "blacklist" ? !config.sectionToggles[key] : config.sectionToggles[key];
}

export function invertNotebookSectionToggles(toggles: NotebookConfig["sectionToggles"]) {
  return NOTEBOOK_SECTION_TOGGLES.reduce(
    (next, toggle) => ({ ...next, [toggle.key]: !toggles[toggle.key] }),
    {} as NotebookConfig["sectionToggles"]
  );
}

export function makeNotebookSectionToggles(value: boolean) {
  return NOTEBOOK_SECTION_TOGGLES.reduce(
    (next, toggle) => ({ ...next, [toggle.key]: value }),
    {} as NotebookConfig["sectionToggles"]
  );
}

export const BUILT_IN_NOTEBOOK_PRESETS: NotebookPresetDefinition[] = [
  {
    name: "All Except Mastered",
    description: "Everything useful, excluding mastered and ignored review items.",
    config: withConfig({
      selectionMode: "blacklist",
      excludeReviewStatuses: ["ignored"],
      excludeMastered: true,
      detailLevel: "Standard Notebook Mode"
    })
  },
  {
    name: "Weak Notes Only",
    description: "Learning and needs-practice notes for focused repair.",
    config: withConfig({
      contentSources: { reviewDueNotes: true },
      reviewStatuses: ["learning", "needs_practice"],
      detailLevel: "Compact Revision Mode",
      layoutStyle: "Minimal Exam Revision"
    })
  },
  {
    name: "Contest Quick Pack",
    description: "Compact contest review with triggers, false uses, and mid-range difficulty.",
    config: withConfig({
      selectionMode: "blacklist",
      excludeReviewStatuses: ["mastered", "ignored"],
      difficultyMin: 4,
      difficultyMax: 9,
      detailLevel: "Compact Revision Mode",
      sectionToggles: { showProofs: false, showRecognitionTriggers: true, showFalseUses: true }
    })
  },
  {
    name: "False Uses Sheet",
    description: "A compact sheet of traps and non-examples.",
    config: withConfig({
      detailLevel: "Compact Revision Mode",
      sectionToggles: {
        showStatements: false,
        showProofs: false,
        showExamples: false,
        showRecognitionTriggers: false,
        showFalseUses: true
      },
      layoutStyle: "Minimal Exam Revision"
    })
  },
  {
    name: "Recognition Trigger Sheet",
    description: "Recognition cues for deciding which technique to try.",
    config: withConfig({
      detailLevel: "Compact Revision Mode",
      sectionToggles: {
        showStatements: false,
        showProofs: false,
        showExamples: false,
        showRecognitionTriggers: true,
        showFalseUses: false
      },
      layoutStyle: "Minimal Exam Revision"
    })
  },
  {
    name: "Geometry Traps Pack",
    description: "Geometry notes with diagrams, triggers, and false uses.",
    config: withConfig({
      topics: ["Geometry"],
      detailLevel: "Compact Revision Mode",
      sectionToggles: { showDiagrams: true, showRecognitionTriggers: true, showFalseUses: true }
    })
  },
  {
    name: "Full Personal Notebook",
    description: "All notes in standard/full detail, grouped by topic.",
    config: withConfig({ detailLevel: "Full Detail Mode", contentSources: { problemLogs: true, mistakeLogs: true } })
  },
  {
    name: "Compact Theorem Sheet",
    description: "Theorems and lemmas with statements only.",
    config: withConfig({
      noteTypes: ["Theorem", "Lemma"],
      detailLevel: "Statement Mode",
      sectionToggles: { showProofs: false, showExamples: false, showDiagrams: false },
      layoutStyle: "Compact Handbook"
    })
  },
  {
    name: "Formula Sheet",
    description: "Formula notes in a compact formula layout.",
    config: withConfig({
      contentSources: { notes: false, formulaBank: true },
      topics: ["Formula Bank"],
      noteTypes: ["Formula", "Formula Log"],
      detailLevel: "Formula Sheet Mode",
      layoutStyle: "Formula Sheet",
      pageSettings: { columns: "two" }
    })
  },
  {
    name: "Geometry Diagram Booklet",
    description: "Geometry notes with diagrams enabled.",
    config: withConfig({ topics: ["Geometry"], sectionToggles: { showDiagrams: true }, layoutStyle: "Clean Notebook" })
  },
  {
    name: "Weak Topics Review",
    description: "Notes marked as learning or needs practice.",
    config: withConfig({
      contentSources: { reviewDueNotes: true },
      reviewStatuses: ["learning", "needs_practice"],
      detailLevel: "Compact Revision Mode",
      layoutStyle: "Minimal Exam Revision"
    })
  },
  {
    name: "Problem Review Booklet",
    description: "Problem logs with key ideas, linked techniques, and mistakes.",
    config: withConfig({
      contentSources: { notes: false, formulaBank: false, problemLogs: true, mistakeLogs: true },
      detailLevel: "Problem Booklet Mode",
      layoutStyle: "Problem Booklet"
    })
  },
  {
    name: "Contest Quick Revision",
    description: "Difficulty 4 to 8 notes in compact revision mode.",
    config: withConfig({
      difficultyMin: 4,
      difficultyMax: 8,
      detailLevel: "Compact Revision Mode",
      sectionToggles: { showProofs: false, showCommonMistakes: true },
      layoutStyle: "Minimal Exam Revision"
    })
  }
];

export const NOTEBOOK_TOPIC_OPTIONS = TOPICS;
export const NOTEBOOK_NOTE_TYPE_OPTIONS = NOTE_TYPES;
export const NOTEBOOK_REVIEW_STATUSES = ["new", "learning", "needs_practice", "comfortable", "mastered", "ignored"];
export const NOTEBOOK_PROBLEM_STATUSES = ["unsolved", "attempted", "solved", "solved_with_hint", "failed", "review_later", "mastered"];
