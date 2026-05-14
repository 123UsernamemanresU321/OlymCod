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
