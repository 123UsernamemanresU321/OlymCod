import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const formats = readFileSync(new URL("../lib/constants/note-formats.ts", import.meta.url), "utf8");
const noteForm = readFileSync(new URL("../components/notes/NoteForm.tsx", import.meta.url), "utf8");
const types = readFileSync(new URL("../lib/types.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

test("note formats include past problems and formula logs", () => {
  for (const noteType of ["Past Problem", "Formula Log"]) {
    assert.match(types, new RegExp(`"${noteType}"`));
    assert.match(formats, new RegExp(`"${noteType}"`));
    assert.match(schema, new RegExp(noteType));
  }
});

test("formula formats hide difficulty while past problems keep it", () => {
  assert.match(formats, /"Formula Log"[\s\S]*?usesDifficulty:\s*false/);
  assert.match(formats, /"Formula"[\s\S]*?usesDifficulty:\s*false/);
  assert.match(formats, /"Past Problem"[\s\S]*?usesDifficulty:\s*true/);
});

test("editor can apply templates and hide irrelevant fields", () => {
  assert.match(noteForm, /handleNoteTypeChange/);
  assert.match(noteForm, /Apply .* template/);
  assert.match(noteForm, /format\.usesDifficulty/);
});
