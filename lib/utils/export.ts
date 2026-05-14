import type { Note, Suggestion } from "@/lib/types";

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportNotesAsJson(notes: Note[]) {
  const payload = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      app: "Olympiad Codex",
      notes
    },
    null,
    2
  );
  downloadFile("olympiad-codex-notes.json", payload, "application/json");
}

export function exportNotesAsMarkdown(notes: Note[]) {
  const markdown = notes
    .map((note) => {
      const frontmatter = [
        "---",
        `title: ${JSON.stringify(note.title)}`,
        `slug: ${JSON.stringify(note.slug)}`,
        `topic: ${JSON.stringify(note.topic)}`,
        `note_type: ${JSON.stringify(note.note_type)}`,
        `visibility: ${JSON.stringify(note.visibility)}`,
        `difficulty: ${note.difficulty ?? ""}`,
        `tags: ${JSON.stringify(note.tags)}`,
        `favorite: ${note.is_favorite}`,
        `updated_at: ${JSON.stringify(note.updated_at)}`,
        "---"
      ].join("\n");

      return `${frontmatter}\n\n${note.body_markdown.trim()}\n`;
    })
    .join("\n\n---\n\n");

  downloadFile("olympiad-codex-notes.md", markdown, "text/markdown");
}

export function exportSuggestionsAsJson(suggestions: Suggestion[]) {
  const payload = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      app: "Olympiad Codex",
      suggestions
    },
    null,
    2
  );
  downloadFile("olympiad-codex-suggestions.json", payload, "application/json");
}
