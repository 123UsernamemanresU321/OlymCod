import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("notebook builder route, navigation, and components are present", () => {
  const route = read("../app/app/notebook/page.tsx");
  const printRoute = read("../app/app/notebook/print/page.tsx");
  const shell = read("../components/layout/AppShell.tsx");
  const builder = read("../components/notebook/NotebookBuilder.tsx");
  const controls = read("../components/notebook/NotebookControls.tsx");
  const preview = read("../components/notebook/NotebookPreview.tsx");
  const exports = read("../components/notebook/NotebookExportButtons.tsx");
  const presets = read("../components/notebook/NotebookPresetDialog.tsx");
  const printDocument = read("../components/notebook/print/NotebookPrintDocument.tsx");
  const printCover = read("../components/notebook/print/NotebookPrintCover.tsx");
  const printToc = read("../components/notebook/print/NotebookPrintTOC.tsx");
  const printEntry = read("../components/notebook/print/NotebookPrintEntry.tsx");

  assert.match(route, /NotebookBuilder/);
  assert.match(printRoute, /NotebookPrintRouteClient/);
  assert.match(printDocument, /print-document/);
  assert.match(printCover, /print-cover/);
  assert.match(printToc, /print-toc/);
  assert.match(printEntry, /print-entry/);
  assert.match(printEntry, /print-metadata/);
  assert.match(shell, /\/app\/notebook/);
  assert.match(builder, /Build|Preview|Export/);
  assert.match(controls, /Content Sources/);
  assert.match(controls, /Detail Level/);
  assert.match(preview, /MarkdownPreview/);
  assert.match(exports, /Print \/ Save as PDF/);
  assert.match(presets, /Save Preset/);
});

test("notebook presets table has RLS and indexes", () => {
  const schema = read("../supabase/schema.sql");
  const migration = read("../supabase/migrations/20260517000100_notebook_presets.sql");

  for (const source of [schema, migration]) {
    assert.match(source, /create table if not exists public\.notebook_presets/);
    assert.match(source, /config jsonb not null default '\{\}'/);
    assert.match(source, /alter table public\.notebook_presets enable row level security/);
    assert.match(source, /user_id = \(select auth\.uid\(\)\)/);
    assert.match(source, /notebook_presets_user_id_idx/);
    assert.match(source, /notebook_presets_is_default_idx/);
  }
});

test("notebook utilities normalize items and render exports", () => {
  const types = read("../lib/notebook/types.ts");
  const defaults = read("../lib/notebook/defaultNotebookConfig.ts");
  const extraction = read("../lib/notebook/extractSections.ts");
  const build = read("../lib/notebook/buildNotebookItems.ts");
  const sort = read("../lib/notebook/sortNotebookItems.ts");
  const markdown = read("../lib/notebook/renderNotebookMarkdown.ts");
  const json = read("../lib/notebook/exportJson.ts");

  assert.match(types, /NotebookConfig/);
  assert.match(types, /NotebookItem/);
  assert.match(types, /Index Mode/);
  assert.match(defaults, /Full Personal Notebook/);
  assert.match(defaults, /Formula Sheet/);
  assert.match(extraction, /extractNotebookSections/);
  assert.match(extraction, /Statement|Core idea|When to use it|Common mistakes/);
  assert.match(build, /buildNotebookItems/);
  assert.match(build, /sourceType: "problem"/);
  assert.match(build, /sourceType: "mistake"/);
  assert.match(sort, /sortNotebookItems/);
  assert.match(markdown, /renderNotebookMarkdown/);
  assert.match(json, /exportNotebookJson/);
});

test("notebook export APIs are protected and scope data to current user", () => {
  for (const path of [
    "../app/api/export/notebook/route.ts",
    "../app/api/export/notebook/markdown/route.ts",
    "../app/api/export/notebook/json/route.ts"
  ]) {
    const route = read(path);
    assert.match(route, /getCurrentUserProfile/);
    assert.match(route, /user_id/);
    assert.match(route, /user\.id/);
  }
});

test("notebook AI helper is owner-only and keeps DeepSeek key server-side", () => {
  const route = read("../app/api/ai/notebook-assist/route.ts");

  assert.match(route, /getCurrentUserProfile/);
  assert.match(route, /profile\?\.role !== "owner"/);
  assert.match(route, /DEEPSEEK_API_KEY/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_DEEPSEEK/);
  assert.match(route, /suggest_preset/);
  assert.match(route, /missing_sections/);
  assert.match(route, /cover_summary/);
});

test("notebook print styles hide controls and preserve notebook content", () => {
  const css = read("../app/globals.css");

  assert.match(css, /@media print/);
  assert.match(css, /@page\s*\{[\s\S]*size: A4/);
  assert.match(css, /margin: 14mm 13mm 16mm 13mm/);
  assert.match(css, /\.print-document/);
  assert.match(css, /\.print-topic/);
  assert.match(css, /\.print-metadata/);
  assert.match(css, /break-inside: avoid-page/);
  assert.match(css, /notebook-print-hidden/);
  assert.match(css, /notebook-page-break/);
  assert.match(css, /notebook-entry/);
});
