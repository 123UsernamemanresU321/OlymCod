import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("AI route is owner protected and keeps DeepSeek key server-side", () => {
  const route = read("../app/api/ai/note-assist/route.ts");

  assert.match(route, /requireOwner/);
  assert.match(route, /DEEPSEEK_API_KEY/);
  assert.match(route, /https:\/\/api\.deepseek\.com/);
  assert.match(route, /chat\/completions/);
});

test("note editor exposes AI assistant with manual apply actions", () => {
  const noteForm = read("../components/notes/NoteForm.tsx");
  const panel = read("../components/notes/AIWritingAssistant.tsx");

  assert.match(noteForm, /AIWritingAssistant/);
  for (const label of [
    "Starter draft",
    "Fill missing sections",
    "Improve current section",
    "Analyze mistake",
    "Past problem scaffold",
    "Suggest description/tags"
  ]) {
    assert.match(panel, new RegExp(label));
  }
  for (const action of ["Insert at cursor", "Append", "Replace body", "Apply metadata"]) {
    assert.match(panel, new RegExp(action));
  }
});

test("DeepSeek configuration is documented without a public client key", () => {
  const envExample = read("../.env.example");
  const readme = read("../README.md");

  assert.match(envExample, /DEEPSEEK_API_KEY=/);
  assert.match(envExample, /DEEPSEEK_MODEL=deepseek-v4-pro/);
  assert.match(envExample, /DEEPSEEK_BASE_URL=https:\/\/api\.deepseek\.com/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_DEEPSEEK/);
  assert.match(readme, /DeepSeek AI Writing Assistant/);
  assert.match(readme, /npx vercel env add DEEPSEEK_API_KEY production/);
});
