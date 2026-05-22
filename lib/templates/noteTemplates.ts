import { buildNoteTemplate } from "@/lib/constants/note-formats";
import type { NoteTemplate } from "@/lib/types";

type BuiltInTemplate = NoteTemplate & { id: `built-in-${string}` };

function builtIn(
  id: string,
  name: string,
  description: string,
  noteType: string,
  topic: string,
  title: string,
  tags: string[] = [],
  recognitionTriggers: string[] = [],
  falseUses: string[] = []
): BuiltInTemplate {
  return {
    id: `built-in-${id}`,
    user_id: null,
    name,
    description,
    note_type: noteType,
    topic,
    template_markdown: buildNoteTemplate(noteType, title),
    default_recognition_triggers: recognitionTriggers,
    default_false_uses: falseUses,
    default_tags: tags,
    created_at: null,
    updated_at: null
  };
}

export const BUILT_IN_NOTE_TEMPLATES: BuiltInTemplate[] = [
  builtIn("theorem", "Theorem Template", "Statement, conditions, proof sketch, examples, traps, and related techniques.", "Theorem", "Number Theory", "[Title]", [], ["condition appears in a problem", "known result may unlock a transformation"], ["do not ignore hypotheses"]),
  builtIn("lemma", "Lemma Template", "A compact reusable support result with setup, proof, and example use.", "Lemma", "Geometry", "[Title]"),
  builtIn("technique", "Technique Template", "Core method, recognition signs, application steps, examples, and failure modes.", "Technique", "Combinatorics", "[Title]", ["technique"], ["problem has a repeated structure", "direct computation is awkward"]),
  builtIn("formula", "Formula Template", "Formula, variables, conditions, use case, and quick check.", "Formula", "Formula Bank", "[Title]", ["formula"]),
  builtIn("geometry-theorem", "Geometry Theorem Template", "Configuration, diagram prompt, key relation, recognition, proof, and diagram traps.", "Theorem", "Geometry", "[Title]", ["geometry"], ["triangle configuration", "circle or ratio relation appears"], ["do not ignore directed lengths"]),
  builtIn("definition", "Definition Template", "Precise definition, notation, examples, non-examples, and related concepts.", "Definition", "Algebra", "[Title]"),
  builtIn("problem-pattern", "Problem Pattern Template", "Recurring problem structure, trigger phrases, setup, key move, and traps.", "Problem Pattern", "Problem Patterns", "[Title]", ["pattern"]),
  builtIn("common-mistake", "Common Mistake Template", "Mistake, why it happens, correct principle, example, and prevention.", "Common Mistake", "Inbox", "[Title]", ["mistake"]),
  builtIn("example", "Example/Solved Problem Template", "Problem statement, first observations, solution outline, key move, and takeaway.", "Example", "Problem Patterns", "[Title]"),
  builtIn("rough-note", "Quick Rough Note Template", "A lightweight capture format that can be polished later.", "Inbox", "Inbox", "[Title]")
];

export function allTemplates(customTemplates: NoteTemplate[]) {
  return [...BUILT_IN_NOTE_TEMPLATES, ...customTemplates];
}

export function isBuiltInTemplate(template: Pick<NoteTemplate, "id">) {
  return template.id.startsWith("built-in-");
}
