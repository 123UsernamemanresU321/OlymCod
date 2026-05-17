import type { NotebookConfig, NotebookItem } from "@/lib/notebook/types";

function rankReview(status?: string | null) {
  const ranks: Record<string, number> = {
    needs_practice: 0,
    learning: 1,
    new: 2,
    comfortable: 3,
    mastered: 4,
    ignored: 5
  };
  return status ? ranks[status] ?? 9 : 9;
}

export function sortNotebookItems(items: NotebookItem[], sortOrder: NotebookConfig["sortOrder"]) {
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortOrder === "Recently updated") {
      return +new Date(b.updatedAt ?? 0) - +new Date(a.updatedAt ?? 0);
    }
    if (sortOrder === "Alphabetical") {
      return a.title.localeCompare(b.title);
    }
    if (sortOrder === "Difficulty ascending") {
      return (a.difficulty ?? 99) - (b.difficulty ?? 99) || a.title.localeCompare(b.title);
    }
    if (sortOrder === "Difficulty descending") {
      return (b.difficulty ?? -1) - (a.difficulty ?? -1) || a.title.localeCompare(b.title);
    }
    if (sortOrder === "Review priority") {
      return rankReview(a.reviewStatus) - rankReview(b.reviewStatus) || a.title.localeCompare(b.title);
    }
    if (sortOrder === "Topic then difficulty") {
      return (
        (a.topic ?? "Unsorted").localeCompare(b.topic ?? "Unsorted") ||
        (a.difficulty ?? 99) - (b.difficulty ?? 99) ||
        a.title.localeCompare(b.title)
      );
    }
    return (
      (a.topic ?? "Unsorted").localeCompare(b.topic ?? "Unsorted") ||
      (a.noteType ?? a.sourceType).localeCompare(b.noteType ?? b.sourceType) ||
      a.title.localeCompare(b.title)
    );
  });
  return sorted;
}
