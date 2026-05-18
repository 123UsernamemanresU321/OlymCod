import type {
  Diagram,
  MistakeLog,
  Note,
  NoteLink,
  NoteReview,
  ProblemLog,
  QuickCapture
} from "@/lib/types";

export type NotebookContentSource =
  | "notes"
  | "formulaBank"
  | "problemLogs"
  | "mistakeLogs"
  | "quickCaptures"
  | "diagrams"
  | "reviewDueNotes";

export type NotebookDetailLevel =
  | "Index Mode"
  | "Statement Mode"
  | "Compact Revision Mode"
  | "Standard Notebook Mode"
  | "Full Detail Mode"
  | "Formula Sheet Mode"
  | "Problem Booklet Mode";

export type NotebookLayoutStyle =
  | "Clean Notebook"
  | "Compact Handbook"
  | "Formula Sheet"
  | "Problem Booklet"
  | "Print Friendly"
  | "Minimal Exam Revision";

export type NotebookSortOrder =
  | "Topic then type"
  | "Topic then difficulty"
  | "Recently updated"
  | "Alphabetical"
  | "Difficulty ascending"
  | "Difficulty descending"
  | "Review priority";

export type NotebookSelectionMode = "whitelist" | "blacklist";

export type NotebookSectionToggle =
  | "showMetadata"
  | "showTags"
  | "showDifficulty"
  | "showDescriptions"
  | "showStatements"
  | "showProofs"
  | "showExamples"
  | "showCommonMistakes"
  | "showRecognitionTriggers"
  | "showFalseUses"
  | "showRelatedNotes"
  | "showBacklinks"
  | "showLinkedProblems"
  | "showLinkedMistakes"
  | "showDiagrams"
  | "showProblemStatements"
  | "showSolutionSummaries"
  | "showSourceReferences"
  | "showDates"
  | "showReviewStatus"
  | "pageBreakBetweenTopics"
  | "showTableOfContents";

export interface NotebookPageSettings {
  pageSize: "A4" | "Letter";
  margins: "compact" | "normal" | "wide";
  fontSize: "small" | "normal" | "large";
  columns: "one" | "two";
  includeCoverPage: boolean;
  includeTableOfContents: boolean;
  startEachTopicOnNewPage: boolean;
}

export interface NotebookConfig {
  contentSources: Record<NotebookContentSource, boolean>;
  selectionMode: NotebookSelectionMode;
  noteIds: string[];
  topics: string[];
  noteTypes: string[];
  difficultyMin: number;
  difficultyMax: number;
  tags: string[];
  reviewStatuses: string[];
  problemStatuses: string[];
  excludeNoteIds: string[];
  excludeTopics: string[];
  excludeNoteTypes: string[];
  excludeDifficultyMin: number | null;
  excludeDifficultyMax: number | null;
  excludeTags: string[];
  excludeReviewStatuses: string[];
  excludeProblemStatuses: string[];
  excludeMastered: boolean;
  detailLevel: NotebookDetailLevel;
  sectionToggles: Record<NotebookSectionToggle, boolean>;
  layoutStyle: NotebookLayoutStyle;
  sortOrder: NotebookSortOrder;
  pageSettings: NotebookPageSettings;
  coverTitle: string;
  coverSummary: string;
}

export type NotebookSourceType = "note" | "problem" | "mistake" | "capture" | "diagram";

export type NotebookSectionKey =
  | "statement"
  | "formula"
  | "core_idea"
  | "key_relation"
  | "configuration"
  | "when_to_use"
  | "signs"
  | "intuition"
  | "proof"
  | "derivation"
  | "example"
  | "common_mistakes"
  | "related"
  | "problems"
  | "conditions"
  | "source"
  | "solution"
  | "key_idea"
  | "mistake"
  | "correct_principle"
  | "how_to_recognize"
  | "traps"
  | "diagram"
  | "why_it_happens"
  | "how_to_avoid"
  | "first_paragraph"
  | "full";

export interface NotebookItem {
  id: string;
  sourceType: NotebookSourceType;
  title: string;
  topic?: string | null;
  noteType?: string | null;
  difficulty?: number | null;
  tags: string[];
  description?: string | null;
  bodyMarkdown?: string | null;
  recognitionTriggers: string[];
  falseUses: string[];
  extractedSections: Partial<Record<NotebookSectionKey, string>>;
  diagrams: string[];
  linkedNotes: Array<{ id: string; title: string; relation?: string | null }>;
  linkedProblems: Array<{ id: string; title: string; status?: string | null }>;
  linkedMistakes: Array<{ id: string; title: string; mistakeType?: string | null }>;
  reviewStatus?: string | null;
  problemStatus?: string | null;
  sourceReference?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface NotebookRawData {
  notes: Note[];
  problems: ProblemLog[];
  mistakes: MistakeLog[];
  captures: QuickCapture[];
  noteLinks: NoteLink[];
  reviews: NoteReview[];
  diagrams: Diagram[];
}

export interface NotebookBuildResult {
  config: NotebookConfig;
  items: NotebookItem[];
  previewItems: NotebookItem[];
  itemCount: number;
  warning?: string;
}

export interface NotebookPresetDefinition {
  name: string;
  description: string;
  config: NotebookConfig;
}

export interface NotebookEntrySection {
  label: string;
  markdown: string;
}
