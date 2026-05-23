import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

function exists(path) {
  return existsSync(new URL(path, import.meta.url));
}

test("Part 3 schema and migrations add learning fields, problem fields, and revision packs", () => {
  const schema = read("../supabase/schema.sql");
  const migration = read("../supabase/migrations/20260518000100_part3_learning_system.sql");

  for (const source of [schema, migration]) {
    assert.match(source, /recognition_triggers text\[\]/);
    assert.match(source, /false_uses text\[\]/);
    assert.match(source, /mistake_category text/);
    assert.match(source, /create table if not exists public\.revision_packs/);
    assert.match(source, /alter table public\.revision_packs enable row level security/);
    assert.match(source, /revision_packs_user_id_idx/);
    assert.match(source, /notes_recognition_triggers_gin_idx/);
    assert.match(source, /notes_false_uses_gin_idx/);
    assert.match(source, /drop trigger if exists note_links_insert_reciprocal/);
    assert.match(source, /drop trigger if exists note_links_delete_reciprocal/);
  }
});

test("directional note relations are normalized without duplicate prerequisite/backlink groups", () => {
  const normalizer = read("../lib/notes/normalizeNoteRelations.ts");
  const linkedNotes = read("../components/notes/LinkedNotesManager.tsx");
  const noteView = read("../app/app/notes/[id]/page.tsx");

  assert.match(normalizer, /normalizeNoteRelations/);
  assert.match(normalizer, /Prerequisites/);
  assert.match(normalizer, /Used By/);
  assert.match(normalizer, /priority/);
  assert.match(normalizer, /incomingRelationDisplay/);
  assert.match(linkedNotes, /Add prerequisite for this note/);
  assert.match(linkedNotes, /noteSearch/);
  assert.match(linkedNotes, /availableNotes/);
  assert.match(linkedNotes, /Search notes by title, topic, type, or tag/);
  assert.doesNotMatch(linkedNotes, /upsert\(/);
  assert.match(noteView, /normalizeNoteRelations/);
  assert.match(noteView, /relationGroups/);
  assert.match(noteView, /Used By/);
});

test("notes expose recognition triggers and common false uses across editor, view, AI, and search", () => {
  const types = read("../lib/types.ts");
  const noteForm = read("../components/notes/NoteForm.tsx");
  const noteView = read("../app/app/notes/[id]/page.tsx");
  const aiClient = read("../components/notes/AIWritingAssistant.tsx");
  const aiRoute = read("../app/api/ai/note-assist/route.ts");
  const search = read("../lib/utils/notes.ts");
  const commandPalette = read("../components/command/CommandPalette.tsx");

  assert.match(types, /recognition_triggers/);
  assert.match(types, /false_uses/);
  assert.match(noteForm, /Recognition Triggers/);
  assert.match(noteForm, /Common False Uses/);
  assert.match(noteView, /Recognition Triggers/);
  assert.match(noteView, /Common False Uses/);
  assert.match(aiClient, /suggest_recognition_triggers/);
  assert.match(aiClient, /suggest_false_uses/);
  assert.match(aiRoute, /recognition_triggers/);
  assert.match(aiRoute, /false_uses/);
  assert.match(search, /recognition_triggers/);
  assert.match(commandPalette, /false_uses/);
});

test("problem log and mistake pattern detector support Part 3 fields and routes", () => {
  assert.ok(exists("../app/app/problems/new/page.tsx"));
  assert.ok(exists("../app/app/problems/[id]/edit/page.tsx"));
  assert.ok(exists("../components/problems/ProblemForm.tsx"));
  assert.ok(exists("../lib/problems/analyzeMistakePatterns.ts"));

  const constants = read("../lib/constants/daily.ts");
  const problems = read("../components/problems/ProblemsClient.tsx");
  const detail = read("../components/problems/ProblemDetailClient.tsx");
  const mistakes = read("../components/mistakes/MistakesClient.tsx");

  assert.match(constants, /PROBLEM_MISTAKE_CATEGORIES/);
  assert.match(problems, /mistake_category/);
  assert.match(problems, /topic/);
  assert.match(detail, /Analyze Mistake/);
  assert.match(detail, /Mark as Review Later/);
  assert.match(detail, /Mark as Mastered/);
  assert.match(mistakes, /Mistake Pattern Detector/);
});

test("notebook supports whitelist and blacklist modes plus Part 3 notebook sections", () => {
  const types = read("../lib/notebook/types.ts");
  const defaults = read("../lib/notebook/defaultNotebookConfig.ts");
  const controls = read("../components/notebook/NotebookControls.tsx");
  const builder = read("../lib/notebook/buildNotebookItems.ts");
  const renderer = read("../lib/notebook/renderNotebookMarkdown.ts");

  assert.match(types, /selectionMode/);
  assert.match(types, /sectionSelectionMode/);
  assert.match(types, /excludeTopics/);
  assert.match(types, /noteIds/);
  assert.match(types, /showWhenToUse/);
  assert.match(types, /showHowToRecognize/);
  assert.match(types, /showIntuition/);
  assert.match(types, /showConditions/);
  assert.match(types, /showDiagramTraps/);
  assert.match(types, /showProblemApplications/);
  assert.match(types, /showRecognitionTriggers/);
  assert.match(types, /showFalseUses/);
  assert.match(defaults, /notebookSectionEnabled/);
  assert.match(defaults, /All Except Mastered/);
  assert.match(defaults, /False Uses Sheet/);
  assert.match(defaults, /Recognition Trigger Sheet/);
  assert.match(controls, /Include only/);
  assert.match(controls, /Include everything except/);
  assert.match(controls, /Show selected/);
  assert.match(controls, /Hide selected/);
  assert.match(controls, /<details/);
  assert.match(controls, /sectionQuery/);
  assert.match(controls, /Search sections/);
  assert.match(controls, /visibleSectionToggles/);
  assert.match(builder, /matchesBlacklist/);
  assert.match(renderer, /notebookSectionEnabled/);
  assert.match(renderer, /Recognition Triggers/);
  assert.match(renderer, /Common False Uses/);
});

test("revision pack and mastery features are implemented and dashboard/search can reach them", () => {
  assert.ok(exists("../app/app/revision-pack/page.tsx"));
  assert.ok(exists("../app/app/mastery/page.tsx"));
  assert.ok(exists("../components/revision/RevisionPackClient.tsx"));
  assert.ok(exists("../components/mastery/MasteryClient.tsx"));
  assert.ok(exists("../lib/revision/buildRevisionPack.ts"));
  assert.ok(exists("../lib/mastery/calculateMastery.ts"));

  const dashboard = read("../components/notes/DashboardClient.tsx");
  const commandPalette = read("../components/command/CommandPalette.tsx");
  const revision = read("../lib/revision/buildRevisionPack.ts");
  const mastery = read("../lib/mastery/calculateMastery.ts");

  assert.match(dashboard, /Generate Contest Revision Pack/);
  assert.match(dashboard, /Mastery Heatmap/);
  assert.match(dashboard, /Mistake Pattern/);
  assert.match(commandPalette, /revision-pack/);
  assert.match(commandPalette, /mastery/);
  assert.match(revision, /needs_practice/);
  assert.match(revision, /linked to failed problem/);
  assert.match(mastery, /Weak/);
  assert.match(mastery, /Developing/);
  assert.match(mastery, /Strong/);
});
