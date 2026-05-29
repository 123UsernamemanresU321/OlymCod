import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(path, import.meta.url));
}

test("Part 3 extension renders learning metadata through the safe math pipeline", () => {
  const list = read("../components/notes/LearningMetadataList.tsx");
  const noteView = read("../app/app/notes/[id]/page.tsx");
  const noteForm = read("../components/notes/NoteForm.tsx");
  const revision = read("../components/revision/RevisionPackClient.tsx");
  const renderer = read("../lib/notebook/renderNotebookMarkdown.ts");

  assert.match(list, /MarkdownPreview/);
  assert.match(list, /codex-metadata-markdown/);
  assert.match(noteView, /LearningMetadataList/);
  assert.match(noteForm, /LearningMetadataList/);
  assert.match(revision, /LearningMetadataList/);
  assert.match(renderer, /Recognition Triggers/);
  assert.match(renderer, /Common False Uses/);
});

test("type-specific Note Quality counts false uses and recognition metadata", () => {
  const quality = read("../lib/note-quality/getCriteriaForNoteType.ts");
  const panel = read("../components/notes/NoteQualityPanel.tsx");

  assert.match(quality, /getCriteriaForNoteType/);
  assert.match(quality, /Common mistakes covered through Common False Uses metadata/);
  assert.match(quality, /Recognition covered through Recognition Triggers metadata/);
  assert.match(quality, /linkedNoteCount/);
  assert.match(quality, /Related Notes completed through/);
  assert.match(quality, /descriptionImportance/);
  assert.match(quality, /type === "Theorem" \|\| type === "Lemma"/);
  assert.match(quality, /type === "Formula" \|\| type === "Formula Log"/);
  assert.match(quality, /type === "Definition"/);
  assert.match(quality, /type === "Problem Pattern"/);
  assert.match(quality, /type === "Common Mistake"/);
  assert.match(quality, /type === "Inbox"/);
  assert.match(panel, /Type-specific checklist/);
});

test("notes use Concept Level while problems use Problem Difficulty", () => {
  const constants = read("../lib/constants/notes.ts");
  const formats = read("../lib/constants/note-formats.ts");
  const badge = read("../components/ui/Badge.tsx");
  const noteForm = read("../components/notes/NoteForm.tsx");
  const problemForm = read("../components/problems/ProblemForm.tsx");
  const notebookMarkdown = read("../lib/notebook/renderNotebookMarkdown.ts");
  const mastery = read("../components/mastery/MasteryClient.tsx");

  assert.match(constants, /CONCEPT_LEVEL_LABELS/);
  assert.match(constants, /PROBLEM_DIFFICULTY_LABELS/);
  assert.match(formats, /noteTypeDifficultyMeta/);
  assert.match(formats, /difficultyLabel/);
  assert.match(formats, /Recognition Difficulty/);
  assert.match(formats, /Execution Difficulty/);
  assert.match(formats, /Trap Severity/);
  assert.match(formats, /Problem Difficulty/);
  assert.match(formats, /learningFields/);
  assert.match(badge, /kind = "concept"/);
  assert.match(noteForm, /difficultyMeta\.label/);
  assert.match(noteForm, /noteTypeLearningFields/);
  assert.match(problemForm, /Problem Difficulty/);
  assert.match(notebookMarkdown, /noteTypeDifficultyMeta/);
  assert.match(notebookMarkdown, /Problem Difficulty/);
  assert.match(mastery, /Avg Note Level/);
  assert.match(mastery, /Avg Problem Difficulty/);
});

test("related-note AI is structured and cannot rewrite the note body", () => {
  const route = read("../app/api/ai/note-assist/route.ts");
  const manager = read("../components/notes/LinkedNotesManager.tsx");
  const assistant = read("../components/notes/AIWritingAssistant.tsx");

  assert.match(route, /link_suggestions/);
  assert.match(route, /possible_new_notes/);
  assert.match(route, /markdown: parsed\.data\.mode === "suggest_related_notes" \? "" : output\.markdown/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(manager, /Add selected links/);
  assert.match(manager, /Possible new notes/);
  assert.match(assistant, /Structured link suggestions/);
  assert.match(assistant, /never modifies `body_markdown`|Linked Notes panel/);
});

test("creation and organization routes are present without extra graph dependencies", () => {
  assert.ok(exists("../app/app/graph/page.tsx"));
  assert.ok(exists("../app/app/manage/page.tsx"));
  assert.ok(exists("../app/app/media/page.tsx"));
  assert.ok(exists("../components/graph/NoteGraphClient.tsx"));
  assert.ok(exists("../components/manage/BulkMetadataManager.tsx"));
  assert.ok(exists("../components/media/MediaLibraryClient.tsx"));
  assert.ok(exists("../components/editor/SectionEditor.tsx"));

  const toolbar = read("../components/editor/EditorToolbar.tsx");
  const sectionEditor = read("../components/editor/SectionEditor.tsx");
  const graph = read("../components/graph/NoteGraphClient.tsx");
  const manage = read("../components/manage/BulkMetadataManager.tsx");
  const media = read("../components/media/MediaLibraryClient.tsx");

  assert.match(toolbar, /Snippets/);
  assert.match(toolbar, /event\.key\.toLowerCase\(\) === "m"/);
  assert.match(sectionEditor, /Section Editor/);
  assert.match(sectionEditor, /Move up/);
  assert.match(graph, /<canvas/);
  assert.match(graph, /getContext\("2d"\)/);
  assert.doesNotMatch(graph, /reactflow|d3/i);
  assert.match(manage, /Bulk Metadata Manager/);
  assert.match(manage, /DELETE/);
  assert.match(media, /Media Library/);
  assert.match(media, /image\/webp/);
});

test("media migration and docs cover the Part 3 extension", () => {
  const migration = read("../supabase/migrations/20260520000100_part3_extensions.sql");
  const schema = read("../supabase/schema.sql");
  const readme = read("../README.md");

  for (const source of [migration, schema]) {
    assert.match(source, /title text/);
    assert.match(source, /alt_text text/);
    assert.match(source, /tags text\[\]/);
  }
  assert.match(migration, /diagrams_tags_gin_idx/);
  assert.match(readme, /Math Snippet Palette/);
  assert.match(readme, /Structured Section Editor/);
  assert.match(readme, /Visual Note Graph/);
  assert.match(readme, /Bulk Metadata Manager/);
  assert.match(readme, /Media Library/);
  assert.match(readme, /Type-Specific Note Levels vs Problem Difficulty/);
  assert.match(readme, /structured `link_suggestions`/);
});
