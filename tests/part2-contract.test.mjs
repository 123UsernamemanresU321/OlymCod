import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("Part 2 database tables and RLS policies are present", () => {
  const schema = read("../supabase/schema.sql");
  const migration = read("../supabase/migrations/20260514_part2_daily_use.sql");
  for (const table of [
    "quick_captures",
    "problem_logs",
    "mistake_logs",
    "note_links",
    "note_reviews",
    "diagrams",
    "note_versions"
  ]) {
    assert.match(schema, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
});

test("daily-use routes are implemented", () => {
  for (const path of [
    "../app/app/capture/page.tsx",
    "../app/app/problems/page.tsx",
    "../app/app/problems/[id]/page.tsx",
    "../app/app/mistakes/page.tsx",
    "../app/app/review-notes/page.tsx",
    "../app/app/diagrams/page.tsx"
  ]) {
    assert.ok(read(path).length > 100, `${path} should be implemented`);
  }
});

test("editor supports comma tags and LaTeX command palette", () => {
  const noteForm = read("../components/notes/NoteForm.tsx");
  const toolbar = read("../components/editor/EditorToolbar.tsx");
  assert.match(noteForm, /tagsText/);
  assert.match(noteForm, /setTagsText/);
  assert.match(toolbar, /LaTeX commands/);
  assert.match(toolbar, /\\\\frac/);
  assert.match(toolbar, /\\\\begin\{aligned\}/);
});

test("front page and app shell expose login, command palette, and quick capture", () => {
  const home = read("../app/page.tsx");
  const shell = read("../components/layout/AppShell.tsx");
  assert.match(home, /href="\/login"/);
  assert.match(shell, /CommandPalette/);
  assert.match(shell, /QuickCapture/);
  assert.match(shell, /Capture/);
  assert.match(shell, /Problems/);
  assert.match(shell, /Mistakes/);
  assert.match(shell, /Review/);
  assert.match(shell, /Diagrams/);
});

test("note links are reciprocal and command palette overlays above app chrome", () => {
  const daily = read("../lib/constants/daily.ts");
  const linkedNotes = read("../components/notes/LinkedNotesManager.tsx");
  const noteView = read("../app/app/notes/[id]/page.tsx");
  const commandPalette = read("../components/command/CommandPalette.tsx");
  const schema = read("../supabase/schema.sql");
  const reciprocalMigration = read("../supabase/migrations/20260515_reciprocal_note_links.sql");

  assert.match(daily, /inverseNoteLinkRelation/);
  assert.match(daily, /generalization.*special case/s);
  assert.match(daily, /special case.*generalization/s);
  assert.match(linkedNotes, /inverseNoteLinkRelation/);
  assert.match(schema, /ensure_reciprocal_note_link/);
  assert.match(schema, /delete_reciprocal_note_link/);
  assert.match(schema, /public\.inverse_note_link_relation\(relation_type\)/);
  assert.match(reciprocalMigration, /note_links_insert_reciprocal/);
  assert.match(reciprocalMigration, /on conflict \(user_id, source_note_id, target_note_id, relation_type\) do nothing/);
  assert.match(noteView, /currentRelation: inverseNoteLinkRelation/);
  assert.match(noteView, /explicitlyRelatedNoteIds/);
  assert.match(noteView, /!explicitlyRelatedNoteIds\.has\(row\.note\.id\)/);
  assert.match(commandPalette, /createPortal/);
  assert.match(commandPalette, /z-\[1000\]/);
});

test("AI related-note prompt uses current-note directional semantics", () => {
  const route = read("../app/api/ai/note-assist/route.ts");
  assert.match(route, /current note Euler Phi Theorem -> candidate Fermat's Little Theorem = 'special case'/);
  assert.match(route, /current note Fermat's Little Theorem -> candidate Euler Phi Theorem = 'generalization'/);
  assert.match(route, /relation_type is always from the current note to the candidate note/);
});

test("topics support compact multi-topic combinations", () => {
  const notesConstants = read("../lib/constants/notes.ts");
  const topicSelector = read("../components/notes/TopicSelector.tsx");
  const noteForm = read("../components/notes/NoteForm.tsx");
  const notesLibrary = read("../components/notes/NotesLibraryClient.tsx");
  const schema = read("../supabase/schema.sql");
  const migration = read("../supabase/migrations/20260515000200_topic_combinations.sql");

  assert.match(notesConstants, /MATH_TOPICS/);
  assert.match(notesConstants, /buildTopicValue/);
  assert.match(notesConstants, /topicIncludes/);
  assert.match(topicSelector, /TopicSelector/);
  assert.match(topicSelector, /selected:|Selected:/i);
  assert.match(noteForm, /<TopicSelector/);
  assert.match(notesLibrary, /topicIncludes/);
  assert.match(schema, /Number Theory\|Combinatorics\|Algebra\|Geometry\|Inequalities/);
  assert.match(migration, /drop constraint notes_topic_check/);
});

test("markdown preview normalizes DeepSeek math delimiters", () => {
  const rendering = read("../lib/markdown/rendering.ts");
  const preview = read("../components/editor/MarkdownPreview.tsx");
  assert.match(rendering, /normalizeMathDelimiters/);
  assert.match(rendering, /\\\\\\\(/);
  assert.match(rendering, /\\\\\\\[/);
  assert.match(preview, /normalizeMathDelimiters/);
});

test("diagram uploads can be inserted into markdown with stable private preview URLs", () => {
  const diagramUtils = read("../lib/utils/diagrams.ts");
  const renderRoute = read("../app/api/diagrams/render/route.ts");
  const upload = read("../components/diagrams/DiagramUpload.tsx");
  const noteForm = read("../components/notes/NoteForm.tsx");
  const preview = read("../components/editor/MarkdownPreview.tsx");

  assert.match(diagramUtils, /diagramMarkdownImage/);
  assert.match(diagramUtils, /\/api\/diagrams\/render\?path=/);
  assert.match(renderRoute, /createSignedUrl/);
  assert.match(renderRoute, /contains\("diagram_urls", \[path\]\)/);
  assert.match(upload, /onInsertMarkdown/);
  assert.match(upload, /Insert in Markdown/);
  assert.match(noteForm, /insertDiagramMarkdown/);
  assert.match(preview, /normalizeDiagramImageUrl/);
});
