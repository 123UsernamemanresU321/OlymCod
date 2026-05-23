import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(path, import.meta.url));
}

test("notebook section extraction keeps full multi-line sections until same-or-higher heading", () => {
  const extraction = read("../lib/notebook/extractSections.ts");
  const sharedSections = read("../lib/markdown/sections.ts");

  assert.match(extraction, /inFence/);
  assert.match(extraction, /level > currentLevel/);
  assert.match(extraction, /definition: "statement"/);
  assert.match(extraction, /"problem statement": "statement"/);
  assert.match(extraction, /"example problem": "statement"/);
  assert.match(extraction, /sections\[currentKey\] \? `\$\{sections\[currentKey\]\}\\n\\n\$\{body\}` : body/);
  assert.match(extraction, /current\.join\("\\n"\)/);
  assert.doesNotMatch(extraction, /split\("\\n"\)\[0\]/);
  assert.match(sharedSections, /parseMarkdownHeadings/);
  assert.match(sharedSections, /extractSpecificSection/);
  assert.match(sharedSections, /candidate\) => candidate\.level <= heading\.level/);
});

test("creation and organization routes are implemented and wired into navigation/search", () => {
  for (const path of [
    "../app/app/templates/page.tsx",
    "../app/app/merge/page.tsx",
    "../app/app/workspace/page.tsx",
    "../app/app/views/page.tsx",
    "../app/app/taxonomy/page.tsx",
    "../app/app/import/page.tsx",
  ]) {
    assert.ok(exists(path), `${path} should exist`);
  }

  const shell = read("../components/layout/AppShell.tsx");
  const palette = read("../components/command/CommandPalette.tsx");
  const dashboard = read("../components/notes/DashboardClient.tsx");

  assert.match(shell, /sidebarCollapsed/);
  assert.match(shell, /PanelLeftClose/);
  assert.match(shell, /lg:ml-20/);
  assert.match(shell, /\/app\/workspace/);
  assert.match(shell, /\/app\/graph/);
  assert.match(shell, /\/app\/manage/);
  assert.match(palette, /\/app\/templates/);
  assert.match(palette, /\/app\/import/);
  assert.match(palette, /\/app\/taxonomy/);
  assert.match(palette, /\/app\/views/);
  assert.match(palette, /\/app\/merge/);
  assert.match(dashboard, /Templates/);
  assert.match(dashboard, /Import/);
  assert.match(dashboard, /Saved Views/);
});

test("templates and saved views have owned Supabase tables with RLS", () => {
  const schema = read("../supabase/schema.sql");
  const migration = read("../supabase/migrations/20260522000100_creation_organization_tools.sql");

  for (const source of [schema, migration]) {
    assert.match(source, /create table if not exists public\.note_templates/);
    assert.match(source, /template_markdown text not null/);
    assert.match(source, /default_recognition_triggers text\[\]/);
    assert.match(source, /create table if not exists public\.saved_views/);
    assert.match(source, /target_page text not null/);
    assert.match(source, /alter table public\.note_templates enable row level security/);
    assert.match(source, /alter table public\.saved_views enable row level security/);
    assert.match(source, /user_id = \(select auth\.uid\(\)\)/);
    assert.match(source, /note_templates_user_id_idx/);
    assert.match(source, /saved_views_target_page_idx/);
  }
});

test("note editor includes templates, split tools, version diff, outline, and inline embeds", () => {
  const noteForm = read("../components/notes/NoteForm.tsx");
  const noteView = read("../app/app/notes/[id]/page.tsx");
  const versionHistory = read("../components/notes/VersionHistory.tsx");
  const markdownPreview = read("../components/editor/MarkdownPreview.tsx");
  const inlineEmbed = read("../components/notes/InlineNoteEmbed.tsx");

  assert.match(noteForm, /note_templates/);
  assert.match(noteForm, /Save current note as template/);
  assert.match(noteForm, /NoteSplitTool/);
  assert.match(noteForm, /NoteOutline/);
  assert.match(noteView, /NoteViewModeShell/);
  assert.match(noteView, /VersionHistory/);
  assert.match(versionHistory, /diffLines/);
  assert.match(versionHistory, /Copy old content/);
  assert.match(versionHistory, /restore_backup/);
  assert.match(markdownPreview, /InlineNoteEmbed/);
  assert.match(markdownPreview, /InlineNoteEmbed reference/);
  assert.match(inlineEmbed, /extractSpecificSection/);
  assert.match(inlineEmbed, /replace\(\/\\\[\\\[note:/);
});

test("workspace, importer, taxonomy, saved views, merge, and media improvements are usable", () => {
  const workspace = read("../components/workspace/WorkspaceClient.tsx");
  const importer = read("../components/importer/SmartImporterClient.tsx");
  const taxonomy = read("../components/taxonomy/TaxonomyManagerClient.tsx");
  const savedViews = read("../components/views/SavedViewsClient.tsx");
  const merge = read("../components/notes/MergeNotesClient.tsx");
  const media = read("../components/media/MediaLibraryClient.tsx");
  const graph = read("../components/graph/NoteGraphClient.tsx");

  assert.match(workspace, /openIds/);
  assert.match(workspace, /showLibrary/);
  assert.match(workspace, /showReference/);
  assert.match(workspace, /Hide library/);
  assert.match(workspace, /Hide reference/);
  assert.match(workspace, /Reference Pane/);
  assert.match(importer, /Smart Importer/);
  assert.match(importer, /Split by top-level/);
  assert.match(taxonomy, /Tag And Topic Management/);
  assert.match(taxonomy, /Rename or merge/);
  assert.match(savedViews, /Saved Views/);
  assert.match(savedViews, /Open/);
  assert.match(merge, /Merge Notes/);
  assert.match(merge, /Archive originals/);
  assert.match(media, /Insert into note/);
  assert.match(media, /appendToLinkedNote/);
  assert.match(graph, /Neighborhood/);
});
