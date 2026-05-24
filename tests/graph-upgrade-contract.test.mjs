import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("graph page scopes data and opens local graph from note query", () => {
  const page = read("../app/app/graph/page.tsx");
  const actions = read("../components/notes/NoteViewActions.tsx");

  assert.match(page, /requireOwner/);
  assert.match(page, /eq\("user_id", user\.id\)/);
  assert.match(page, /initialNoteId=\{params\.note \?\? null\}/);
  assert.doesNotMatch(page, /body_markdown/);
  assert.match(page, /recognition_triggers,false_uses/);
  assert.doesNotMatch(page, /select\("\*"\)\.eq\("user_id", user\.id\)\.eq\("is_archived"/);
  assert.match(actions, /\/app\/graph\?note=\$\{note\.id\}/);
});

test("interactive graph implements global local modes, layouts, and relation-aware edges", () => {
  const graph = read("../components/graph/NoteGraphClient.tsx");

  assert.match(graph, /type GraphMode = "global" \| "local"/);
  assert.match(graph, /type LayoutMode = "force" \| "topic" \| "hierarchy" \| "radial" \| "grid"/);
  assert.match(graph, /getNeighborhood/);
  assert.match(graph, /shortestPath/);
  assert.match(graph, /connectedComponents/);
  assert.match(graph, /relationMeaning/);
  assert.match(graph, /markerEnd=\{showArrows && style\.directional/);
  assert.match(graph, /commonly confused[\s\S]*dash/);
  assert.match(graph, /Edge Legend/);
});

test("graph supports search, filters, path finder, health, clusters, and exports", () => {
  const graph = read("../components/graph/NoteGraphClient.tsx");

  assert.match(graph, /Search titles, tags, triggers/);
  assert.match(graph, /Has recognition triggers/);
  assert.match(graph, /Has common false uses/);
  assert.match(graph, /Orphan notes only/);
  assert.match(graph, /Path Finder/);
  assert.match(graph, /No path found/);
  assert.match(graph, /Graph Health/);
  assert.match(graph, /Possible duplicates/);
  assert.match(graph, /Clusters/);
  assert.match(graph, /Collapse/);
  assert.match(graph, /exportSvg/);
  assert.match(graph, /exportPng/);
  assert.match(graph, /exportJson/);
  assert.match(graph, /Save snapshot/);
});

test("graph link mode stores one directional edge and AI returns structured suggestions only", () => {
  const graph = read("../components/graph/NoteGraphClient.tsx");

  assert.match(graph, /Link Mode/);
  assert.match(graph, /source_note_id: sourceId/);
  assert.match(graph, /target_note_id: targetId/);
  assert.match(graph, /Area of Triangle|is a prerequisite of/);
  assert.match(graph, /existingPair/);
  assert.match(graph, /mode: "suggest_related_notes"/);
  assert.match(graph, /Graph assistant: return structured link suggestions only/);
  assert.match(graph, /sourceNoteId/);
  assert.match(graph, /targetNoteId/);
  assert.match(graph, /Possible new note/);
});
