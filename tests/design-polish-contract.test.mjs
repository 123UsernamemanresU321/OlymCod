import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(path, import.meta.url));
}

test("design tokens and shared layout primitives exist", () => {
  const globals = read("../app/globals.css");
  const pagePrimitives = read("../components/ui/Page.tsx");
  const button = read("../components/ui/Button.tsx");
  const field = read("../components/ui/Field.tsx");

  assert.match(globals, /--codex-surface/);
  assert.match(globals, /--codex-radius-control/);
  assert.match(globals, /--codex-shadow-overlay/);
  assert.match(globals, /focus-visible/);
  assert.match(globals, /prefers-reduced-motion/);
  assert.match(pagePrimitives, /PageShell/);
  assert.match(pagePrimitives, /PageHeader/);
  assert.match(pagePrimitives, /FilterDisclosure/);
  assert.match(pagePrimitives, /LoadingSkeleton/);
  assert.match(button, /loadingLabel/);
  assert.match(button, /fullWidth/);
  assert.match(field, /description/);
  assert.match(field, /error/);
});

test("app chrome and metadata are calmer and more complete", () => {
  const layout = read("../app/layout.tsx");
  const shell = read("../components/layout/AppShell.tsx");

  assert.match(layout, /title: \{/);
  assert.match(layout, /template:/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /twitter/);
  assert.match(layout, /icons/);
  assert.match(shell, /PRIMARY_NAV_ITEMS/);
  assert.match(shell, /TOOL_NAV_ITEMS/);
  assert.match(shell, /Tools/);
  assert.match(shell, /details/);
  assert.match(shell, /\/app\/taxonomy/);
  assert.match(shell, /Tags & Topics/);
});

test("major app surfaces use compact disclosures instead of long exposed control walls", () => {
  const dashboard = read("../components/notes/DashboardClient.tsx");
  const notes = read("../components/notes/NotesLibraryClient.tsx");
  const notebookControls = read("../components/notebook/NotebookControls.tsx");
  const noteForm = read("../components/notes/NoteForm.tsx");
  const noteQuality = read("../components/notes/NoteQualityPanel.tsx");

  assert.match(dashboard, /Daily tools/);
  assert.match(dashboard, /More organization tools/);
  assert.match(notes, /Filters and sorting/);
  assert.match(notes, /activeFilterCount/);
  assert.match(notebookControls, /filterQuery/);
  assert.match(notebookControls, /Find filter option/);
  assert.match(notebookControls, /Search sections/);
  assert.match(noteForm, /Split Preview/);
  assert.match(noteForm, /Editor Focus/);
  assert.match(noteForm, /Assistant, links, media, and safety tools/);
  assert.match(noteQuality, /defaultOpen/);
  assert.match(noteQuality, /<details/);
  assert.match(noteQuality, /ChevronDown/);
});

test("public polish adds route states, footer, and avoids obvious vibe-coded red flags", () => {
  for (const path of [
    "../app/loading.tsx",
    "../app/error.tsx",
    "../app/app/loading.tsx",
    "../app/app/error.tsx",
    "../components/public/PublicFooter.tsx",
    "../components/public/PublicNoteReader.tsx",
  ]) {
    assert.ok(exists(path), `${path} should exist`);
  }

  const publicFiles = [
    read("../app/page.tsx"),
    read("../app/login/page.tsx"),
    read("../app/contribute/page.tsx"),
    read("../app/notes/page.tsx"),
    read("../app/notes/[slug]/page.tsx"),
    read("../components/public/PublicNotesClient.tsx"),
    read("../components/public/PublicNoteReader.tsx"),
  ].join("\n");
  const ui = [
    read("../components/notes/AIWritingAssistant.tsx"),
    read("../components/problems/ProblemDetailClient.tsx"),
    read("../components/graph/NoteGraphClient.tsx"),
  ].join("\n");

  assert.match(publicFiles, /PublicFooter/);
  assert.doesNotMatch(publicFiles, /href="#"/);
  assert.doesNotMatch(publicFiles, /testimonial/i);
  assert.doesNotMatch(ui, /Sparkles/);
  assert.doesNotMatch(ui, /✨|🚀|🔥/);
});

test("public note reader is wider and user-customizable", () => {
  const publicNote = read("../app/notes/[slug]/page.tsx");
  const reader = read("../components/public/PublicNoteReader.tsx");
  const globals = read("../app/globals.css");

  assert.match(publicNote, /PublicNoteReader/);
  assert.match(reader, /max-w-\[1480px\]/);
  assert.match(reader, /max-w-\[1760px\]/);
  assert.match(reader, /SegmentedControl/);
  assert.match(reader, /Hide side panel|Show side panel/);
  assert.match(reader, /localStorage/);
  assert.match(reader, /parseMarkdownHeadings/);
  assert.match(globals, /public-note-prose-large/);
});
