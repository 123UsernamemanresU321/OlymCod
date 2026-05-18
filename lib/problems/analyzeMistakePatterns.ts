import type { Note, ProblemLog } from "@/lib/types";

export interface MistakePatternSummary {
  topCategories: Array<{ label: string; count: number }>;
  weakestTopics: Array<{ label: string; count: number }>;
  failedLinkedNotes: Array<{ note: Note; count: number }>;
  recognitionFailures: number;
  forgottenConditions: number;
}

function inRange(problem: ProblemLog, range: "7d" | "30d" | "all") {
  if (range === "all") return true;
  const days = range === "7d" ? 7 : 30;
  return Date.now() - new Date(problem.updated_at).getTime() <= days * 24 * 60 * 60 * 1000;
}

function countBy(values: Array<string | null | undefined>) {
  const map = new Map<string, number>();
  for (const value of values) {
    const label = value?.trim() || "Uncategorized";
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function analyzeMistakePatterns(
  problems: ProblemLog[],
  notes: Note[] = [],
  range: "7d" | "30d" | "all" = "30d"
): MistakePatternSummary {
  const relevant = problems.filter((problem) => inRange(problem, range));
  const weak = relevant.filter((problem) => problem.status === "failed" || problem.status === "review_later");
  const noteMap = new Map(notes.map((note) => [note.id, note]));
  const linkedCounts = new Map<string, number>();

  for (const problem of weak) {
    for (const id of problem.linked_note_ids) {
      linkedCounts.set(id, (linkedCounts.get(id) ?? 0) + 1);
    }
  }

  return {
    topCategories: countBy(weak.map((problem) => problem.mistake_category)).slice(0, 5),
    weakestTopics: countBy(weak.map((problem) => problem.topic)).slice(0, 5),
    failedLinkedNotes: [...linkedCounts.entries()]
      .flatMap(([id, count]) => {
        const note = noteMap.get(id);
        return note ? [{ note, count }] : [];
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    recognitionFailures: weak.filter((problem) => problem.mistake_category === "Knew theorem but did not recognize it").length,
    forgottenConditions: weak.filter((problem) => problem.mistake_category === "Forgot condition").length
  };
}
