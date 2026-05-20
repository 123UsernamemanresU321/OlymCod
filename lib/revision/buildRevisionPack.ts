import { topicIncludes } from "@/lib/constants/notes";
import type { MistakeLog, Note, NoteReview, ProblemLog } from "@/lib/types";

export type RevisionTiming = "tomorrow" | "3days" | "1week" | "custom";
export type RevisionStyle = "ultra_compact" | "balanced" | "full_review";

export interface RevisionPackOptions {
  timing: RevisionTiming;
  focusTopics: string[];
  style: RevisionStyle;
  includeWeakNotes: boolean;
  includeNeedsPractice: boolean;
  includeFailedProblems: boolean;
  includeMistakePatterns: boolean;
  includeFalseUses: boolean;
  includeRecognitionTriggers: boolean;
  includeFormulae: boolean;
  includeGeometryDiagrams: boolean;
  includeRecentNotes: boolean;
  includeHighDifficulty: boolean;
  includeRandomOldNotes: boolean;
}

export interface RevisionPackResult {
  selectedNotes: Array<{ note: Note; score: number; reasons: string[] }>;
  selectedProblems: ProblemLog[];
  mistakeSummary: Array<{ label: string; count: number }>;
  suggestedReviewOrder: string[];
}

function hasTopic(note: Note, topics: string[]) {
  if (!topics.length) return true;
  return topics.some((topic) => topicIncludes(note.topic, topic));
}

function linkedToFailedProblem(note: Note, problems: ProblemLog[]) {
  return problems.some((problem) => problem.linked_note_ids.includes(note.id) && problem.status === "failed");
}

function linkedToReviewLaterProblem(note: Note, problems: ProblemLog[]) {
  return problems.some((problem) => problem.linked_note_ids.includes(note.id) && problem.status === "review_later");
}

function recent(note: Note) {
  return Date.now() - new Date(note.updated_at).getTime() <= 21 * 24 * 60 * 60 * 1000;
}

function categoryCounts(problems: ProblemLog[]) {
  const map = new Map<string, number>();
  for (const problem of problems) {
    if (problem.status !== "failed" && problem.status !== "review_later") continue;
    const label = problem.mistake_category ?? "Uncategorized";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export function buildRevisionPack({
  notes,
  reviews,
  problems,
  mistakes,
  options
}: {
  notes: Note[];
  reviews: NoteReview[];
  problems: ProblemLog[];
  mistakes: MistakeLog[];
  options: RevisionPackOptions;
}): RevisionPackResult {
  const reviewMap = new Map(reviews.map((review) => [review.note_id, review]));
  const selectedProblems = problems
    .filter((problem) => options.focusTopics.length === 0 || options.focusTopics.some((topic) => topicIncludes(problem.topic, topic)))
    .filter((problem) => problem.status === "failed" || problem.status === "review_later")
    .slice(0, options.timing === "tomorrow" ? 8 : options.timing === "3days" ? 14 : 24);

  const selectedNotes = notes
    .filter((note) => hasTopic(note, options.focusTopics))
    .map((note) => {
      const review = reviewMap.get(note.id);
      const reasons: string[] = [];
      let score = 0;

      if (review?.review_status === "needs_practice") {
        score += 40;
        reasons.push("needs_practice review status");
      }
      if (review?.review_status === "learning") {
        score += 30;
        reasons.push("learning review status");
      }
      if (linkedToFailedProblem(note, problems)) {
        score += 25;
        reasons.push("linked to failed problem");
      }
      if (linkedToReviewLaterProblem(note, problems)) {
        score += 20;
        reasons.push("linked to review-later problem");
      }
      if (options.includeFalseUses && note.false_uses?.length) {
        score += 15;
        reasons.push("has common false uses");
      }
      if (options.includeRecognitionTriggers && note.recognition_triggers?.length) {
        score += 15;
        reasons.push("has recognition triggers");
      }
      if ((note.difficulty ?? 0) >= 4 && (note.difficulty ?? 0) <= 8) {
        score += 10;
        reasons.push("mid-range concept level");
      }
      if (options.includeRecentNotes && recent(note)) {
        score += 10;
        reasons.push("recently updated");
      }
      if (options.focusTopics.some((topic) => topicIncludes(note.topic, topic))) {
        score += 10;
        reasons.push("selected focus topic");
      }
      if (review?.review_status === "mastered") score -= 25;
      if (review?.review_status === "ignored") score -= 50;
      if (options.timing === "tomorrow" && (note.difficulty ?? 0) <= 2) score -= 15;
      if (options.includeFormulae && (note.note_type === "Formula" || note.note_type === "Formula Log")) score += 12;
      if (options.includeGeometryDiagrams && topicIncludes(note.topic, "Geometry") && note.diagram_urls.length) score += 12;
      if (options.includeHighDifficulty && (note.difficulty ?? 0) >= 8) score += 10;
      if (options.includeWeakNotes && review && ["learning", "needs_practice"].includes(review.review_status)) score += 10;

      return { note, score, reasons };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.note.title.localeCompare(b.note.title))
    .slice(0, options.timing === "tomorrow" ? 18 : options.timing === "3days" ? 30 : 45);

  return {
    selectedNotes,
    selectedProblems,
    mistakeSummary: categoryCounts(problems).slice(0, 6),
    suggestedReviewOrder: [
      "Start with common false uses and recognition triggers.",
      "Review notes linked to failed or review-later problems.",
      "Work through the mistake categories with the highest counts.",
      options.style === "full_review" ? "Finish with full proofs and examples." : "Finish with formulae and compact statements."
    ]
  };
}
