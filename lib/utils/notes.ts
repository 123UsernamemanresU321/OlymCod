import type { Note, SortKey } from "@/lib/types";

export function matchesNoteSearch(note: Note, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    note.title,
    note.slug,
    note.description ?? "",
    note.body_markdown,
    note.topic,
    note.note_type,
    ...note.tags
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export function sortNotes(notes: Note[], sort: SortKey) {
  return [...notes].sort((a, b) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "topic") return a.topic.localeCompare(b.topic) || a.title.localeCompare(b.title);
    if (sort === "difficulty") return (b.difficulty ?? 0) - (a.difficulty ?? 0);
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
}

export function formatUpdatedAt(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "Today";
  if (diff < day * 2) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric"
  });
}

export function noteUrl(note: Pick<Note, "id">) {
  return `/app/notes/${note.id}`;
}
